"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ChatSession } from "@/types";

interface SidebarProps { isOpen: boolean; onToggle: () => void; onOpenSettings: () => void; onOpenUpgrade: () => void; currentPlan: string; daysLeft: number | null; }

const Icon = ({ children }: { children: React.ReactNode }) => <span className="flex h-4 w-4 items-center justify-center text-current">{children}</span>;

export function Sidebar({ isOpen, onToggle, onOpenSettings, onOpenUpgrade, currentPlan, daysLeft }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);

  useEffect(() => { void fetchSessions(); }, []);
  const fetchSessions = async () => { try { const response = await fetch("/api/sessions"); if (response.ok) setChats(await response.json()); } finally { setLoadingChats(false); } };
  const createNewChat = async () => {
    const response = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "New chat", model: "claude-opus-5" }) });
    if (!response.ok) return;
    const chat = await response.json(); setChats((items) => [chat, ...items]); router.push(`/chat/${chat.id}`); if (window.innerWidth < 768) onToggle();
  };
  const deleteChat = async (id: string, event: React.MouseEvent) => { event.preventDefault(); event.stopPropagation(); await fetch(`/api/sessions/${id}`, { method: "DELETE" }); setChats((items) => items.filter((chat) => chat.id !== id)); if (pathname === `/chat/${id}`) router.push("/"); };
  if (!isOpen) return null;

  return <aside className="flex h-full w-full flex-col overflow-hidden bg-[#111b2d] text-[#d7dfec] animate-slide-up md:animate-none">
    <div className="flex items-center justify-between px-5 pb-5 pt-6">
      <Link href="/" className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4662f0] shadow-[0_8px_20px_rgba(70,98,240,.32)]"><img src="/logo.svg" alt="" className="h-6 w-6 rounded-lg" /></span><span className="text-[15px] font-semibold tracking-[-0.02em] text-white">Soop AI</span></Link>
      <button onClick={onToggle} className="rounded-lg p-1.5 text-[#70809a] hover:bg-white/10 hover:text-white md:hidden" aria-label="Close sidebar"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={2} d="m6 18 12-12M6 6l12 12" /></svg></button>
    </div>
    <div className="px-4"><button onClick={createNewChat} className="flex w-full items-center justify-between rounded-xl bg-[#4662f0] px-3.5 py-3 text-sm font-medium text-white shadow-[0_10px_24px_rgba(70,98,240,.24)] transition-all hover:-translate-y-0.5 hover:bg-[#5670f5]"><span className="flex items-center gap-2"><Icon><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></Icon>New chat</span><span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] text-white/70">⌘ K</span></button></div>
    <nav className="space-y-1 px-3 pt-5"><Link href="/" className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] ${pathname === "/" ? "bg-white/10 font-medium text-white" : "text-[#91a0b6] hover:bg-white/5 hover:text-white"}`}><Icon><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" /></svg></Icon>Home</Link><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] text-[#91a0b6] hover:bg-white/5 hover:text-white"><Icon><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={1.7} d="M4 7h16M4 12h10M4 17h13" /></svg></Icon>Library</button></nav>
    <div className="mt-7 flex items-center justify-between px-5 text-[10px] font-semibold uppercase tracking-[.14em] text-[#6d7d96]"><span>Recent chats</span><span className="rounded bg-white/5 px-1.5 py-0.5">{chats.length}</span></div>
    <div className="flex-1 overflow-y-auto px-3 pt-2">{loadingChats ? <div className="px-3 py-2 text-xs text-[#718198]">Loading…</div> : chats.length === 0 ? <div className="px-3 py-2 text-xs leading-5 text-[#718198]">Your conversations will appear here.</div> : <div className="space-y-0.5">{chats.map((chat) => { const active = pathname === `/chat/${chat.id}`; return <div key={chat.id} className="group relative"><Link href={`/chat/${chat.id}`} onClick={() => { if (window.innerWidth < 768) onToggle(); }} className={`flex items-center gap-2 rounded-lg py-2 pl-3 pr-8 text-[13px] ${active ? "bg-white/10 text-white" : "text-[#91a0b6] hover:bg-white/5 hover:text-white"}`}><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" /><span className="truncate">{chat.title}</span></Link><button onClick={(event) => void deleteChat(chat.id, event)} className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded p-1 text-[#718198] hover:bg-white/10 hover:text-white group-hover:block" aria-label="Delete chat"><svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={2} d="m6 6 12 12M18 6 6 18" /></svg></button></div>; })}</div>}</div>
    <div className="border-t border-white/10 p-4"><button onClick={onOpenUpgrade} className="mb-4 w-full rounded-xl border border-[#38465f] bg-[#1b2941] p-3 text-left transition-colors hover:border-[#596b8c]"><div className="flex items-center justify-between"><span className="text-xs font-medium text-white">Unlock more power</span><span className="text-[#8fa5ff]">↗</span></div><p className="mt-1 text-[11px] leading-4 text-[#8291a8]">More models, more room to think.</p></button><div className="flex items-center gap-2"><button onClick={onOpenSettings} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 text-left hover:bg-white/5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d7b8ff] text-xs font-bold text-[#38225e]">{session?.user?.name?.charAt(0)?.toUpperCase() || "U"}</span><span className="min-w-0"><span className="block truncate text-xs font-medium text-white">{session?.user?.name || "Your account"}</span><span className="block truncate text-[10px] text-[#718198]">{currentPlan === "free" ? "Free plan" : `${currentPlan} · ${daysLeft ?? ""} days`}</span></span></button><button onClick={() => void signOut({ callbackUrl: "/login" })} className="rounded-lg p-2 text-[#718198] hover:bg-white/5 hover:text-white" title="Sign out"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={1.7} d="M17 16l4-4m0 0-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" /></svg></button></div></div>
  </aside>;
}
