export const PLUGINS = [
  { id: "github", name: "GitHub", icon: "GH", category: "Разработка", description: "Поиск публичных репозиториев", detail: "Открытые репозитории и их описания. Без доступа к аккаунту и приватным проектам.", color: "#24243a" },
  { id: "wikipedia", name: "Википедия", icon: "W", category: "Знания", description: "Поиск статей энциклопедии", detail: "Краткие выдержки и ссылки на статьи Википедии.", color: "#554b93" },
  { id: "crossref", name: "Crossref", icon: "✳", category: "Наука", description: "Поиск научных публикаций", detail: "Названия, авторы и ссылки DOI из открытого каталога научных публикаций.", color: "#d46944" },
  { id: "openlibrary", name: "Open Library", icon: "▤", category: "Книги", description: "Поиск книг и авторов", detail: "Открытый каталог книг, авторов и ссылок Open Library.", color: "#298d83" },
] as const;
export type PluginId = (typeof PLUGINS)[number]["id"];
export function isPluginId(value: string): value is PluginId { return PLUGINS.some((plugin) => plugin.id === value); }
