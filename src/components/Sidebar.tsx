"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ChatSession } from "@/types";

interface SidebarProps {
  isOpen: boolean; onToggle: () => void; onOpenSettings: () => void; onOpenUpgrade: () => void;
  currentPlan: string; daysLeft: number | null;
}

export function Sidebar({ isOpen, onToggle, onOpenSettings, onOpenUpgrade, currentPlan, daysLeft }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);

  useEffect(() => { fetchSessions(); }, []);
  const fetchSessions = async () => { try { const res = await fetch("/api/sessions"); if (res.ok) setChats(await res.json()); } finally { setLoadingChats(false); } };
  const createNewChat = async () => {
    try {
      const res = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Новый чат", model: "gemini-flash-3.5" }) });
      if (!res.ok) return;
      const chat = await res.json(); setChats((previous) => [chat, ...previous]); router.push(`/chat/${chat.id}`);
      if (window.innerWidth < 768) onToggle();
    } catch { /* UI remains usable if the request fails */ }
  };
  const deleteChat = async (id: string, event: React.MouseEvent) => {
    event.preventDefault(); event.stopPropagation();
    try { await fetch(`/api/sessions/${id}`, { method: "DELETE" }); setChats((previous) => previous.filter((chat) => chat.id !== id)); if (pathname === `/chat/${id}`) router.push("/"); } catch {}
  };
  if (!isOpen) return null;

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-[#e9e9e7] bg-[#f7f7f5] animate-slide-up md:animate-none">
      <div className="flex items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="Soop AI" className="h-7 w-7 rounded-md" />
          <span className="text-sm font-semibold tracking-[-0.02em] text-[#191919]">Soop AI</span>
        </Link>
        <button onClick={onToggle} className="rounded-md p-1.5 text-[#787774] hover:bg-[#e9e9e7] hover:text-[#191919] md:hidden" aria-label="Закрыть меню">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="px-3 pb-4">
        <button onClick={createNewChat} className="flex w-full items-center gap-2 rounded-md bg-[#191919] px-3 py-2.5 text-left text-sm font-medium text-white transition-colors hover:bg-[#37352f]">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Новый чат
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        <div className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#9b9a97]">Недавние</div>
        {loadingChats ? <div className="px-2 text-sm text-[#9b9a97]">Загрузка…</div> : chats.length === 0 ? <div className="px-2 text-sm text-[#9b9a97]">Здесь появятся ваши чаты</div> : (
          <div className="space-y-0.5">
            {chats.map((chat) => {
              const active = pathname === `/chat/${chat.id}`;
              return <div key={chat.id} className="group relative">
                <Link href={`/chat/${chat.id}`} onClick={() => { if (window.innerWidth < 768) onToggle(); }} className={`flex items-center gap-2 rounded-md py-2 pl-2 pr-8 text-sm transition-colors ${active ? "bg-[#e9e9e7] font-medium text-[#191919]" : "text-[#55534f] hover:bg-[#ececea]"}`}>
                  <svg className="h-3.5 w-3.5 shrink-0 text-[#9b9a97]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  <span className="truncate">{chat.title}</span>
                </Link>
                <button onClick={(event) => deleteChat(chat.id, event)} className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded p-1 text-[#9b9a97] hover:bg-white hover:text-[#191919] group-hover:block" aria-label="Удалить чат">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 18 12-12M6 6l12 12" /></svg>
                </button>
              </div>;
            })}
          </div>
        )}
      </nav>

      <div className="border-t border-[#e9e9e7] p-3">
        {currentPlan === "free" ? (
          <button onClick={onOpenUpgrade} className="mb-3 flex w-full items-center justify-between rounded-md border border-[#e0dfdc] bg-white px-3 py-2 text-xs font-medium text-[#55534f] transition-colors hover:bg-[#f1f1ef]">
            <span>Открыть больше моделей</span><span className="text-[#c96b00]">↗</span>
          </button>
        ) : <div className="mb-3 flex items-center justify-between rounded-md bg-[#e8f3ec] px-3 py-2 text-xs text-[#287648]"><span>{currentPlan.toUpperCase()}</span>{daysLeft !== null && <span>{daysLeft} дн.</span>}</div>}
        <div className="flex items-center gap-2">
          <button onClick={onOpenSettings} className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 text-left hover:bg-[#ececea]">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#191919] text-[11px] font-semibold text-white">{session?.user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
            <span className="min-w-0"><span className="block truncate text-xs font-medium text-[#37352f]">{session?.user?.name || "Пользователь"}</span><span className="block truncate text-[11px] text-[#9b9a97]">Настройки</span></span>
          </button>
          <button onClick={() => signOut({ callbackUrl: "/login" })} className="rounded-md p-2 text-[#9b9a97] hover:bg-[#ececea] hover:text-[#191919]" title="Выйти">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
