const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Compile the actual TypeScript module in memory: no network, app build or secrets.
const sourcePath = path.resolve(__dirname, '../src/lib/chat-provider.ts');
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  fileName: sourcePath,
});
const loaded = new Module(sourcePath, module);
loaded.filename = sourcePath;
loaded.paths = Module._nodeModulePaths(path.dirname(sourcePath));
loaded._compile(compiled.outputText, sourcePath);
const { ChatProviderError, providerError, streamChatCompletion } = loaded.exports;

const KEY = 'synthetic-test-key';
const ROUTING = '智能路由候选均请求失败。原因：个人池候选均已尝试，没有成功。解决方案：请稍后重试、切换商家或开启平台兜底。request_id: test-routing-123';
const messages = [{ role: 'user', content: 'Тестовый запрос' }];
const encoder = new TextEncoder();
const data = (value) => `data: ${typeof value === 'string' ? value : JSON.stringify(value)}\n\n`;
const delta = (text) => data({ choices: [{ delta: { content: text }, finish_reason: null }] });
const finish = () => data({ choices: [{ delta: {}, finish_reason: 'stop' }] });
const done = () => data('[DONE]');
const errorEvent = (message, type = 'server_error') => data({ error: { message, type } });

function response(text, status = 200, contentType = 'text/event-stream') {
  return new Response(text, { status, headers: { 'content-type': contentType } });
}

function success(text = 'Готово') {
  return response(delta(text) + finish() + done());
}

function harness(sequence, extras = {}) {
  const calls = [];
  const chunks = [];
  const waits = [];
  const retries = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    const next = sequence[calls.length - 1];
    if (next instanceof Error) throw next;
    if (typeof next === 'function') return next(url, options);
    assert.ok(next, `Unexpected provider attempt ${calls.length}`);
    return next;
  };
  const args = {
    url: 'https://provider.invalid/v1/chat/completions',
    apiKey: KEY,
    model: 'gpt-6-luna',
    messages,
    signal: new AbortController().signal,
    fetcher,
    onChunk: (chunk) => chunks.push(chunk),
    onRetry: (...args) => retries.push(args),
    sleep: async (ms, signal) => {
      waits.push(ms);
      assert.ok(signal instanceof AbortSignal, 'Retry delay receives cancellation signal');
    },
    ...extras,
  };
  return { calls, chunks, waits, retries, args, run: () => streamChatCompletion(args) };
}

function assertSafe(error) {
  assert.ok(error instanceof ChatProviderError);
  assert.match(error.message, /[А-Яа-яЁё]/, 'Display message should be in Russian');
  assert.doesNotMatch(error.message, /[\u4e00-\u9fff]/, 'Do not expose upstream Chinese errors');
  assert.ok(!error.message.includes(KEY), 'Do not expose API key');
  return true;
}

const isAbort = (error) => error.name === 'AbortError' || error.code === 'aborted' || error.code === 'interrupted';

test('SSE: decodes split UTF-8 and split event boundaries without losing text', async () => {
  const bytes = encoder.encode(delta('Привет, ') + delta('мир 👋') + finish() + done());
  const stream = new ReadableStream({
    start(controller) {
      for (let offset = 0; offset < bytes.length; offset += 7) controller.enqueue(bytes.slice(offset, offset + 7));
      controller.close();
    },
  });
  const h = harness([new Response(stream, { headers: { 'content-type': 'text/event-stream' } })]);
  assert.equal(await h.run(), 'Привет, мир 👋');
  assert.equal(h.chunks.join(''), 'Привет, мир 👋');
  assert.equal(h.calls.length, 1);
  const body = JSON.parse(h.calls[0].options.body);
  assert.equal(body.model, 'gpt-6-luna');
  assert.deepEqual(body.messages, messages);
});

test('SSE: DONE alone confirms a nonempty answer', async () => {
  const h = harness([response(delta('Ответ') + done())]);
  assert.equal(await h.run(), 'Ответ');
});

test('SSE: finish_reason confirms answer even without DONE', async () => {
  const h = harness([response(delta('Ответ') + finish())]);
  assert.equal(await h.run(), 'Ответ');
});

test('JSON: accepts a normal nonstreaming provider answer', async () => {
  const h = harness([response(JSON.stringify({ choices: [{ message: { content: 'Обычный ответ' }, finish_reason: 'stop' }] }), 200, 'application/json')]);
  assert.equal(await h.run(), 'Обычный ответ');
  assert.equal(h.chunks.join(''), 'Обычный ответ');
});

test('JSON200 top-level authentication error never retries', async () => {
  const h = harness([response(JSON.stringify({ message: 'Invalid API key', code: 'invalid_api_key' }), 200, 'application/json')]);
  await assert.rejects(h.run(), (error) => assertSafe(error) && error.code === 'configuration');
  assert.equal(h.calls.length, 1);
  assert.equal(h.chunks.length, 0);
});

test('JSON200 top-level routing error retries before any answer', async () => {
  const h = harness([response(JSON.stringify({ message: ROUTING, code: 'route_error' }), 200, 'application/json'), success()]);
  assert.equal(await h.run(), 'Готово');
  assert.equal(h.calls.length, 2);
  assert.equal(h.chunks.join(''), 'Готово');
});

test('temporary HTTP failure retries and then emits only successful answer', async () => {
  const h = harness([response('{"error":{"message":"upstream unavailable"}}', 503, 'application/json'), success()]);
  assert.equal(await h.run(), 'Готово');
  assert.equal(h.calls.length, 2);
  assert.equal(h.waits.length, 1);
  assert.ok(h.waits[0] > 0 && h.waits[0] <= 10000, 'Retry delay is positive and bounded');
  assert.equal(h.chunks.join(''), 'Готово');
});

for (const status of [408, 429, 502]) {
  test(`temporary HTTP ${status} retries within the configured budget`, async () => {
    const h = harness([response(JSON.stringify({ error: { message: 'Please try again later', type: 'rate_limit_error' } }), status, 'application/json'), success()], { maxAttempts: 2 });
    assert.equal(await h.run(), 'Готово');
    assert.equal(h.calls.length, 2);
    assert.equal(h.retries.length, 1);
  });
}

test('Chinese exhausted routing pool is temporary even with HTTP 400', async () => {
  const h = harness([response(JSON.stringify({ error: { message: ROUTING } }), 400, 'application/json'), success('Восстановлено')]);
  assert.equal(await h.run(), 'Восстановлено');
  assert.equal(h.calls.length, 2);
  assert.equal(h.chunks.join(''), 'Восстановлено');
});

test('HTTP 200 JSON error is detected and retried before text is emitted', async () => {
  const h = harness([response(JSON.stringify({ error: { message: ROUTING } }), 200, 'application/json'), success()]);
  assert.equal(await h.run(), 'Готово');
  assert.equal(h.calls.length, 2);
  assert.equal(h.chunks.join(''), 'Готово');
});

test('SSE error before any answer can be retried', async () => {
  const h = harness([response(errorEvent(ROUTING)), success()]);
  assert.equal(await h.run(), 'Готово');
  assert.equal(h.calls.length, 2);
});

test('SSE final tail error after text rejects without replaying the request', async () => {
  // No terminating blank line after the final event: tail still must be parsed.
  const tail = errorEvent(ROUTING).trimEnd();
  const h = harness([response(delta('Частичный ответ') + tail), success('Must not be emitted')]);
  await assert.rejects(h.run(), assertSafe);
  assert.equal(h.calls.length, 1);
  assert.equal(h.chunks.join(''), 'Частичный ответ');
});

test('truncated SSE after partial text is a failure without retry', async () => {
  const h = harness([response(delta('Начало ответа')), success()]);
  await assert.rejects(h.run(), assertSafe);
  assert.equal(h.calls.length, 1);
  assert.equal(h.chunks.join(''), 'Начало ответа');
});

test('DONE without actual content cannot be reported as successful answer', async () => {
  const h = harness([response(done()), response(done()), response(done())]);
  await assert.rejects(h.run(), assertSafe);
  assert.equal(h.chunks.length, 0);
});

test('temporary failures stop after three attempts and retain a safe error', async () => {
  const h = harness([response(ROUTING, 500), response(ROUTING, 500), response(ROUTING, 500), success()]);
  await assert.rejects(h.run(), assertSafe);
  assert.equal(h.calls.length, 3);
  assert.equal(h.waits.length, 2);
  assert.ok(h.waits.every((ms) => ms > 0 && ms <= 10000));
  assert.equal(h.chunks.length, 0);
});

test('authentication failures never retry and do not leak provider details', async () => {
  const h = harness([response(JSON.stringify({ error: { message: `Invalid API key: ${KEY}`, type: 'authentication_error' } }), 401, 'application/json'), success()]);
  await assert.rejects(h.run(), (error) => assertSafe(error) && error.retryable === false);
  assert.equal(h.calls.length, 1);
  assert.equal(h.waits.length, 0);
});

test('billing/quota failure is permanent even when HTTP status is 429', async () => {
  const h = harness([response(JSON.stringify({ error: { message: 'You exceeded your current quota, please check your plan and billing details.', code: 'insufficient_quota' } }), 429, 'application/json'), success()]);
  await assert.rejects(h.run(), (error) => assertSafe(error) && error.retryable === false);
  assert.equal(h.calls.length, 1);
});

for (const status of [400, 503]) {
  test(`invalid request errors never retry even when upstream uses HTTP ${status}`, async () => {
    const h = harness([response(JSON.stringify({ error: { message: 'Unsupported parameter: temperature', type: 'invalid_request_error' } }), status, 'application/json'), success()]);
    await assert.rejects(h.run(), (error) => assertSafe(error) && error.retryable === false);
    assert.equal(h.calls.length, 1);
  });
}

test('network connection failure retries before emitting text', async () => {
  const h = harness([new TypeError('fetch failed'), success()]);
  assert.equal(await h.run(), 'Готово');
  assert.equal(h.calls.length, 2);
});

test('network read failure after partial answer never retries', async () => {
  let read = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (read++ === 0) controller.enqueue(encoder.encode(delta('Начало')));
      else controller.error(new TypeError('socket disconnected'));
    },
  });
  const h = harness([new Response(stream, { headers: { 'content-type': 'text/event-stream' } }), success()]);
  await assert.rejects(h.run(), assertSafe);
  assert.equal(h.calls.length, 1);
  assert.equal(h.chunks.join(''), 'Начало');
});

test('already-aborted request never contacts the provider', async () => {
  const controller = new AbortController();
  controller.abort();
  const h = harness([success()], { signal: controller.signal });
  await assert.rejects(h.run(), isAbort);
  assert.equal(h.calls.length, 0);
});

test('abort during retry delay prevents further attempts', async () => {
  const controller = new AbortController();
  const h = harness([response('temporary', 503), success()], {
    signal: controller.signal,
    sleep: async () => { controller.abort(); },
  });
  await assert.rejects(h.run(), isAbort);
  assert.equal(h.calls.length, 1);
});

test('abort cancels an active stream reader and preserves previously emitted text', { timeout: 1500 }, async () => {
  const controller = new AbortController();
  let cancelled = false;
  const stream = new ReadableStream({
    start(streamController) { streamController.enqueue(encoder.encode(delta('Начало'))); },
    cancel() { cancelled = true; },
  });
  const h = harness([new Response(stream, { headers: { 'content-type': 'text/event-stream' } })], {
    signal: controller.signal,
    onChunk: (chunk) => { h.chunks.push(chunk); controller.abort(); },
  });
  // Keep the event loop alive so a stuck reader becomes a real timeout failure.
  const keepAlive = setTimeout(() => {}, 2000);
  try {
    await assert.rejects(h.run(), isAbort);
    assert.equal(h.calls.length, 1);
    assert.equal(h.chunks.join(''), 'Начало');
    assert.equal(cancelled, true);
  } finally {
    clearTimeout(keepAlive);
  }
});

test('providerError distinguishes temporary routing exhaustion from permanent errors', () => {
  const exhausted = providerError(400, { error: { message: ROUTING } });
  assertSafe(exhausted);
  assert.equal(exhausted.retryable, true);
  assert.equal(exhausted.status, 400);
  const forbidden = providerError(403, { error: { message: 'Permission denied' } });
  assertSafe(forbidden);
  assert.equal(forbidden.retryable, false);
});
