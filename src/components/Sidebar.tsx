"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ChatSession } from "@/types";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
  onOpenUpgrade: () => void;
  currentPlan: string;
  daysLeft: number | null;
}

export function Sidebar({
  isOpen,
  onToggle,
  onOpenSettings,
  onOpenUpgrade,
  currentPlan,
  daysLeft,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch {
      console.error("Failed to load sessions");
    } finally {
      setLoadingChats(false);
    }
  };

  const createNewChat = async () => {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Новый чат", model: "gemini-flash-3.5" }),
      });
      if (res.ok) {
        const chat = await res.json();
        setChats((prev) => [chat, ...prev]);
        router.push(`/chat/${chat.id}`);
        if (window.innerWidth < 768) onToggle();
      }
    } catch {
      console.error("Failed to create chat");
    }
  };

  const deleteChat = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (pathname === `/chat/${id}`) {
        router.push("/");
      }
    } catch {
      console.error("Failed to delete chat");
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-[26px] border border-white/70 bg-white/60 shadow-[0_24px_70px_rgba(80,93,120,0.18)] backdrop-blur-2xl animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="Soop AI" className="h-9 w-9 rounded-2xl shadow-[0_10px_30px_rgba(79,70,229,0.16)]" />
          <div>
            <span className="block text-sm font-bold text-slate-900">Soop AI</span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">workspace</span>
          </div>
        </Link>
        <button
          onClick={onToggle}
          className="rounded-xl border border-slate-200/80 bg-white/60 p-1.5 text-slate-400 transition-all duration-200 hover:-translate-y-0.5 hover:text-slate-900 sm:hidden"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* New Chat */}
      <div className="px-3 pb-3">
        <button
          onClick={createNewChat}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-slate-950 px-3 py-3 text-xs font-semibold text-white shadow-[0_16px_35px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Новый чат
        </button>
      </div>

      {/* Chat history */}
      <nav className="flex-1 overflow-y-auto px-2.5 pb-2">
        {loadingChats ? (
          <div className="rounded-2xl border border-slate-200/70 bg-white/45 px-3 py-3 text-xs text-slate-400">Загрузка...</div>
        ) : chats.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white/35 px-3 py-5 text-center text-xs text-slate-400">Нет чатов</div>
        ) : (
          <div className="space-y-0.5">
            {chats.map((chat) => (
              <div key={chat.id} className="group relative">
                <Link
                  href={`/chat/${chat.id}`}
                  onClick={() => { if (window.innerWidth < 768) onToggle(); }}
                  className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 text-xs transition-all duration-200 ${
                    pathname === `/chat/${chat.id}`
                      ? "bg-slate-950 text-white shadow-[0_14px_35px_rgba(15,23,42,0.14)]"
                      : "text-slate-500 hover:translate-x-0.5 hover:bg-white/70 hover:text-slate-900"
                  }`}
                >
                  <svg className={`h-3.5 w-3.5 shrink-0 ${pathname === `/chat/${chat.id}` ? "text-white/60" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span className="truncate">{chat.title}</span>
                </Link>
                <button
                  onClick={(e) => deleteChat(chat.id, e)}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 hidden rounded p-1 transition-colors group-hover:block ${
                    pathname === `/chat/${chat.id}`
                      ? "text-white/50 hover:bg-white/15 hover:text-white"
                      : "text-slate-400 hover:bg-white/80 hover:text-slate-900"
                  }`}
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/70 bg-white/35 p-3">
        {currentPlan === "free" ? (
          <button
            onClick={onOpenUpgrade}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-orange-300 py-2.5 text-xs font-bold text-slate-950 shadow-[0_14px_30px_rgba(251,146,60,0.2)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Улучшить план
          </button>
        ) : (
          <div className="mb-3 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-emerald-700">{currentPlan.toUpperCase()}</span>
            </div>
            {daysLeft !== null && (
              <span className="text-[10px] text-emerald-600">{daysLeft} дн.</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-950 text-[10px] font-bold text-white shadow-sm">
            {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-900 truncate">{session?.user?.name}</div>
            <div className="truncate text-[10px] text-slate-400">{session?.user?.email}</div>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={onOpenSettings}
              className="rounded-xl p-1.5 text-slate-400 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/70 hover:text-slate-900"
              title="Настройки"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-xl p-1.5 text-slate-400 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/70 hover:text-slate-900"
              title="Выйти"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
