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
      <div className="fixed inset-0 bg-black/20 animate-fade-in" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-xl border border-[#e9e9e7] bg-white p-5 shadow-2xl sm:rounded-xl sm:p-6 animate-pop-in">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1.5 text-[#9b9a97] transition-colors hover:bg-[#f1f1ef] hover:text-[#191919] sm:right-4 sm:top-4"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="mb-5 text-lg font-semibold tracking-[-0.02em] text-[#191919] sm:mb-6">Настройки</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Имя</label>
          <input
            type="text"
            defaultValue={session?.user?.name || ""}
              className="w-full rounded-md border border-[#dcdcd8] bg-white px-3 py-2.5 text-sm text-[#191919] outline-none focus:border-[#9b9a97]"
          />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Email</label>
            <input
              type="email"
              defaultValue={session?.user?.email || ""}
              disabled
              className="w-full rounded-md border border-[#e9e9e7] bg-[#f7f7f5] px-3 py-2.5 text-sm text-[#787774]"
            />
          </div>

          <div className="rounded-lg border border-[#e9e9e7] bg-[#f7f7f5] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Текущий план</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                currentPlan === "free" ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-700"
              }`}>
                {currentPlan === "free" ? "Free" : currentPlan.toUpperCase()}
              </span>
            </div>
            {daysLeft !== null && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-slate-500">Осталось дней</span>
                <span className="text-sm font-semibold text-slate-900">{daysLeft}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-[#dcdcd8] bg-white px-4 py-3 text-sm font-medium text-[#55534f] transition-colors hover:bg-[#f7f7f5] hover:text-[#191919]"
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
