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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState("free");
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    const loadPlan = async () => {
      const response = await fetch("/api/user/me", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setCurrentPlan(data.plan);
      setDaysLeft(data.daysLeft);
    };
    void loadPlan();
  }, [status]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

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
    <div className="flex h-screen overflow-hidden bg-[#f5f6f8]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#101827]/30 backdrop-blur-sm sm:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - top on mobile, left on desktop */}
      <div className={`fixed inset-y-0 left-0 z-40 w-[280px] transform transition-transform duration-200 ease-out md:static md:h-full md:shrink-0 md:overflow-hidden md:translate-x-0 md:transition-[width] ${
        sidebarOpen ? "translate-x-0 md:w-[264px]" : "-translate-x-full md:w-0"
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
      <div className="m-0 flex min-w-0 flex-1 flex-col overflow-hidden bg-white md:my-3 md:mr-3 md:rounded-2xl md:border md:border-[#e2e6ec] md:shadow-[0_10px_40px_rgba(35,48,70,0.06)]">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#edf0f4] bg-white px-4 sm:px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 text-[#7a8799] transition-colors hover:bg-[#f2f4f7] hover:text-[#18212f]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2 text-xs font-medium text-[#7a8799]"><button onClick={() => setDarkMode((value) => !value)} className="rounded-lg border border-[#dfe4eb] px-2 py-1 text-xs hover:bg-[#f2f4f7] dark:border-slate-700 dark:hover:bg-slate-800" aria-label="Toggle theme">{darkMode ? "☀ Light" : "● Dark"}</button><span className="h-2 w-2 rounded-full bg-[#4dce91]" />Workspace</div>
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
        onActivated={(plan, days) => { setCurrentPlan(plan); setDaysLeft(days); }}
      />
    </div>
  );
}
