"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const prompts = ["Напиши код на Python", "Объясни квантовую физику", "Помоги с дизайном"];

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => { if (status === "unauthenticated") router.replace("/login"); }, [status, router]);
  if (status === "loading") return <div className="flex h-full items-center justify-center"><span className="h-5 w-5 animate-spin rounded-full border-2 border-[#d4d4d4] border-t-[#191919]" /></div>;
  if (!session) return null;

  return (
    <div className="flex h-full items-center justify-center px-5 py-10">
      <div className="max-w-2xl text-center animate-slide-up">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-[#e9e9e7] bg-white">
          <img src="/logo.svg" alt="Soop AI" className="h-10 w-10 rounded-lg" />
        </div>
        <h1 className="mb-2 text-3xl font-semibold tracking-[-0.04em] text-[#191919]">Добро пожаловать в Soop AI</h1>
        <p className="mb-8 text-sm text-[#787774]">Создайте новый чат, чтобы начать работу.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {prompts.map((prompt) => <div key={prompt} className="rounded-lg border border-[#e9e9e7] bg-white px-4 py-4 text-sm text-[#37352f] transition-colors hover:bg-[#f7f7f5]">{prompt}</div>)}
        </div>
      </div>
    </div>
  );
}
