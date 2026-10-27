type ErrorCode = "unavailable" | "rate_limit" | "configuration" | "billing" | "invalid_request" | "empty_response" | "incomplete_response" | "interrupted";

const PUBLIC_MESSAGES: Record<ErrorCode, string> = {
  unavailable: "Сервис ответов временно недоступен. Попробуйте ещё раз чуть позже.",
  rate_limit: "Сервис сейчас перегружен. Попробуйте ещё раз через минуту.",
  configuration: "Сервис ответов временно недоступен. Попробуйте позже.",
  billing: "Сервис ответов временно недоступен. Попробуйте позже.",
  invalid_request: "Не удалось обработать запрос. Попробуйте сократить сообщение или убрать вложения.",
  empty_response: "Не удалось получить ответ. Попробуйте ещё раз.",
  incomplete_response: "Ответ прервался. Попробуйте отправить запрос ещё раз.",
  interrupted: "Запрос был прерван. Попробуйте ещё раз.",
};

export class ChatProviderError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    public readonly retryable: boolean,
    public readonly requestId?: string,
  ) {
    super(PUBLIC_MESSAGES[code]);
    this.name = "ChatProviderError";
  }
}

// Upstream text is used only for classification, never as a public message or log.
export function providerError(status: number, body: unknown): ChatProviderError {
  let parsed: any = body;
  if (typeof body === "string") {
    try { parsed = JSON.parse(body); } catch { parsed = { message: body }; }
  }
  const error = parsed?.error;
  const detail = String((typeof error === "string" ? error : error?.message) || parsed?.message || "").slice(0, 16_384);
  const code = String(error?.code || error?.type || parsed?.code || "");
  const description = `${code} ${detail}`;
  const rawId = parsed?.request_id || error?.request_id || detail.match(/request[_ -]?id\s*[:：]\s*([\w-]{1,128})/i)?.[1];
  const requestId = typeof rawId === "string" && /^[\w-]{1,128}$/.test(rawId) ? rawId : undefined;

  if (status === 401 || status === 403 || /invalid[_ -]?(api[_ -]?)?key|authentication_error/i.test(description)) {
    return new ChatProviderError("configuration", status, false, requestId);
  }
  if (status === 402 || /insufficient[_ -]?(?:funds|quota|balance|credit)|billing|payment|balance|card[-_ ]?required|credit|quota_exceeded|余额不足|欠费/i.test(description)) {
    return new ChatProviderError("billing", status, false, requestId);
  }
  if (status === 404 || /model_not_found|invalid_model/i.test(description)) {
    return new ChatProviderError("configuration", status, false, requestId);
  }
  if (/智能路由候选均请求失败|个人池候选均已尝试|no available (?:channel|route)|all (?:channels|routes|candidates).*failed|upstream.*(?:unavailable|overloaded)|model.*unavailable/i.test(description)) {
    return new ChatProviderError("unavailable", status, true, requestId);
  }
  if (/invalid_request_error|invalid_parameter|unsupported_parameter|invalid_json|context_length_exceeded|maximum context length|请求参数|不支持的字段/i.test(description)) {
    return new ChatProviderError("invalid_request", status, false, requestId);
  }
  if (status === 429 || /rate_limit|too many requests/i.test(description)) {
    return new ChatProviderError("rate_limit", status, true, requestId);
  }
  if (status === 408 || status === 425 || status >= 500) {
    return new ChatProviderError("unavailable", status, true, requestId);
  }
  return new ChatProviderError("invalid_request", status, false, requestId);
}

function aborted(): ChatProviderError {
  return new ChatProviderError("interrupted", 499, false);
}

function hasErrorEnvelope(parsed: any): boolean {
  return !!(parsed?.error || (parsed?.message && !parsed?.choices && (parsed?.code || parsed?.status === "error")));
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(aborted()); return; }
    const onAbort = () => { clearTimeout(timer); reject(aborted()); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", onAbort); resolve(); }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

interface CompletionOptions {
  url: string;
  apiKey: string;
  model: string;
  messages: unknown[];
  signal: AbortSignal;
  onChunk: (chunk: string) => void;
  onRetry?: (attempt: number, error: ChatProviderError) => void;
  fetcher?: typeof fetch;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
  maxAttempts?: number;
}

// Retries are limited to attempts that have not delivered any answer text.
export async function streamChatCompletion(options: CompletionOptions): Promise<string> {
  const { signal, onChunk } = options;
  const fetcher = options.fetcher || fetch;
  const sleep = options.sleep || delay;
  const attempts = Math.min(3, Math.max(1, options.maxAttempts ?? 3));
  const requestBody = JSON.stringify({ model: options.model, messages: options.messages, stream: true });
  let content = "";

  const emit = (chunk: unknown) => {
    if (typeof chunk !== "string" || !chunk) return;
    if (signal.aborted) throw aborted();
    // Store before invoking the callback: a failed delivery must never restart generation.
    content += chunk;
    onChunk(chunk);
  };

  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (signal.aborted) throw aborted();
    const attemptController = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const onAbort = () => {
      attemptController.abort();
      // Some stream adapters do not propagate the fetch signal to a pending read.
      if (reader) void reader.cancel().catch(() => {});
    };
    signal.addEventListener("abort", onAbort, { once: true });
    let response: Response | undefined;
    let completed = false;
    let failure: ChatProviderError | undefined;
    let retryAfter = 0;

    const event = (data: string) => {
      if (data.trim() === "[DONE]") { completed = true; return; }
      let parsed: any;
      try { parsed = JSON.parse(data); }
      catch { throw new ChatProviderError("incomplete_response", 502, true); }
      if (hasErrorEnvelope(parsed)) {
        throw providerError(200, parsed);
      }
      const choice = parsed?.choices?.[0];
      emit(choice?.delta?.content);
      if (choice?.finish_reason != null) completed = true;
    };

    try {
      response = await fetcher(options.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${options.apiKey}` },
        body: requestBody,
        signal: attemptController.signal,
      });
      if (signal.aborted) throw aborted();
      if (!response.ok) {
        throw providerError(response.status, await response.text());
      }
      if (!response.body) throw new ChatProviderError("empty_response", 502, true);
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let format: "json" | "sse" | undefined = response.headers.get("content-type")?.includes("application/json") ? "json" : undefined;
      let dataLines: string[] = [];
      const line = (value: string) => {
        if (!value.trim()) {
          if (dataLines.length) { const data = dataLines.join("\n"); dataLines = []; event(data); }
        } else if (value.startsWith("data:")) {
          dataLines.push(value.slice(5).replace(/^ /, ""));
        }
      };
      while (!completed) {
        const { done, value } = await reader.read();
        if (signal.aborted) throw aborted();
        buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
        if (!format && buffer.trim()) format = /^(?:\{|\[)/.test(buffer.trimStart()) ? "json" : "sse";
        if (buffer.length > 4 * 1024 * 1024 || dataLines.join("").length > 4 * 1024 * 1024) {
          throw new ChatProviderError("incomplete_response", 502, false);
        }
        if (format === "sse") {
          let newline: number;
          while (!completed && (newline = buffer.indexOf("\n")) >= 0) {
            const value = buffer.slice(0, newline).replace(/\r$/, "");
            buffer = buffer.slice(newline + 1);
            line(value);
          }
          if (done && !completed) {
            if (buffer) line(buffer.replace(/\r$/, ""));
            line("");
          }
        }
        if (done) break;
      }
      if (format === "json") {
        let parsed: any;
        try { parsed = JSON.parse(buffer); }
        catch { throw new ChatProviderError("incomplete_response", 502, true); }
        if (hasErrorEnvelope(parsed)) throw providerError(200, parsed);
        emit(parsed?.choices?.[0]?.message?.content || parsed?.response || parsed?.content);
        completed = !!content;
      }
      if (!content) throw new ChatProviderError("empty_response", 502, true);
      if (!completed) throw new ChatProviderError("incomplete_response", 502, true);
      return content;
    } catch (error) {
      failure = signal.aborted ? aborted() : error instanceof ChatProviderError
        ? error : new ChatProviderError("unavailable", 502, true);
      const header = response?.headers.get("retry-after");
      if (header) {
        retryAfter = /^\d+$/.test(header) ? Number(header) * 1000 : Math.max(0, Date.parse(header) - Date.now());
      }
    } finally {
      // Cancel unsuccessful streams as well as streams finished before their socket EOF.
      attemptController.abort();
      signal.removeEventListener("abort", onAbort);
      if (reader) {
        try { await reader.cancel(); } catch {}
        reader.releaseLock();
      }
    }
    if (!failure) throw new ChatProviderError("unavailable", 502, false);
    if (signal.aborted || content || !failure.retryable || attempt === attempts || retryAfter > 10_000) throw failure;
    options.onRetry?.(attempt + 1, failure);
    await sleep(Math.max(retryAfter || 0, attempt === 1 ? 800 : 2000), signal);
  }
  throw new ChatProviderError("unavailable", 502, false);
}
