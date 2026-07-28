"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ChatSession } from "@/types";

interface SidebarProps { isOpen: boolean; onToggle: () => void; onOpenSettings: () => void; onOpenUpgrade: () => void; currentPlan: string; daysLeft: number | null; }

export function Sidebar({ isOpen, onToggle, onOpenSettings, onOpenUpgrade, currentPlan, daysLeft }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);

  useEffect(() => { void fetchSessions(); }, []);
  const fetchSessions = async () => { try { const response = await fetch("/api/sessions"); if (response.ok) setChats(await response.json()); } finally { setLoadingChats(false); } };
  const createNewChat = async () => {
    try {
      const response = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Новый чат", model: "claude-opus-5" }) });
      if (!response.ok) return;
      const chat = await response.json(); setChats((items) => [chat, ...items]); router.push(`/chat/${chat.id}`);
      if (window.innerWidth < 768) onToggle();
    } catch {}
  };
  const deleteChat = async (id: string, event: React.MouseEvent) => { event.preventDefault(); event.stopPropagation(); try { await fetch(`/api/sessions/${id}`, { method: "DELETE" }); setChats((items) => items.filter((chat) => chat.id !== id)); if (pathname === `/chat/${id}`) router.push("/"); } catch {} };
  if (!isOpen) return null;

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-[#eeeae5] bg-[#f8f7f4] animate-slide-up md:animate-none">
      <div className="flex items-center justify-between px-3.5 pb-3 pt-4">
        <Link href="/" className="flex min-w-0 items-center gap-2"><img src="/logo.svg" alt="Soop AI" className="h-7 w-7 rounded-lg" /><span className="truncate text-sm font-semibold tracking-[-0.02em] text-[#302b27]">Soop AI</span></Link>
        <button onClick={onToggle} className="rounded-lg p-1.5 text-[#9b948c] hover:bg-[#eeebe6] md:hidden" aria-label="Закрыть меню"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 18 12-12M6 6l12 12" /></svg></button>
      </div>

      <div className="px-3 pb-4"><button onClick={createNewChat} className="flex w-full items-center gap-2 rounded-xl bg-[#6750a4] px-3 py-2.5 text-sm font-medium text-white shadow-[0_6px_16px_rgba(103,80,164,0.22)] transition-colors hover:bg-[#58428e]"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Новый чат</button></div>

      <nav className="px-2 pb-4"><Link href="/" className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${pathname === "/" ? "bg-[#ece7f6] font-medium text-[#58428e]" : "text-[#6f6861] hover:bg-[#efede9]"}`}><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m3 11 9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9z" /></svg>Главная</Link></nav>

      <div className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a29a92]">Недавние чаты</div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {loadingChats ? <div className="px-2.5 text-xs text-[#aaa39c]">Загрузка…</div> : chats.length === 0 ? <div className="px-2.5 text-xs leading-5 text-[#aaa39c]">Ваши диалоги появятся здесь.</div> : <div className="space-y-0.5">{chats.map((chat) => {
          const active = pathname === `/chat/${chat.id}`;
          return <div key={chat.id} className="group relative"><Link href={`/chat/${chat.id}`} onClick={() => { if (window.innerWidth < 768) onToggle(); }} className={`flex items-center gap-2 rounded-lg py-2 pl-2.5 pr-8 text-[13px] transition-colors ${active ? "bg-[#ece7f6] font-medium text-[#58428e]" : "text-[#6f6861] hover:bg-[#efede9]"}`}><svg className="h-3.5 w-3.5 shrink-0 text-[#a29a92]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg><span className="truncate">{chat.title}</span></Link><button onClick={(event) => deleteChat(chat.id, event)} className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-md p-1 text-[#a29a92] hover:bg-white hover:text-[#6d4fb1] group-hover:block" aria-label="Удалить чат"><svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 18 12-12M6 6l12 12" /></svg></button></div>;
        })}</div>}
      </div>

      <div className="border-t border-[#ebe7e1] p-3">
        {currentPlan === "free" ? <button onClick={onOpenUpgrade} className="mb-3 flex w-full items-center justify-between rounded-lg bg-[#fff5e9] px-2.5 py-2 text-[11px] font-medium text-[#a85d16] transition-colors hover:bg-[#ffedda]"><span>Открыть все модели</span><span>↗</span></button> : <div className="mb-3 flex justify-between rounded-lg bg-[#e8f5ed] px-2.5 py-2 text-[11px] font-medium text-[#287549]"><span>{currentPlan.toUpperCase()}</span>{daysLeft !== null && <span>{daysLeft} дн.</span>}</div>}
        <div className="flex items-center gap-2"><button onClick={onOpenSettings} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 text-left hover:bg-[#efede9]"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e6dafa] text-[11px] font-semibold text-[#60448e]">{session?.user?.name?.charAt(0)?.toUpperCase() || "U"}</span><span className="min-w-0"><span className="block truncate text-xs font-medium text-[#514a44]">{session?.user?.name || "Пользователь"}</span><span className="block truncate text-[10px] text-[#a29a92]">Настройки</span></span></button><button onClick={() => signOut({ callbackUrl: "/login" })} className="rounded-lg p-2 text-[#9b948c] hover:bg-[#efede9] hover:text-[#60448e]" title="Выйти"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m17 16 4-4m0 0-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg></button></div>
      </div>
    </aside>
  );
}
