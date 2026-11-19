export const PLUGINS = [
  { id: "github", name: "GitHub", domain: "github.com", icon: "GH", category: "Разработка", description: "Поиск публичных репозиториев", detail: "Открытые репозитории и их описания. Без доступа к аккаунту и приватным проектам.", color: "#24243a" },
  { id: "wikipedia", name: "Википедия", domain: "wikipedia.org", icon: "W", category: "Знания", description: "Поиск статей энциклопедии", detail: "Краткие выдержки и ссылки на статьи Википедии.", color: "#554b93" },
  { id: "crossref", name: "Crossref", domain: "crossref.org", icon: "✳", category: "Наука", description: "Поиск научных публикаций", detail: "Названия, авторы и ссылки DOI из открытого каталога научных публикаций.", color: "#d46944" },
  { id: "openlibrary", name: "Open Library", domain: "openlibrary.org", icon: "▤", category: "Книги", description: "Поиск книг и авторов", detail: "Открытый каталог книг, авторов и ссылок Open Library.", color: "#298d83" },
  { id: "huggingface", name: "Hugging Face", domain: "huggingface.co", icon: "HF", category: "Разработка", description: "Поиск публичных AI-моделей", detail: "Открытый каталог моделей Hugging Face. Без доступа к личному аккаунту.", color: "#dd9d24" },
  { id: "context7", name: "Context7", domain: "context7.com", icon: "C7", category: "Разработка", description: "Поиск по документации библиотек", detail: "Поиск примеров и текстов документации без ключа; возможны ограничения числа запросов.", color: "#009b76" },
  { id: "blockscout", name: "Blockscout", domain: "blockscout.com", icon: "BS", category: "Данные и аналитика", description: "Поиск публичных данных Ethereum", detail: "Поиск адресов и токенов в открытом обозревателе Ethereum. Без доступа к кошелькам.", color: "#3869e9" },
] as const;
export type PluginId = (typeof PLUGINS)[number]["id"];
export function isPluginId(value: string): value is PluginId { return PLUGINS.some((plugin) => plugin.id === value); }
