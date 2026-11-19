"use client";

import { useCallback, useEffect, useState } from "react";

type Reminder = { id: string; subject: string; remindAt: string; deliveredAt: string | null; message: string | null };

export default function PlanningPage() {
  const [view, setView] = useState<"today" | "upcoming" | "all" | "delivered">("today");
  const [subject, setSubject] = useState("");
  const [when, setWhen] = useState("");
  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const refresh = useCallback(async () => {
    try { const response = await fetch("/api/reminders", { cache: "no-store" }); if (!response.ok) throw new Error(); setItems(await response.json()); }
    catch { setError("Не удалось загрузить напоминания."); }
  }, []);
  useEffect(() => {
    if ("Notification" in window) setPermission(Notification.permission);
    void refresh();
    window.addEventListener("soop:reminders-changed", refresh);
    return () => window.removeEventListener("soop:reminders-changed", refresh);
  }, [refresh]);
  const enable = async () => {
    window.dispatchEvent(new Event("soop:enable-reminder-sound"));
    if (!("Notification" in window)) { setNotice("Этот браузер не поддерживает уведомления. Напоминания появятся на сайте."); return; }
    const result = await Notification.requestPermission();
    setPermission(result);
    setNotice(result === "granted" ? "Уведомления включены. Держите сайт открытым для напоминаний." : "Разрешите уведомления в настройках браузера. Напоминания также появятся на сайте.");
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setNotice("");
    const time = new Date(when);
    if (!subject.trim() || !when || !Number.isFinite(time.getTime()) || time.getTime() <= Date.now()) { setError("Введите текст и выберите дату и время в будущем."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/reminders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, remindAt: time.toISOString() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось создать напоминание.");
      setSubject(""); setWhen(""); setNotice("Напоминание запланировано."); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Не удалось создать напоминание."); }
    finally { setLoading(false); }
  };
  const remove = async (id: string) => {
    try { const response = await fetch(`/api/reminders/${id}`, { method: "DELETE" }); if (!response.ok) throw new Error(); setItems((previous) => previous.filter((item) => item.id !== id)); }
    catch { setError("Не удалось удалить напоминание."); }
  };
  const today = new Date();
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime();
  const isTodayOrOverdue = (value: string) => new Date(value).getTime() < endOfToday;
  const visible = items.filter((item) => view === "today" ? !item.deliveredAt && isTodayOrOverdue(item.remindAt) : view === "upcoming" ? !item.deliveredAt && !isTodayOrOverdue(item.remindAt) : view === "delivered" ? !!item.deliveredAt : true);
  const views = [
    { id: "today" as const, icon: "☼", label: "Сегодня", count: items.filter((item) => !item.deliveredAt && isTodayOrOverdue(item.remindAt)).length },
    { id: "upcoming" as const, icon: "▦", label: "Предстоящие", count: items.filter((item) => !item.deliveredAt && !isTodayOrOverdue(item.remindAt)).length },
    { id: "all" as const, icon: "☷", label: "Все напоминания", count: items.length },
    { id: "delivered" as const, icon: "✓", label: "Уже напомнили", count: items.filter((item) => !!item.deliveredAt).length },
  ];
  const current = views.find((item) => item.id === view)!;
  const empty = { today: "На сегодня напоминаний нет", upcoming: "Предстоящих напоминаний нет", all: "Пока нет напоминаний", delivered: "Пока не было уведомлений" };
  return (
    <div className="planner-layout">
      <aside className="planner-nav" aria-label="Разделы планирования">
        <div className="planner-nav-heading"><span className="planner-nav-icon">✦</span><span><strong>Планирование</strong><small>Ваши напоминания</small></span></div>
        <nav className="planner-nav-list">{views.map((item) => <button key={item.id} type="button" onClick={() => setView(item.id)} aria-current={view === item.id ? "page" : undefined} className={`planner-nav-item ${view === item.id ? "is-active" : ""}`}><span className="planner-nav-symbol">{item.icon}</span><span>{item.label}</span><span className="planner-count">{item.count}</span></button>)}</nav>
        <div className="planner-nav-note"><span>✧</span><p>Идеи под контролем.<br /><strong>Главное — вовремя.</strong></p></div>
      </aside>
      <main className="planner-surface">
        <div className="planner-content">
          <div className="planner-heading"><div><p className="planner-eyebrow">SOOP AI / ПЛАНИРОВАНИЕ</p><h1>{current.label}</h1><p className="planner-date">{today.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</p></div><button type="button" onClick={() => void enable()} className="planner-notification" title="Разрешить уведомления и включить звук"><span>♧</span> {permission === "granted" ? "Включить звук" : "Включить уведомления"}</button></div>
          <form onSubmit={submit} className="planner-form">
            <div className="planner-form-main"><span className="planner-plus" aria-hidden="true">＋</span><label htmlFor="reminder-subject" className="sr-only">О чём напомнить?</label><input id="reminder-subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={500} required placeholder="Добавить напоминание — например, позвонить врачу" /><button type="submit" disabled={loading} className="planner-submit">{loading ? "Создаём…" : "Добавить"}</button></div>
            <div className="planner-form-footer"><label htmlFor="reminder-time">◷ <span>Дата и время</span></label><input id="reminder-time" type="datetime-local" required value={when} onChange={(event) => setWhen(event.target.value)} /><span className="planner-form-hint">1 запрос бесплатного тарифа</span></div>
          </form>
          {(error || notice) && <p role={error ? "alert" : "status"} className={error ? "planner-feedback is-error" : "planner-feedback"}>{error || notice}</p>}
          {visible.length === 0 ? <div className="planner-empty"><div className="planner-empty-icon">{current.icon}</div><h2>{empty[view]}</h2><p>{view === "delivered" ? "Здесь появятся напоминания после уведомления." : "Добавьте напоминание выше — мы сохраним его для вас."}</p></div> : <div className="planner-items"><div className="planner-items-caption">{current.label} <span>{visible.length}</span></div>{visible.map((item) => <article key={item.id} className="planner-item"><span className={`planner-item-indicator ${item.deliveredAt ? "is-delivered" : ""}`}>{item.deliveredAt ? "✓" : ""}</span><div className="planner-item-body"><h2>{item.subject}</h2><p>◷ {new Date(item.remindAt).toLocaleString()} <span>· {item.deliveredAt ? "Напомнили" : "Ожидает"}</span></p>{item.deliveredAt && item.message && <p className="planner-item-message">{item.message}</p>}</div><button type="button" onClick={() => void remove(item.id)} aria-label="Удалить напоминание" title="Удалить напоминание" className="planner-delete">×</button></article>)}</div>}
        </div>
        <div className="planner-bottom"><div className="planner-bottom-icon">✧</div><div><strong>Напоминания с Soop AI</strong><p>Сайт должен оставаться открытым. Если время прошло, напомним при следующем открытии. Время указано по часовому поясу вашего устройства.</p></div></div>
      </main>
    </div>
  );
}
