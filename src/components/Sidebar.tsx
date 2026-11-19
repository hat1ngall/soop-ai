"use client";

import { useLanguage } from "@/components/LanguageProvider";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ChatSession } from "@/types";

interface SidebarProps { isOpen: boolean; onToggle: () => void; onOpenSettings: () => void; onOpenUpgrade: () => void; currentPlan: string; daysLeft: number | null; }

export function Sidebar({ isOpen, onToggle, onOpenSettings, onOpenUpgrade, currentPlan, daysLeft }: SidebarProps) {
  const { t } = useLanguage();
  const pathname = usePathname(); const router = useRouter(); const { data: session } = useSession();
  const [chats, setChats] = useState<ChatSession[]>([]); const [loadingChats, setLoadingChats] = useState(true);
  useEffect(() => { fetch("/api/sessions").then((response) => response.ok ? response.json() : []).then(setChats).finally(() => setLoadingChats(false)); }, []);
  const createNewChat = async () => { const response = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "New chat", model: "claude-opus-5.5" }) }); if (!response.ok) return; const chat = await response.json(); setChats((items) => [chat, ...items]); router.push(`/chat/${chat.id}`); if (window.innerWidth < 768) onToggle(); };
  const deleteChat = async (id: string, event: React.MouseEvent) => { event.preventDefault(); event.stopPropagation(); await fetch(`/api/sessions/${id}`, { method: "DELETE" }); setChats((items) => items.filter((chat) => chat.id !== id)); if (pathname === `/chat/${id}`) router.push("/"); };
  if (!isOpen) return null;
  return (
    <aside className="reference-sidebar flex h-full w-full flex-col overflow-hidden bg-[#111b2d] text-[#d7dfec]">
      <div className="flex items-center justify-between px-5 pb-5 pt-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4662f0]">
            <img src="/logo.svg" alt="" className="h-6 w-6 rounded-lg" />
          </span>
          <span className="text-[15px] font-semibold text-white">Soop AI</span>
        </Link>
        <button
          onClick={onToggle}
          className="rounded-lg p-1.5 text-[#70809a] hover:bg-white/10 md:hidden"
          aria-label="Close sidebar"
        >
          ×
        </button>
      </div>

      <div className="px-4">
        <button
          onClick={createNewChat}
          className="flex w-full items-center rounded-xl bg-[#4662f0] px-3.5 py-3 text-sm font-medium text-white shadow-[0_10px_24px_rgba(70,98,240,.24)] hover:bg-[#5670f5]"
        >
          <span>{t("＋ Новый чат") }</span>
        </button>
      </div>

      <nav className="space-y-1 px-3 pt-5">
        <Link
          href="/"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] ${
            pathname === "/"
              ? "bg-white/10 font-medium text-white"
              : "text-[#91a0b6] hover:bg-white/5 hover:text-white"
          }`}
        >
          ⌂ <span>{t("Главная") }</span>
        </Link>
        <Link
          href="/planning"
          onClick={() => { if (window.innerWidth < 768) onToggle(); }}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] ${pathname === "/planning" ? "bg-white/10 font-medium text-white" : "text-[#91a0b6] hover:bg-white/5 hover:text-white"}`}
        >
          ◷ <span>{t("Планирование")}</span>
        </Link>
        <Link
          href="/plugins"
          onClick={() => { if (window.innerWidth < 768) onToggle(); }}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] ${pathname === "/plugins" ? "bg-white/10 font-medium text-white" : "text-[#91a0b6] hover:bg-white/5 hover:text-white"}`}
        >
          ✧ <span>{t("Плагины")}</span>
        </Link>
      </nav>

      <div className="mt-7 flex items-center justify-between px-5 text-[10px] font-semibold uppercase tracking-[.14em] text-[#6d7d96]">
        <span>{t("Недавние чаты") }</span>
        <span>{chats.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-2">
        {loadingChats ? (
          <div className="px-3 py-2 text-xs text-[#718198]">Loading…</div>
        ) : chats.length === 0 ? (
          <div className="px-3 py-2 text-xs text-[#718198]">{t("Здесь появятся ваши чаты.") }</div>
        ) : (
          chats.map((chat) => (
            <div key={chat.id} className="group relative">
              <Link
                href={`/chat/${chat.id}`}
                className={`block truncate rounded-lg px-3 py-2 text-[13px] ${
                  pathname === `/chat/${chat.id}`
                    ? "bg-white/10 text-white"
                    : "text-[#91a0b6] hover:bg-white/5 hover:text-white"
                }`}
              >
                {chat.title}
              </Link>
              <button
                onClick={(event) => void deleteChat(chat.id, event)}
                className="absolute right-1 top-1/2 hidden -translate-y-1/2 p-1 text-[#718198] group-hover:block"
                aria-label="Delete chat"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-white/10 p-4">
        {currentPlan === "free" ? (
          <button
            onClick={onOpenUpgrade}
            className="mb-4 w-full rounded-xl border border-[#38465f] bg-[#1b2941] p-3 text-left hover:border-[#596b8c]"
          >
            <div className="flex justify-between text-xs font-medium text-white">
              <span>{t("Открыть больше возможностей") }</span>
              <span>↗</span>
            </div>
            <p className="mt-1 text-[11px] text-[#8291a8]">{t("Больше моделей, больше места для идей.") }</p>
          </button>
        ) : (
          <div
            className={`mb-4 w-full rounded-xl border p-3 ${
              currentPlan === "pro"
                ? "border-emerald-400/35 bg-emerald-950/45"
                : currentPlan === "boost"
                ? "border-amber-400/35 bg-amber-950/45"
                : "border-violet-400/35 bg-violet-950/45"
            }`}
          >
            <div
              className={`flex items-center justify-between text-xs font-semibold uppercase tracking-[.08em] ${
                currentPlan === "pro"
                  ? "text-emerald-200"
                  : currentPlan === "boost"
                  ? "text-amber-200"
                  : "text-violet-200"
              }`}
            >
              <span>{currentPlan === "enterprise" ? "Enterprice" : currentPlan} plan</span>
              <span
                className={`h-2 w-2 rounded-full ${
                  currentPlan === "pro"
                    ? "bg-emerald-400"
                    : currentPlan === "boost"
                    ? "bg-amber-400"
                    : "bg-violet-400"
                }`}
              />
            </div>
            <p
              className={`mt-1 text-[11px] ${
                currentPlan === "pro"
                  ? "text-emerald-300"
                  : currentPlan === "boost"
                  ? "text-amber-300"
                  : "text-violet-300"
              }`}
            >
              Plan active{daysLeft !== null ? ` · ${daysLeft} days left` : ""}
            </p>
          </div>
        )}

        <div className="flex min-h-[54px] items-center gap-1.5">
          <button
            onClick={onOpenSettings}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 text-left transition-colors hover:bg-white/5"
            title="Настройки аккаунта"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#d7b8ff] text-xs font-bold text-[#38225e]">
              {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-white">
                {session?.user?.name || "Your account"}
              </span>
              <span className="block truncate text-[10px] text-[#718198]">
                {currentPlan === "free" ? "Free plan" : currentPlan === "enterprise" ? "Enterprice" : currentPlan}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#a7afc8] transition-colors hover:bg-white/10 hover:text-white"
            title="Настройки аккаунта"
            aria-label="Настройки аккаунта"
          >
            <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" strokeWidth="1.7" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M19.4 13.5a7.8 7.8 0 0 0 0-3l1.6-1.2-1.5-2.6-1.9.6a7.4 7.4 0 0 0-2.6-1.5L14.7 4h-3.4l-.3 1.8a7.4 7.4 0 0 0-2.6 1.5l-1.9-.6L5 9.3l1.6 1.2a7.8 7.8 0 0 0 0 3L5 14.7l1.5 2.6 1.9-.6a7.4 7.4 0 0 0 2.6 1.5l.3 1.8h3.4l.3-1.8a7.4 7.4 0 0 0 2.6-1.5l1.9.6 1.5-2.6-1.6-1.2Z" /></svg>
          </button>
          <button
            onClick={() => void signOut({ callbackUrl: "/login" })}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#718198] transition-colors hover:bg-rose-500/15 hover:text-rose-400"
            title="Выйти из аккаунта"
            aria-label="Выйти из аккаунта"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
