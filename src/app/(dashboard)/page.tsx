"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const starters = [
  { icon: "✦", title: "Новая идея", text: "Помоги начать с чистого листа" },
  { icon: "▱", title: "Разобрать файл", text: "Найди главное в документе" },
  { icon: "⌘", title: "Собрать решение", text: "Напиши код или план действий" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [prompt, setPrompt] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => { if (status === "unauthenticated") router.replace("/login"); }, [status, router]);

  const startChat = async (value = prompt) => {
    if (creating) return;
    setCreating(true);
    try {
      const text = value.trim();
      const response = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: text.slice(0, 42) || "Новый чат", model: "claude-opus-5" }) });
      if (!response.ok) return;
      const chat = await response.json();
      if (text) sessionStorage.setItem("soop:pending-prompt", text);
      router.push(`/chat/${chat.id}`);
    } finally { setCreating(false); }
  };

  if (status === "loading") return <div className="flex h-full items-center justify-center"><span className="h-5 w-5 animate-spin rounded-full border-2 border-[#d8d3cc] border-t-[#6750a4]" /></div>;
  if (!session) return null;

  const firstName = session.user?.name?.split(" ")[0] || "друг";
  return (
    <div className="relative flex h-full items-center justify-center overflow-y-auto px-5 py-10 sm:px-8">
      <div className="pointer-events-none absolute left-[16%] top-[18%] h-64 w-64 rounded-full bg-[#eee6ff]/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[8%] right-[12%] h-48 w-48 rounded-full bg-[#fbe8d5]/35 blur-3xl" />
      <section className="relative w-full max-w-[700px] animate-slide-up">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-[68px] w-[68px] items-center justify-center rounded-[24px] border border-[#e7e1d9] bg-white shadow-[0_14px_38px_rgba(67,50,87,0.12)]">
            <img src="/logo.svg" alt="Soop AI" className="h-12 w-12 rounded-xl" />
          </div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#a29a92]">Soop workspace</p>
          <h1 className="text-[28px] font-semibold tracking-[-0.05em] text-[#302b27] sm:text-[34px]">Добрый вечер, {firstName}</h1>
          <p className="mt-2 text-sm text-[#8b8580]">Что создадим сегодня?</p>
        </header>

        <div className="overflow-hidden rounded-[24px] border border-[#e4ded6] bg-white shadow-[0_22px_60px_rgba(63,48,85,0.11)] transition-shadow focus-within:border-[#ad98e7] focus-within:shadow-[0_22px_60px_rgba(103,80,164,0.17)]">
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void startChat(); } }} placeholder="Спросите, придумайте или создайте…" rows={3} className="w-full resize-none bg-transparent px-5 pb-3 pt-5 text-[15px] leading-6 text-[#302b27] outline-none placeholder:text-[#aaa39c]" />
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1"><button className="rounded-lg p-2 text-[#9b948c] transition-colors hover:bg-[#f5f2ed] hover:text-[#6750a4]" aria-label="Добавить контекст"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 5v14m7-7H5" /></svg></button><button className="rounded-lg p-2 text-[#9b948c] transition-colors hover:bg-[#f5f2ed] hover:text-[#6750a4]" aria-label="Настройки запроса"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7h10M18 7h2M4 17h2m4 0h10M14 4v6m-4 4v6" /></svg></button></div>
            <div className="flex items-center gap-2"><span className="hidden rounded-full bg-[#f3effc] px-2.5 py-1 text-[11px] font-medium text-[#6750a4] sm:inline">Opus · авто</span><button onClick={() => void startChat()} disabled={creating} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6750a4] text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#58428e] disabled:opacity-50" aria-label="Начать чат"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" /></svg></button></div>
          </div>
          <div className="flex items-center justify-between border-t border-[#f0ece6] bg-[#fcfbf9] px-5 py-2.5 text-[11px] text-[#9b948c]"><span>Личный AI-ассистент</span><span className="hidden sm:inline">Enter — отправить · Shift + Enter — новая строка</span></div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {starters.map((starter) => <button key={starter.title} onClick={() => { setPrompt(starter.title === "Собрать решение" ? "Помоги собрать решение" : starter.title); }} className="group rounded-2xl border border-[#ebe6df] bg-white/80 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-[#cbbce9] hover:shadow-[0_10px_28px_rgba(103,80,164,0.09)]"><span className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-[#f3effc] text-sm text-[#8064b4]">{starter.icon}</span><span className="block text-xs font-medium text-[#514a44]">{starter.title}</span><span className="mt-1 block text-[11px] leading-4 text-[#a29a92]">{starter.text}</span></button>)}
        </div>
      </section>
    </div>
  );
}
