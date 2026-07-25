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
    <aside className="flex h-screen w-[280px] flex-col bg-[#171717]">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo.svg" alt="Soop AI" className="h-9 w-9 rounded-full" />
          <span className="text-base font-semibold text-white">Soop AI</span>
        </Link>
        <button
          onClick={onToggle}
          className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* New Chat button */}
      <div className="px-4 pb-4">
        <button
          onClick={createNewChat}
          className="flex w-full items-center gap-3 rounded-xl border border-white/20 px-4 py-3 text-sm text-white transition-all hover:bg-white/10"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Новый чат
        </button>
      </div>

      {/* Chat history */}
      <nav className="flex-1 overflow-y-auto px-3">
        <div className="mb-2 px-1 text-xs font-medium text-gray-500">
          Сегодня
        </div>
        {loadingChats ? (
          <div className="py-2 text-sm text-gray-500">Загрузка...</div>
        ) : chats.length === 0 ? (
          <div className="py-2 text-sm text-gray-500">Нет чатов</div>
        ) : (
          <div className="space-y-0.5">
            {chats.map((chat) => (
              <div key={chat.id} className="group relative">
                <Link
                  href={`/chat/${chat.id}`}
                  onClick={() => { if (window.innerWidth < 768) onToggle(); }}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    pathname === `/chat/${chat.id}`
                      ? "bg-white text-black"
                      : "text-gray-300 hover:bg-white/10"
                  }`}
                >
                  <svg className={`h-4 w-4 shrink-0 ${pathname === `/chat/${chat.id}` ? "text-black/50" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span className="truncate">{chat.title}</span>
                </Link>
                <button
                  onClick={(e) => deleteChat(chat.id, e)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 hidden rounded-lg p-1.5 transition-colors group-hover:block ${
                    pathname === `/chat/${chat.id}`
                      ? "text-black/50 hover:bg-black/10 hover:text-black"
                      : "text-gray-500 hover:bg-white/10 hover:text-gray-300"
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/10 p-4">
        {/* Plan info + Upgrade */}
        {currentPlan === "free" ? (
          <button
            onClick={onOpenUpgrade}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-black transition-all hover:bg-gray-200"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Улучшить план
          </button>
        ) : (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-green-500/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-green-400">{currentPlan.toUpperCase()}</span>
            </div>
            {daysLeft !== null && (
              <span className="text-xs text-gray-400">{daysLeft} дн.</span>
            )}
          </div>
        )}

        {/* User section */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-white">
            {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{session?.user?.name}</div>
            <div className="text-xs text-gray-500 truncate">{session?.user?.email}</div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenSettings}
              className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              title="Настройки"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              title="Выйти"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
