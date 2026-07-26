"use client";

import { useSession, signOut } from "next-auth/react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: string;
  daysLeft: number | null;
}

export function SettingsModal({ isOpen, onClose, currentPlan, daysLeft }: SettingsModalProps) {
  const { data: session } = useSession();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 animate-fade-in">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-white/10 bg-[#2f2f2f] p-5 shadow-2xl sm:rounded-2xl sm:p-6 animate-pop-in">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white sm:right-4 sm:top-4"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="mb-5 text-lg font-semibold text-white sm:mb-6">Настройки</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-gray-400">Имя</label>
          <input
            type="text"
            defaultValue={session?.user?.name || ""}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 focus:border-white/30 focus:bg-white/10"
          />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-gray-400">Email</label>
            <input
              type="email"
              defaultValue={session?.user?.email || ""}
              disabled
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-gray-500"
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Текущий план</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                currentPlan === "free" ? "bg-white/10 text-gray-300" : "bg-green-500/20 text-green-400"
              }`}>
                {currentPlan === "free" ? "Free" : currentPlan.toUpperCase()}
              </span>
            </div>
            {daysLeft !== null && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-gray-400">Осталось дней</span>
                <span className="text-sm text-white">{daysLeft}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-400 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/5 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  );
}
