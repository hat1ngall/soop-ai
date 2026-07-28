"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const starters = [
  { icon: "✦", title: "Spark an idea", text: "Start from a blank page" },
  { icon: "▱", title: "Read a document", text: "Find what matters fast" },
  { icon: "⌘", title: "Build a solution", text: "Turn a thought into a plan" },
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
    try { const text = value.trim(); const response = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: text.slice(0, 42) || "New chat", model: "claude-opus-5" }) }); if (!response.ok) return; const chat = await response.json(); if (text) sessionStorage.setItem("soop:pending-prompt", text); router.push(`/chat/${chat.id}`); } finally { setCreating(false); }
  };
  if (status === "loading") return <div className="flex h-full items-center justify-center"><span className="h-5 w-5 animate-spin rounded-full border-2 border-[#d5dbe5] border-t-[#4662f0]" /></div>;
  if (!session) return null;
  const firstName = session.user?.name?.split(" ")[0] || "there";
  return <div className="relative flex h-full items-center justify-center overflow-y-auto px-5 py-12 sm:px-8"><div className="pointer-events-none absolute left-[14%] top-[15%] h-72 w-72 rounded-full bg-[#e9edff] blur-3xl" /><div className="pointer-events-none absolute bottom-[8%] right-[12%] h-56 w-56 rounded-full bg-[#fff0db] blur-3xl" /><section className="relative w-full max-w-[720px] animate-slide-up"><header className="mb-8 text-center"><div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-[22px] border border-[#e2e6ec] bg-white shadow-[0_14px_36px_rgba(35,48,70,.10)]"><img src="/logo.svg" alt="Soop AI" className="h-12 w-12 rounded-xl" /></div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#8995a7]">Your AI workspace</p><h1 className="text-[30px] font-semibold tracking-[-.055em] text-[#18212f] sm:text-[38px]">Good evening, {firstName}</h1><p className="mt-2 text-sm text-[#8290a3]">Bring a question, a file, or a half-formed idea.</p></header><div className="overflow-hidden rounded-2xl border border-[#dfe4eb] bg-white shadow-[0_22px_65px_rgba(35,48,70,.10)] transition-all focus-within:border-[#91a4f7] focus-within:shadow-[0_22px_65px_rgba(70,98,240,.16)]"><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void startChat(); } }} placeholder="What would you like to work on?" rows={3} className="w-full resize-none bg-transparent px-5 pb-3 pt-5 text-[15px] leading-6 text-[#18212f] outline-none placeholder:text-[#a1acba]" /><div className="flex items-center justify-between px-3 pb-3"><div className="flex items-center gap-1"><button className="rounded-lg p-2 text-[#8290a3] hover:bg-[#f2f4f7] hover:text-[#4662f0]" aria-label="Add context"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={1.8} d="M12 5v14m7-7H5" /></svg></button><button className="rounded-lg p-2 text-[#8290a3] hover:bg-[#f2f4f7] hover:text-[#4662f0]" aria-label="Tune request"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={1.8} d="M4 7h10M18 7h2M4 17h2m4 0h10M14 4v6m-4 4v6" /></svg></button></div><div className="flex items-center gap-2"><span className="hidden rounded-full bg-[#eef1ff] px-2.5 py-1 text-[11px] font-semibold text-[#4662f0] sm:inline">Opus · Auto</span><button onClick={() => void startChat()} disabled={creating} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4662f0] text-white shadow-[0_6px_14px_rgba(70,98,240,.25)] transition-all hover:-translate-y-0.5 hover:bg-[#3857e8] disabled:opacity-50" aria-label="Start chat"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" /></svg></button></div></div><div className="flex items-center justify-between border-t border-[#edf0f4] bg-[#fbfcfd] px-5 py-2.5 text-[11px] text-[#8995a7]"><span>Private by default</span><span className="hidden sm:inline">Enter to send · Shift + Enter for a new line</span></div></div><div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">{starters.map((starter) => <button key={starter.title} onClick={() => setPrompt(starter.title)} className="group rounded-2xl border border-[#e2e6ec] bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-[#b6c1f7] hover:shadow-[0_10px_28px_rgba(70,98,240,.09)]"><span className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-[#eef1ff] text-sm text-[#4662f0]">{starter.icon}</span><span className="block text-xs font-semibold text-[#334155]">{starter.title}</span><span className="mt-1 block text-[11px] leading-4 text-[#8995a7]">{starter.text}</span></button>)}</div></section></div>;
}
