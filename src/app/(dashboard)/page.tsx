"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const suggestions = [
  { icon: "✦", label: "Придумать идею" },
  { icon: "◫", label: "Разобрать документ" },
  { icon: "⌘", label: "Написать код" },
];

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [prompt, setPrompt] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => { if (status === "unauthenticated") router.replace("/login"); }, [status, router]);

  const startChat = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: prompt.trim().slice(0, 42) || "Новый чат", model: "claude-opus-5" }),
      });
      if (!response.ok) return;
      const chat = await response.json();
      if (prompt.trim()) sessionStorage.setItem("soop:pending-prompt", prompt.trim());
      router.push(`/chat/${chat.id}`);
    } finally { setCreating(false); }
  };

  if (status === "loading") return <div className="flex h-full items-center justify-center"><span className="h-5 w-5 animate-spin rounded-full border-2 border-[#d8d3cc] border-t-[#6750a4]" /></div>;
  if (!session) return null;

  const displayName = session.user?.name?.split(" ")[0] || "друг";
  return (
    <div className="relative flex h-full items-center justify-center overflow-y-auto px-5 py-12 sm:px-8">
      <div className="pointer-events-none absolute left-[20%] top-[22%] h-56 w-56 rounded-full bg-[#eee6ff]/30 blur-3xl" />
      <section className="relative w-full max-w-[650px] animate-slide-up">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#e7e1d9] bg-[#fffefd] shadow-[0_12px_35px_rgba(67,50,87,0.10)]">
            <img src="/logo.svg" alt="Soop AI" className="h-11 w-11 rounded-xl" />
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-[#302b27] sm:text-3xl">Привет, {displayName}</h1>
          <p className="mt-2 text-sm text-[#8b8580]">С чего начнём сегодня?</p>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#e4ded6] bg-white shadow-[0_20px_55px_rgba(63,48,85,0.10)] transition-shadow focus-within:border-[#aa95e8] focus-within:shadow-[0_20px_55px_rgba(103,80,164,0.16)]">
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); startChat(); } }} placeholder="Спросите, придумайте или создайте…" rows={3} className="w-full resize-none bg-transparent px-5 pb-3 pt-5 text-[15px] leading-6 text-[#302b27] outline-none placeholder:text-[#aaa39c]" />
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              <button className="rounded-lg p-2 text-[#9b948c] transition-colors hover:bg-[#f5f2ed] hover:text-[#6750a4]" aria-label="Добавить контекст"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 5v14m7-7H5" /></svg></button>
              <button className="rounded-lg p-2 text-[#9b948c] transition-colors hover:bg-[#f5f2ed] hover:text-[#6750a4]" aria-label="Настроить запрос"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7h10M18 7h2M4 17h2m4 0h10M14 4v6m-4 4v6" /></svg></button>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-[#f3effc] px-2.5 py-1 text-[11px] font-medium text-[#6750a4] sm:inline">Опус · авто</span>
              <button onClick={startChat} disabled={creating} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6750a4] text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#58428e] disabled:opacity-50" aria-label="Начать чат">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" /></svg>
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-[#f0ece6] bg-[#fcfbf9] px-5 py-2.5 text-[11px] text-[#9b948c]">
            <span>Личный AI-ассистент</span><span className="hidden sm:inline">Enter — отправить · Shift + Enter — новая строка</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-x-2 gap-y-2">
          {suggestions.map((item) => <button key={item.label} onClick={() => setPrompt(item.label === "Написать код" ? "Помоги написать код" : item.label)} className="rounded-full border border-[#ebe6df] bg-white/70 px-3 py-1.5 text-xs text-[#776e67] transition-all hover:-translate-y-0.5 hover:border-[#cbbce9] hover:text-[#6750a4]"><span className="mr-1.5 text-[#a281d4]">{item.icon}</span>{item.label}</button>)}
        </div>
      </section>
    </div>
  );
}
