"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/Sidebar";
import { SettingsModal } from "@/components/SettingsModal";
import { UpgradeModal } from "@/components/UpgradeModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState("free");
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (session) {
      fetch("/api/user/me")
        .then((res) => res.json())
        .then((data) => {
          setCurrentPlan(data.plan);
          setDaysLeft(data.daysLeft);
        })
        .catch(() => {});
    }
  }, [session]);

  useEffect(() => {
    const refreshAfterIdle = () => {
      if (document.visibilityState !== "visible") return;

      update();
      setSettingsOpen(false);
      setUpgradeOpen(false);
      setSidebarOpen(window.innerWidth >= 768);

      fetch("/api/user/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          setCurrentPlan(data.plan);
          setDaysLeft(data.daysLeft);
        })
        .catch(() => {});
    };

    document.addEventListener("visibilitychange", refreshAfterIdle);
    window.addEventListener("pageshow", refreshAfterIdle);

    return () => {
      document.removeEventListener("visibilitychange", refreshAfterIdle);
      window.removeEventListener("pageshow", refreshAfterIdle);
    };
  }, [update]);

  const handleUpgradeRequest = () => {
    setUpgradeOpen(true);
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
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
    <div className="flex h-screen flex-col overflow-hidden p-2 sm:flex-row sm:p-3">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/25 backdrop-blur-sm sm:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - top on mobile, left on desktop */}
      <div className={`fixed inset-x-2 top-2 z-40 h-[280px] transform transition-transform duration-300 ease-out sm:static sm:mr-3 sm:h-full sm:w-[278px] sm:translate-x-0 ${
        sidebarOpen ? "translate-y-0" : "-translate-y-full sm:-translate-x-full"
      }`}>
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenUpgrade={() => setUpgradeOpen(true)}
          currentPlan={currentPlan}
          daysLeft={daysLeft}
        />
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/55 shadow-[0_24px_80px_rgba(80,93,120,0.18)] backdrop-blur-2xl">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/45 px-3 backdrop-blur-xl sm:px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-2xl border border-slate-200/80 bg-white/70 p-2 text-slate-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:text-slate-900 active:translate-y-0"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 shadow-sm">
            Soop AI
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentPlan={currentPlan}
        daysLeft={daysLeft}
      />

      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
      />
    </div>
  );
}
