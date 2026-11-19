const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('module');
const path = require('node:path');
const vm = require('node:vm');
function compile(file) { return ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText; }
const catalog = { exports: {} };
vm.runInNewContext(compile('src/lib/plugins.ts'), { exports: catalog.exports });
const search = { exports: {} };
vm.runInNewContext(compile('src/lib/plugin-search.ts'), { exports: search.exports, require: (name) => { assert.equal(name, './plugins'); return catalog.exports; }, URL, URLSearchParams, AbortSignal, TextDecoder, fetch });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('GitHub search uses only the fixed public endpoint and returns repository data', async () => {
  let called = '';
  const results = await search.exports.searchPlugin('github', 'owner/project', async (url) => { called = url; return json({ items: [{ full_name: 'owner/project', description: 'Example', html_url: 'https://github.com/owner/project' }] }); });
  assert.equal(new URL(called).hostname, 'api.github.com'); assert.equal(new URL(called).searchParams.get('q'), 'owner/project');
  assert.equal(results[0].url, 'https://github.com/owner/project');
});
test('Wikipedia, Crossref and Open Library results contain source links', async () => {
  const wiki = await search.exports.searchPlugin('wikipedia', 'свет', async () => json({ query: { search: [{ title: 'Свет', snippet: '<b>текст</b>' }] } }));
  assert.equal(wiki[0].text, 'текст'); assert.match(wiki[0].url, /^https:\/\/ru\.wikipedia\.org\//);
  const crossref = await search.exports.searchPlugin('crossref', 'light', async () => json({ message: { items: [{ title: ['Article'], DOI: '10.1000/example', author: [{ family: 'Smith' }] }] } }));
  assert.match(crossref[0].url, /^https:\/\/doi\.org\//);
  const books = await search.exports.searchPlugin('openlibrary', 'book', async () => json({ docs: [{ title: 'Book', key: '/works/OL123W', author_name: ['Author'] }] }));
  assert.equal(books[0].url, 'https://openlibrary.org/works/OL123W');
});
test('Hugging Face uses the public model catalog and returns model links', async () => {
  let called = '';
  const results = await search.exports.searchPlugin('huggingface', 'bert', async (url) => { called = url; return json([{ id: 'google/bert', pipeline_tag: 'fill-mask', downloads: 10 }]); });
  assert.equal(new URL(called).hostname, 'huggingface.co');
  assert.equal(new URL(called).searchParams.get('search'), 'bert');
  assert.equal(results[0].url, 'https://huggingface.co/google/bert');
});
test('Context7 returns ranked snippets and only https source links', async () => {
  let called = '';
  const data = { codeSnippets: [{ codeTitle: 'useEffect', codeDescription: 'React effect', codeId: 'https://react.dev/reference/react/useEffect', codeList: [{ code: 'useEffect(fn)' }], rank: 2 }], infoSnippets: [{ breadcrumb: 'React', content: 'Hooks', pageId: 'javascript:alert(1)', rank: 1 }] };
  const results = await search.exports.searchPlugin('context7', 'react hooks', async (url) => { called = url; return json(data); });
  assert.equal(new URL(called).hostname, 'context7.com');
  assert.equal(results[0].url, '');
  assert.match(results[1].url, /^https:\/\/react\.dev\//);
});
test('Blockscout searches Ethereum and links only valid addresses', async () => {
  let called = '';
  const address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const results = await search.exports.searchPlugin('blockscout', 'USDC', async (url) => { called = url; return json({ items: [{ name: 'USDC', type: 'token', address_hash: address }, { name: 'bad', address_hash: 'javascript:x' }] }); });
  assert.equal(new URL(called).hostname, 'eth.blockscout.com');
  assert.equal(results[0].url, `https://eth.blockscout.com/address/${address}`);
  assert.equal(results[1].url, '');
});
test('failed or oversized provider responses fail cleanly', async () => {
  await assert.rejects(search.exports.searchPlugin('github', 'test', async () => json({}, 429)));
  await assert.rejects(search.exports.searchPlugin('github', 'test', async () => new Response('x'.repeat(1_000_001))));
});
function api(session = { user: { id: 'u1' } }) {
  const calls = []; const mockDb = { userPlugin: { findMany: async (args) => { calls.push(args); return [{ pluginId: 'github' }]; }, upsert: async (args) => calls.push(args), deleteMany: async (args) => calls.push(args) } };
  const mocks = { 'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } }, 'next-auth': { getServerSession: async () => session }, '@/lib/auth': { authOptions: {} }, '@/lib/prisma': { prisma: mockDb }, '@/lib/plugins': catalog.exports };
  const exports = {}; vm.runInNewContext(compile('src/app/api/plugins/route.ts'), { exports, require: (name) => mocks[name], Request, Response });
  return { route: exports, calls };
}
const put = (body) => new Request('https://example.test/api/plugins', { method: 'PUT', body: JSON.stringify(body) });
test('plugin settings require authentication and reject unknown plugin identifiers', async () => {
  const noSession = api(null); assert.equal((await noSession.route.GET()).status, 401); assert.equal((await noSession.route.PUT(put({ id: 'github', enabled: true }))).status, 401);
  const h = api(); assert.equal((await h.route.PUT(put({ id: 'unknown', enabled: true }))).status, 400); assert.equal(h.calls.length, 0);
});
test('plugin settings are scoped to the authenticated user', async () => {
  const h = api(); assert.deepEqual((await (await h.route.GET()).json()).enabled, ['github']);
  assert.equal((await h.route.PUT(put({ id: 'github', enabled: true }))).status, 200); assert.equal(h.calls[1].create.userId, 'u1');
  assert.equal((await h.route.PUT(put({ id: 'github', enabled: false }))).status, 200); assert.equal(h.calls[2].where.userId, 'u1');
});

test('chat sends only the current message to the user’s enabled plugins', async () => {
  let searched; let sent;
  const db = {
    chatSession: { findUnique: async () => ({ id: 'c1', userId: 'u1' }), update: async () => ({}) },
    dailyUsage: { findUnique: async () => ({ count: 0 }), upsert: async () => ({ count: 1 }) },
    message: { findMany: async () => [{ role: 'user', content: 'private history' }], create: async () => ({}) },
    userPlugin: { findMany: async ({ where }) => { assert.equal(where.userId, 'u1'); return [{ pluginId: 'github' }]; } },
    $transaction: async (fn) => fn(db),
  };
  const mocks = {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    'next-auth': { getServerSession: async () => ({ user: { id: 'u1' } }) }, '@/lib/auth': { authOptions: {} }, '@/lib/prisma': { prisma: db },
    '@/lib/plans': { getAvailableModels: () => ['free-model'], getDailyLimit: () => 20 }, '@/lib/subscription': { checkAndResetExpiredSubscription: async () => 'free' },
    '@/lib/system-prompt': { getSystemPrompt: () => 'system' }, '@/lib/generated-images': { parseGeneratedImage: () => null },
    '@/lib/chat-provider': { ChatProviderError: class extends Error {}, streamChatCompletion: async (args) => { sent = args; return 'answer'; } },
    '@/lib/plugin-search': { gatherPluginContext: async (ids, query) => { searched = { ids, query }; return 'github: source'; } },
  };
  const exports = {}; vm.runInNewContext(compile('src/app/api/chat/route.ts'), { exports, require: (name) => mocks[name], process: { env: { MY_CUSTOM_API_KEY: 'test' } }, Request, Response, ReadableStream, TextEncoder, AbortController, Date, setTimeout, clearTimeout, console });
  const response = await exports.POST(new Request('https://example.test/api/chat', { method: 'POST', body: JSON.stringify({ message: 'current question', sessionId: 'c1', model: 'free-model' }) }));
  await response.text();
  assert.equal(searched.ids[0], 'github'); assert.equal(searched.query, 'current question');
  assert.ok(sent.messages.some((m) => m.content.includes('github: source')));
  assert.equal(sent.model, 'gpt-6-luna');
});
