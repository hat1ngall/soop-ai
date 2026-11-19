"use client";

import { useCallback, useEffect, useState } from "react";

type Reminder = { id: string; subject: string; remindAt: string; deliveredAt: string | null; message: string | null };

export default function PlanningPage() {
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
  return <div className="planning-page h-full overflow-y-auto px-4 py-8 sm:px-8 sm:py-12"><div className="mx-auto max-w-3xl">
    <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-500">SOOP AI</p>
    <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Планирование</h1>
    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">Выберите дату и время, а нейросеть подготовит короткое напоминание.</p>
    <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-violet-900 dark:border-violet-800 dark:bg-slate-800 dark:text-violet-100">Для уведомления и звука сайт должен оставаться открытым. Если время прошло, напомним при следующем открытии. Время указано по часовому поясу вашего устройства.<br /><button type="button" onClick={() => void enable()} className="mt-2 rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white hover:bg-violet-700">{permission === "granted" ? "Включить звук" : "Включить уведомления и звук"}</button></div>
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-3xl border border-[#dedcf7] bg-white p-5 shadow-[0_14px_40px_rgba(92,80,180,.09)] dark:border-slate-700 dark:bg-slate-800 sm:p-6">
      <div><label htmlFor="reminder-subject" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100">О чём напомнить?</label><textarea id="reminder-subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={500} required rows={3} placeholder="Например: позвонить врачу" className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-violet-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white" /></div>
      <div><label htmlFor="reminder-time" className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100">Дата и время</label><input id="reminder-time" type="datetime-local" required value={when} onChange={(event) => setWhen(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-violet-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white" /></div>
      <p className="text-xs text-slate-500">Создание использует один запрос из дневного лимита бесплатного тарифа.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}{notice && <p role="status" className="text-sm text-violet-700 dark:text-violet-200">{notice}</p>}
      <button disabled={loading} className="rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:brightness-110 disabled:opacity-50">{loading ? "Создаём напоминание…" : "Запланировать"}</button>
    </form>
    <h2 className="mb-3 mt-9 text-lg font-semibold text-slate-900 dark:text-white">Ваши напоминания</h2>
    {items.length === 0 ? <p className="text-sm text-slate-500">Пока нет напоминаний.</p> : <div className="space-y-3">{items.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl border border-[#dedcf7] bg-white p-4 dark:border-slate-700 dark:bg-slate-800"><div className="min-w-0"><p className="break-words font-medium text-slate-900 dark:text-white">{item.subject}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.remindAt).toLocaleString()} · {item.deliveredAt ? "Напомнили" : "Ожидает"}</p>{item.deliveredAt && item.message && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.message}</p>}</div><button type="button" onClick={() => void remove(item.id)} aria-label="Удалить напоминание" className="rounded-lg px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600">✕</button></div>)}</div>}
  </div></div>;
}
