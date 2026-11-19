"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./LanguageProvider";

type Due = { id: string; message: string; remindAt: string };

export function ReminderNotifier() {
  const { language, t } = useLanguage();
  const languageRef = useRef(language);
  languageRef.current = language;
  const [alerts, setAlerts] = useState<Due[]>([]);
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    let active = true;
    let checking = false;
    const unlock = () => {
      try {
        audio.current ||= new AudioContext();
        void audio.current.resume().catch(() => {});
      } catch {}
    };
    const sound = () => {
      try {
        const context = audio.current;
        if (!context || context.state !== "running") return;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 660;
        gain.gain.setValueAtTime(0.12, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(); oscillator.stop(context.currentTime + 0.4);
      } catch {}
    };
    const check = async () => {
      if (checking || !active) return;
      checking = true;
      try {
        const response = await fetch("/api/reminders/due", { method: "POST", cache: "no-store" });
        if (!response.ok) return;
        const due: Due[] = await response.json();
        if (!active || !due.length) return;
        setAlerts((previous) => [...previous, ...due]);
        window.dispatchEvent(new Event("soop:reminders-changed"));
        sound();
        if ("Notification" in window && Notification.permission === "granted") {
          for (const item of due) {
            const when = new Date(item.remindAt).toLocaleString(languageRef.current === "en" ? "en-US" : "ru-RU");
            try { new Notification(languageRef.current === "en" ? "Soop AI reminder" : "Напоминание Soop AI", { body: `${when} · ${item.message}`, icon: "/logo.svg", tag: item.id }); } catch {}
          }
        }
      } catch {} finally { checking = false; }
    };
    window.addEventListener("soop:enable-reminder-sound", unlock);
    window.addEventListener("focus", check);
    const interval = window.setInterval(check, 15_000);
    void check();
    return () => { active = false; clearInterval(interval); window.removeEventListener("focus", check); window.removeEventListener("soop:enable-reminder-sound", unlock); void audio.current?.close(); audio.current = null; };
  }, []);
  if (!alerts.length) return null;
  return <div className="fixed right-4 top-16 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">{alerts.map((alert) => <div key={alert.id} className="rounded-2xl border border-violet-200 bg-white p-4 text-sm text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-white"><div className="flex items-start justify-between gap-3"><div><strong>{t("Напоминание")} · {new Date(alert.remindAt).toLocaleString(language === "en" ? "en-US" : "ru-RU")}</strong><p className="mt-1">{alert.message}</p></div><button type="button" aria-label={t("Закрыть")} onClick={() => setAlerts((items) => items.filter((item) => item.id !== alert.id))}>✕</button></div></div>)}</div>;
}
