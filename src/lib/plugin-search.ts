import { isPluginId, type PluginId } from "./plugins";

type Result = { name: string; text: string; url: string };
const clean = (value: unknown, max = 400): string => String(value ?? "").replace(/<[^>]*>/g, " ").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, max);

export async function searchPlugin(id: PluginId, query: string, fetcher: typeof fetch = fetch): Promise<Result[]> {
  const q = query.trim().slice(0, 180);
  if (!q || !isPluginId(id)) return [];
  let url: URL;
  if (id === "github") { url = new URL("https://api.github.com/search/repositories"); url.searchParams.set("q", q); url.searchParams.set("per_page", "3"); }
  else if (id === "wikipedia") { url = new URL(`https://${/[а-яё]/i.test(q) ? "ru" : "en"}.wikipedia.org/w/api.php`); url.search = new URLSearchParams({ action: "query", list: "search", srsearch: q, srlimit: "3", format: "json", utf8: "1" }).toString(); }
  else if (id === "crossref") { url = new URL("https://api.crossref.org/works"); url.search = new URLSearchParams({ query: q, rows: "3", select: "title,author,DOI,published" }).toString(); }
  else if (id === "huggingface") { url = new URL("https://huggingface.co/api/models"); url.search = new URLSearchParams({ search: q, limit: "3", full: "false" }).toString(); }
  else { url = new URL("https://openlibrary.org/search.json"); url.search = new URLSearchParams({ q, limit: "3", fields: "key,title,author_name,first_publish_year" }).toString(); }
  const response = await fetcher(url.toString(), { headers: { Accept: "application/json", "User-Agent": "SoopAI/1.0" }, signal: AbortSignal.timeout(6000), redirect: "error" });
  if (!response.ok) throw new Error(`Сервис вернул ${response.status}`);
  const contentLength = Number(response.headers.get("content-length"));
  if (contentLength > 1_000_000) throw new Error("Слишком большой ответ сервиса");
  if (!response.body) throw new Error("Пустой ответ сервиса");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1_000_000) throw new Error("Слишком большой ответ сервиса");
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const data = JSON.parse(raw);
  if (id === "github") return (Array.isArray(data.items) ? data.items : []).slice(0, 3).map((item: any) => ({ name: clean(item.full_name, 160), text: clean(item.description), url: /^https:\/\/github\.com\//.test(item.html_url) ? item.html_url : "" }));
  if (id === "wikipedia") return (Array.isArray(data.query?.search) ? data.query.search : []).slice(0, 3).map((item: any) => ({ name: clean(item.title, 160), text: clean(item.snippet), url: `https://${url.hostname}/wiki/${encodeURIComponent(String(item.title).replace(/ /g, "_"))}` }));
  if (id === "crossref") return (Array.isArray(data.message?.items) ? data.message.items : []).slice(0, 3).map((item: any) => ({ name: clean(item.title?.[0], 160), text: clean((item.author || []).slice(0, 4).map((author: any) => `${author.given || ""} ${author.family || ""}`.trim()).join(", ")), url: item.DOI ? `https://doi.org/${encodeURIComponent(String(item.DOI))}` : "" }));
  if (id === "huggingface") return (Array.isArray(data) ? data : []).slice(0, 3).map((item: any) => ({ name: clean(item.id, 160), text: clean(`Задача: ${item.pipeline_tag || "не указана"}; загрузок: ${item.downloads ?? "—"}`), url: /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(item.id) ? `https://huggingface.co/${item.id}` : "" }));
  return (Array.isArray(data.docs) ? data.docs : []).slice(0, 3).map((item: any) => ({ name: clean(item.title, 160), text: clean(`${(item.author_name || []).slice(0, 3).join(", ")} ${item.first_publish_year || ""}`), url: /^\/works\/OL\d+W$/.test(item.key) ? `https://openlibrary.org${item.key}` : "" }));
}

export async function gatherPluginContext(ids: string[], query: string): Promise<string> {
  const selected = Array.from(new Set(ids)).filter(isPluginId);
  if (!selected.length || !query.trim()) return "";
  const results = await Promise.allSettled(selected.map(async (id) => ({ id, items: await searchPlugin(id, query) })));
  return results.map((result, index) => {
    const id = selected[index];
    if (result.status === "rejected") return `${id}: поиск недоступен; не утверждай, что поиск выполнен.`;
    if (!result.value.items.length) return `${id}: результатов не найдено.`;
    return `${id}:\n${result.value.items.map((item) => `- ${item.name}: ${item.text}${item.url ? ` (${item.url})` : ""}`).join("\n")}`;
  }).join("\n\n");
}
