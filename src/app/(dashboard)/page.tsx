"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-700" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-700" style={{ animationDelay: "150ms" }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-slate-700" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-full items-center justify-center px-4 py-8">
      <div className="max-w-2xl text-center animate-slide-up">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[32px] border border-white/80 bg-white/75 shadow-[0_22px_60px_rgba(80,93,120,0.18)] animate-float-slow">
          <img src="/logo.svg" alt="Soop AI" className="h-16 w-16 rounded-2xl" />
        </div>
        <h1 className="mb-3 text-4xl font-semibold tracking-tight text-slate-950">Soop AI</h1>
        <p className="mb-8 text-slate-500">
          Нажмите «Новый чат» в сайдбаре чтобы начать
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/80 bg-white/70 px-4 py-4 text-sm text-slate-700 shadow-[0_14px_40px_rgba(80,93,120,0.12)] transition-all duration-200 hover:-translate-y-1">
            Напиши код на Python
          </div>
          <div className="rounded-3xl border border-white/80 bg-white/70 px-4 py-4 text-sm text-slate-700 shadow-[0_14px_40px_rgba(80,93,120,0.12)] transition-all duration-200 hover:-translate-y-1">
            Объясни квантовую физику
          </div>
          <div className="rounded-3xl border border-white/80 bg-white/70 px-4 py-4 text-sm text-slate-700 shadow-[0_14px_40px_rgba(80,93,120,0.12)] transition-all duration-200 hover:-translate-y-1">
            Помоги с дизайном
          </div>
        </div>
      </div>
    </div>
  );
}
