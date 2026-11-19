const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, options = {}) {
  const state = { count: options.count || 0, saved: [], provider: [] };
  const prisma = {
    dailyUsage: {
      upsert: async () => ({}),
      updateMany: async ({ where, data }) => {
        if (data.count.increment) { if (where.count && state.count >= where.count.lt) return { count: 0 }; state.count++; }
        if (data.count.decrement) state.count--;
        return { count: 1 };
      },
    },
    reminder: {
      create: async ({ data }) => { state.saved.push(data); return { id: 'reminder-1', ...data, deliveredAt: null }; },
      findMany: async () => options.reminders || [],
      updateMany: async ({ where }) => ({ count: where.userId === 'user-1' && !options.alreadyClaimed ? 1 : 0 }),
      deleteMany: async ({ where }) => ({ count: where.userId === 'user-1' && where.id === 'owned' ? 1 : 0 }),
    },
  };
  const mocks = {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    'next-auth': { getServerSession: async () => options.unauthorized ? null : { user: { id: 'user-1' } } },
    '@/lib/auth': { authOptions: {} }, '@/lib/prisma': { prisma },
    '@/lib/subscription': { checkAndResetExpiredSubscription: async () => 'free' },
    '@/lib/plans': { getDailyLimit: () => 20 },
    '@/lib/chat-provider': { streamChatCompletion: async (args) => { state.provider.push(args); if (options.failure) throw new Error('provider failed'); return 'Напоминаю о встрече'; } },
  };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: (name) => { if (!mocks[name]) throw Error(name); return mocks[name]; }, process: { env: { MY_CUSTOM_API_KEY: 'test', DEFAULT_AI_MODEL: 'gpt-6-luna' } }, Date, Response, Request, AbortController, setTimeout, clearTimeout });
  return { route: exports, state };
}
const post = (subject, remindAt) => new Request('https://example.test/api/reminders', { method: 'POST', body: JSON.stringify({ subject, remindAt }) });

test('creating a reminder uses the primary model and hides generated text before due', async () => {
  const { route, state } = load('src/app/api/reminders/route.ts');
  const response = await route.POST(post('Встреча', new Date(Date.now() + 60000).toISOString()));
  assert.equal(response.status, 201); const result = await response.json();
  assert.equal(result.subject, 'Встреча'); assert.equal(state.saved[0].message, 'Напоминаю о встрече');
  assert.equal(state.provider[0].model, 'gpt-6-luna'); assert.equal(state.provider[0].maxTokens, 100); assert.equal(state.count, 1);
});
test('past reminders and exhausted free quota do not call the model', async () => {
  const a = load('src/app/api/reminders/route.ts');
  assert.equal((await a.route.POST(post('Встреча', new Date(Date.now() - 1000).toISOString()))).status, 400); assert.equal(a.state.provider.length, 0);
  const b = load('src/app/api/reminders/route.ts', { count: 20 });
  assert.equal((await b.route.POST(post('Встреча', new Date(Date.now() + 60000).toISOString()))).status, 429); assert.equal(b.state.provider.length, 0);
});
test('provider failure restores quota and saves no reminder', async () => {
  const { route, state } = load('src/app/api/reminders/route.ts', { failure: true });
  assert.equal((await route.POST(post('Встреча', new Date(Date.now() + 60000).toISOString()))).status, 502);
  assert.equal(state.count, 0); assert.equal(state.saved.length, 0);
});
test('list keeps generated text hidden until delivery', async () => {
  const { route } = load('src/app/api/reminders/route.ts', { reminders: [{ id: 'x', subject: 'Тема', remindAt: new Date(), deliveredAt: null, message: 'Секрет' }] });
  const result = await (await route.GET()).json(); assert.equal(result[0].message, null);
});
test('due reminders are claimed once and delete is scoped to the user', async () => {
  const item = { id: 'r', message: 'Напоминание', remindAt: new Date() };
  const due = load('src/app/api/reminders/due/route.ts', { reminders: [item] });
  assert.equal((await (await due.route.POST()).json()).length, 1);
  const claimed = load('src/app/api/reminders/due/route.ts', { reminders: [item], alreadyClaimed: true });
  assert.equal((await (await claimed.route.POST()).json()).length, 0);
  const deletion = load('src/app/api/reminders/[id]/route.ts');
  assert.equal((await deletion.route.DELETE(null, { params: { id: 'foreign' } })).status, 404);
  assert.equal((await deletion.route.DELETE(null, { params: { id: 'owned' } })).status, 200);
});
