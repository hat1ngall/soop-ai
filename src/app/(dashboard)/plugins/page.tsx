"use client";

import { useEffect, useState } from "react";
import { PLUGINS } from "@/lib/plugins";
import { PLANNED_PLUGINS } from "@/lib/planned-plugins";

function PluginIcon({ name, domain, fallback, color = "#6554b5" }: { name: string; domain: string; fallback: string; color?: string }) {
  return <div className="plugin-icon plugin-icon-image" style={{ background: color }}><span aria-hidden="true">{fallback}</span><img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`} alt={`Логотип ${name}`} loading="lazy" referrerPolicy="no-referrer" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div>;
}

export default function PluginsPage() {
  const [enabled, setEnabled] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/plugins", { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error(); const data = await response.json(); if (active) setEnabled(data.enabled); }).catch(() => { if (active) setError("Не удалось загрузить плагины. Обновите страницу."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const toggle = async (id: string) => {
    const next = !enabled.includes(id);
    setSaving(id); setError("");
    try {
      const response = await fetch("/api/plugins", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, enabled: next }) });
      if (!response.ok) throw new Error();
      setEnabled((items) => next ? [...items, id] : items.filter((item) => item !== id));
    } catch { setError("Не удалось изменить настройки плагина. Попробуйте ещё раз."); }
    finally { setSaving(null); }
  };
  const matches = (plugin: { name: string; category: string; description: string }) => `${plugin.name} ${plugin.category} ${plugin.description}`.toLowerCase().includes(query.trim().toLowerCase());
  const filtered = PLUGINS.filter(matches);
  const planned = PLANNED_PLUGINS.filter(matches);
  const categories = Array.from(new Set([...filtered.map((plugin) => plugin.category), ...planned.map((plugin) => plugin.category)]));
  return <div className="plugins-page"><div className="plugins-inner">
    <div className="plugins-heading"><div><p className="plugins-eyebrow">SOOP AI / ИНСТРУМЕНТЫ</p><h1>Плагины</h1><p>Выберите сервисы для работы с нейросетью.</p></div><div className="plugins-count"><strong>{enabled.length}</strong><span>подключено</span></div></div>
    <div className="plugins-info"><span>✧</span><p>Рабочие открытые источники можно подключить без ключей. При их включении до 180 символов текущего сообщения отправляются выбранным сервисам для поиска; история чата и вложения не передаются. Остальные сервисы показаны как ещё не подключённые.</p></div>
    <label className="plugins-search"><span aria-hidden="true">⌕</span><span className="sr-only">Искать плагины</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Искать плагины" /></label>
    {error && <p role="alert" className="plugins-error">{error}</p>}
    {loading ? <p className="plugins-empty">Загрузка…</p> : categories.length === 0 ? <p className="plugins-empty">Плагины не найдены.</p> : categories.map((category) => <section key={category} className="plugins-section"><h2>{category}</h2><div className="plugins-grid">{filtered.filter((plugin) => plugin.category === category).map((plugin) => {
      const active = enabled.includes(plugin.id);
      return <article key={plugin.id} className="plugin-card"><PluginIcon name={plugin.name} domain={plugin.domain} fallback={plugin.icon} color={plugin.color} /><div className="plugin-details"><div className="plugin-name">{plugin.name}<span className="plugin-free">БЕСПЛАТНО</span></div><p>{plugin.description}</p><small>{plugin.detail}</small></div><button type="button" onClick={() => void toggle(plugin.id)} disabled={saving !== null} aria-pressed={active} aria-label={`${active ? "Отключить" : "Подключить"} ${plugin.name}`} className={`plugin-toggle ${active ? "is-enabled" : ""}`}>{saving === plugin.id ? "…" : active ? "✓" : "+"}</button></article>;
    })}{planned.filter((plugin) => plugin.category === category).map((plugin) => <article key={plugin.name} className="plugin-card plugin-card-planned"><PluginIcon name={plugin.name} domain={plugin.domain} fallback={plugin.name.slice(0, 2).toUpperCase()} /><div className="plugin-details"><div className="plugin-name">{plugin.name}<span className="plugin-planned">НЕ ПОДКЛЮЧЕНО</span></div><p>{plugin.description}</p><small>Интеграция ещё не настроена.</small></div></article>)}</div></section>)}
    <p className="plugins-footnote">Интеграции с личными аккаунтами и API-ключами нужно разрабатывать и настраивать для каждого сервиса отдельно. Плашка «Не подключено» означает, что сервис пока не работает в Soop AI.</p>
  </div></div>;
}
