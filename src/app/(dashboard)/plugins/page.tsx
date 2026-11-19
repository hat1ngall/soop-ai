"use client";

import { useEffect, useState } from "react";
import { PLUGINS } from "@/lib/plugins";

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
  const filtered = PLUGINS.filter((plugin) => `${plugin.name} ${plugin.category} ${plugin.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  const categories = Array.from(new Set(filtered.map((plugin) => plugin.category)));
  return <div className="plugins-page"><div className="plugins-inner">
    <div className="plugins-heading"><div><p className="plugins-eyebrow">SOOP AI / ИНСТРУМЕНТЫ</p><h1>Плагины</h1><p>Подключайте открытые источники, чтобы дополнить ответы нейросети.</p></div><div className="plugins-count"><strong>{enabled.length}</strong><span>подключено</span></div></div>
    <div className="plugins-info"><span>✧</span><p>Бесплатно и без ключей. При включённом плагине текст каждого нового сообщения отправляется выбранному сервису для поиска. Плагины видят только текущий запрос, а не всю историю чата.</p></div>
    <label className="plugins-search"><span aria-hidden="true">⌕</span><span className="sr-only">Искать плагины</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Искать плагины" /></label>
    {error && <p role="alert" className="plugins-error">{error}</p>}
    {loading ? <p className="plugins-empty">Загрузка…</p> : categories.length === 0 ? <p className="plugins-empty">Плагины не найдены.</p> : categories.map((category) => <section key={category} className="plugins-section"><h2>{category}</h2><div className="plugins-grid">{filtered.filter((plugin) => plugin.category === category).map((plugin) => {
      const active = enabled.includes(plugin.id);
      return <article key={plugin.id} className="plugin-card"><div className="plugin-icon" style={{ background: plugin.color }}>{plugin.icon}</div><div className="plugin-details"><div className="plugin-name">{plugin.name}<span className="plugin-free">БЕСПЛАТНО</span></div><p>{plugin.description}</p><small>{plugin.detail}</small></div><button type="button" onClick={() => void toggle(plugin.id)} disabled={saving !== null} aria-pressed={active} aria-label={`${active ? "Отключить" : "Подключить"} ${plugin.name}`} className={`plugin-toggle ${active ? "is-enabled" : ""}`}>{saving === plugin.id ? "…" : active ? "✓" : "+"}</button></article>;
    })}</div></section>)}
    <p className="plugins-footnote">Подключения к личным аккаунтам и сервисам с API-ключом требуют отдельной настройки. Здесь показаны доступные открытые источники.</p>
  </div></div>;
}
