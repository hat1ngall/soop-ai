const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const vm = require('node:vm');
const ts = require('typescript');

// Test the actual route with the actual provider helper. Auth, database and the
// remote transport are synthetic: importing this file cannot contact a service.
function compile(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  });
  return { filename, code: compiled.outputText };
}
const helperSource = compile('src/lib/chat-provider.ts');
const helperModule = new Module(helperSource.filename, module);
helperModule.filename = helperSource.filename;
helperModule.paths = Module._nodeModulePaths(path.dirname(helperSource.filename));
helperModule._compile(helperSource.code, helperSource.filename);
const helper = helperModule.exports;
const routeSource = compile('src/app/api/chat/route.ts');
const KEY = 'synthetic-route-test-key';
const ROUTING = '智能路由候选均请求失败。原因：个人池候选均已尝试，没有成功。request_id: synthetic-route-42';
const encoder = new TextEncoder();
const event = (value) => `data: ${typeof value === 'string' ? value : JSON.stringify(value)}\n\n`;
const delta = (content) => event({ choices: [{ delta: { content }, finish_reason: null }] });
const stop = () => event({ choices: [{ delta: {}, finish_reason: 'stop' }] });
const success = (content = 'Успешный ответ') => new Response(delta(content) + stop() + event('[DONE]'), {
  headers: { 'content-type': 'text/event-stream' },
});
const failure = (status = 503) => new Response(JSON.stringify({ error: { message: ROUTING } }), {
  status, headers: { 'content-type': 'application/json' },
});

function harness(sequence, options = {}) {
  const state = { messages: [], count: options.initialCount || 0, title: null };
  const calls = { provider: [], transactions: 0, quotaWrites: 0, titleWrites: 0, sleeps: [], logs: [] };
  const history = options.history || [];
  const db = {
    chatSession: {
      findUnique: async () => options.missingChat ? null : { id: 'chat-1', userId: options.foreignChat ? 'other' : 'user-1' },
    },
    message: {
      findMany: async () => history,
      create: async ({ data }) => {
        if (options.failUserSave) throw new Error('Synthetic database failure');
        state.messages.push({ ...data });
        return { id: `message-${state.messages.length}`, ...data };
      },
    },
    dailyUsage: { findUnique: async () => ({ count: state.count }) },
    $transaction: async (work) => {
      calls.transactions++;
      const pending = { messages: [...state.messages], count: state.count, title: state.title };
      const tx = {
        message: { create: async ({ data }) => {
          if (options.failAssistantSave) throw new Error('Synthetic assistant database failure');
          pending.messages.push({ ...data });
          return data;
        } },
        dailyUsage: { upsert: async () => {
          calls.quotaWrites++;
          pending.count++;
          if (options.failQuotaSave) throw new Error('Synthetic quota database failure');
          return { count: pending.count };
        } },
        chatSession: { update: async ({ data }) => {
          calls.titleWrites++;
          if (options.failTitleSave) throw new Error('Synthetic title database failure');
          pending.title = data;
          return data;
        } },
      };
      const result = await work(tx);
      Object.assign(state, pending);
      return result;
    },
  };
  const fetcher = async (url, init) => {
    calls.provider.push({ url, init });
    const next = sequence[calls.provider.length - 1];
    assert.ok(next, `Unexpected upstream call ${calls.provider.length}`);
    if (next instanceof Error) throw next;
    return typeof next === 'function' ? next(url, init) : next;
  };
  const fakeProcess = { env: {
    MY_CUSTOM_API_KEY: options.noKey ? '' : KEY,
    MY_CUSTOM_API_URL: 'https://provider.invalid/v1',
  } };
  const mocks = {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    'next-auth': { getServerSession: async () => options.noSession ? null : { user: { id: 'user-1' } } },
    '@/lib/auth': { authOptions: {} },
    '@/lib/prisma': { prisma: db },
    '@/lib/plans': {
      getAvailableModels: () => ['gpt-6-luna'],
      getDailyLimit: () => options.limit ?? 20,
    },
    '@/lib/subscription': { checkAndResetExpiredSubscription: async () => 'free' },
    '@/lib/system-prompt': { getSystemPrompt: () => 'Synthetic system prompt' },
    '@/lib/generated-images': { parseGeneratedImage: () => null },
    '@/lib/chat-provider': {
      ChatProviderError: helper.ChatProviderError,
      streamChatCompletion: (args) => helper.streamChatCompletion({
        ...args, fetcher,
        sleep: async (ms, signal) => {
          calls.sleeps.push(ms);
          assert.equal(signal.aborted, false);
        },
      }),
    },
  };
  const exports = {};
  vm.runInNewContext(routeSource.code, {
    exports, module: { exports },
    require: (id) => {
      assert.ok(Object.hasOwn(mocks, id), `Unexpected dependency: ${id}`);
      return mocks[id];
    },
    process: fakeProcess, Response, Request, Headers, ReadableStream,
    TextEncoder, TextDecoder, AbortController, setTimeout, clearTimeout,
    console: {
      warn: (...args) => calls.logs.push(args),
      error: (...args) => calls.logs.push(args),
    },
  }, { filename: routeSource.filename });
  const request = (signal) => new Request('https://soop.test/api/chat', {
    method: 'POST', signal,
    body: JSON.stringify({ message: 'Проверочный запрос', model: 'claude-opus-5.5', sessionId: 'chat-1', attachments: [] }),
  });
  return { state, calls, post: (signal) => exports.POST(request(signal)) };
}

async function collect(response) {
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const text = await response.text();
  const events = text.split('\n').filter((line) => line.startsWith('data: ')).map((line) => JSON.parse(line.slice(6)));
  return { text, events };
}

function assertNoCharge(h) {
  assert.equal(h.state.messages.filter((m) => m.role === 'assistant').length, 0);
  assert.equal(h.state.count, 0);
}

test('route: retries a failed route and persists one user, answer and quota increment', async () => {
  const h = harness([failure(), success()]);
  const { text, events } = await collect(await h.post());
  assert.equal(h.calls.provider.length, 2);
  assert.equal(h.calls.sleeps.length, 1);
  for (const { url, init } of h.calls.provider) {
    assert.equal(url, 'https://provider.invalid/v1/chat/completions');
    assert.equal(JSON.parse(init.body).model, 'gpt-6-luna');
    assert.equal(JSON.parse(init.body).messages.filter((m) => m.role === 'user').length, 1);
    assert.equal(init.headers.Authorization, `Bearer ${KEY}`);
  }
  assert.deepEqual(h.state.messages.map((m) => m.role), ['user', 'assistant']);
  assert.equal(h.state.messages[1].content, 'Успешный ответ');
  assert.equal(h.state.count, 1);
  assert.equal(h.calls.transactions, 1);
  assert.equal(h.calls.quotaWrites, 1);
  assert.equal(h.calls.titleWrites, 1);
  assert.deepEqual(events.at(-1), { done: true, usage: { used: 1, limit: 20 } });
  assert.doesNotMatch(text, /智能|个人池|synthetic-route-test-key|synthetic-route-42/);
  assert.ok(!events.some((value) => value.error));
});

test('route: exhausted upstream attempts keep only user message and spend no quota', async () => {
  const h = harness([failure(), failure(), failure()]);
  const { text, events } = await collect(await h.post());
  assert.equal(h.calls.provider.length, 3);
  assert.equal(h.state.messages.length, 1);
  assert.equal(h.state.messages[0].role, 'user');
  assertNoCharge(h);
  assert.equal(h.calls.transactions, 0);
  assert.equal(h.calls.quotaWrites, 0);
  assert.match(events.find((value) => value.error).error, /Сервис ответов временно недоступен/);
  assert.doesNotMatch(text, /智能|个人池|request_id|synthetic-route/);
  assert.deepEqual(events.at(-1), { done: true });
});

test('route: provider authentication failure is sanitized and never retried or charged', async () => {
  const h = harness([new Response(JSON.stringify({ error: { message: `invalid_api_key ${KEY}` } }), { status: 401 })]);
  const { text, events } = await collect(await h.post());
  assert.equal(h.calls.provider.length, 1);
  assertNoCharge(h);
  assert.ok(events.some((value) => value.error));
  assert.ok(!text.includes(KEY));
  assert.ok(!JSON.stringify(h.calls.logs).includes(KEY));
});

test('route: SSE error in unterminated final event can recover without duplicate persistence', async () => {
  const upstream = new Response(`data: ${JSON.stringify({ error: { message: ROUTING } })}`, {
    headers: { 'content-type': 'text/event-stream' },
  });
  const h = harness([upstream, success('Повтор помог')]);
  const { events } = await collect(await h.post());
  assert.equal(h.calls.provider.length, 2);
  assert.deepEqual(h.state.messages.map((m) => m.role), ['user', 'assistant']);
  assert.equal(h.state.messages[1].content, 'Повтор помог');
  assert.equal(h.state.count, 1);
  assert.ok(!events.some((value) => value.error));
});

test('route: partial answer followed by upstream error is not retried, saved or charged', async () => {
  const h = harness([new Response(delta('Полученный фрагмент') + event({ error: { message: ROUTING } }), {
    headers: { 'content-type': 'text/event-stream' },
  })]);
  const { events } = await collect(await h.post());
  assert.equal(h.calls.provider.length, 1);
  assert.equal(events.filter((value) => value.chunk).map((value) => value.chunk).join(''), 'Полученный фрагмент');
  assert.ok(events.some((value) => value.error));
  assertNoCharge(h);
});

test('route: truncated SSE answer is marked failed and does not spend quota', async () => {
  const h = harness([new Response(delta('Незаконченный текст'), { headers: { 'content-type': 'text/event-stream' } })]);
  const { events } = await collect(await h.post());
  assert.equal(h.calls.provider.length, 1);
  assert.match(events.find((value) => value.error).error, /Ответ прервался/);
  assertNoCharge(h);
});

test('route: canceling response aborts upstream and leaves no assistant or quota write', { timeout: 2000 }, async () => {
  let upstreamCancelled = false;
  const h = harness([() => new Response(new ReadableStream({
    start(controller) { controller.enqueue(encoder.encode(delta('Фрагмент до отмены'))); },
    cancel() { upstreamCancelled = true; },
  }), { headers: { 'content-type': 'text/event-stream' } })]);
  const response = await h.post();
  const reader = response.body.getReader();
  let text = '';
  while (!text.includes('Фрагмент до отмены')) {
    const next = await reader.read();
    assert.equal(next.done, false);
    text += new TextDecoder().decode(next.value);
  }
  await reader.cancel();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(upstreamCancelled, true);
  assert.equal(h.calls.provider[0].init.signal.aborted, true);
  assert.equal(h.calls.provider.length, 1);
  assertNoCharge(h);
});

test('route: request signal abort closes a pending response read and cancels provider', { timeout: 2000 }, async () => {
  let upstreamCancelled = false;
  const requestController = new AbortController();
  const h = harness([() => new Response(new ReadableStream({
    start(controller) { controller.enqueue(encoder.encode(delta('Начало до обрыва'))); },
    cancel() { upstreamCancelled = true; },
  }), { headers: { 'content-type': 'text/event-stream' } })]);
  const response = await h.post(requestController.signal);
  const reader = response.body.getReader();
  let text = '';
  while (!text.includes('Начало до обрыва')) {
    const next = await reader.read();
    assert.equal(next.done, false);
    text += new TextDecoder().decode(next.value);
  }
  const pending = reader.read();
  requestController.abort();
  assert.deepEqual(await pending, { value: undefined, done: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(upstreamCancelled, true);
  assert.equal(h.calls.provider[0].init.signal.aborted, true);
  assert.equal(h.calls.provider.length, 1);
  assertNoCharge(h);
});

test('route: persistence failure rolls back answer and quota after provider success', async () => {
  const h = harness([success()], { failTitleSave: true });
  const { text, events } = await collect(await h.post());
  assert.equal(h.calls.transactions, 1);
  assert.equal(h.state.messages.length, 1);
  assertNoCharge(h);
  assert.ok(events.some((value) => value.error));
  assert.doesNotMatch(text, /Synthetic title database failure/);
});

test('route: provider unavailable due to configuration cannot persist a request or contact provider', async () => {
  const h = harness([], { noKey: true });
  const response = await h.post();
  assert.equal(response.status, 503);
  assert.deepEqual(h.state.messages, []);
  assert.equal(h.calls.provider.length, 0);
  assertNoCharge(h);
});

test('route: user message save failure cannot launch provider generation', async () => {
  const h = harness([], { failUserSave: true });
  const response = await h.post();
  assert.equal(response.status, 500);
  assert.equal(h.calls.provider.length, 0);
  assert.deepEqual(h.state.messages, []);
  assertNoCharge(h);
});

test('route: authentication and daily quota guards perform no upstream work', async () => {
  const unauthenticated = harness([], { noSession: true });
  assert.equal((await unauthenticated.post()).status, 401);
  assert.equal(unauthenticated.calls.provider.length, 0);
  assert.deepEqual(unauthenticated.state.messages, []);
  const limited = harness([], { initialCount: 20, limit: 20 });
  assert.equal((await limited.post()).status, 429);
  assert.equal(limited.calls.provider.length, 0);
  assert.deepEqual(limited.state.messages, []);
});

test('route: successful existing chat increments quota once and does not overwrite title', async () => {
  const h = harness([success()], { history: [{ role: 'user', content: 'Предыдущий вопрос' }], initialCount: 4 });
  const { events } = await collect(await h.post());
  assert.equal(h.state.count, 5);
  assert.equal(h.calls.titleWrites, 0);
  assert.deepEqual(events.at(-1), { done: true, usage: { used: 5, limit: 20 } });
  const body = JSON.parse(h.calls.provider[0].init.body);
  assert.equal(body.messages.filter((m) => m.role === 'user').length, 2);
});
