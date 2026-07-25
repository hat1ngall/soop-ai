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
      <div className="flex h-full items-center justify-center bg-[#212121]">
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "0ms" }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "150ms" }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-full items-center justify-center bg-[#212121]">
      <div className="text-center">
        <img src="/logo.svg" alt="Soop AI" className="mx-auto mb-6 h-20 w-20 rounded-full" />
        <h1 className="mb-3 text-3xl font-semibold text-white">Soop AI</h1>
        <p className="mb-8 text-gray-400">
          Нажмите «Новый чат» в сайдбаре чтобы начать
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
            Напиши код на Python
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
            Объясни квантовую физику
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
            Помоги с дизайном
          </div>
        </div>
      </div>
    </div>
  );
}
