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
    <div className="flex h-screen overflow-hidden bg-[#fbfbfa]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 sm:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - top on mobile, left on desktop */}
      <div className={`fixed inset-y-0 left-0 z-40 w-[280px] transform transition-transform duration-200 ease-out md:static md:h-full md:shrink-0 md:overflow-hidden md:translate-x-0 md:transition-[width] ${
        sidebarOpen ? "translate-x-0 md:w-[272px]" : "-translate-x-full md:w-0"
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
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#e9e9e7] bg-white px-4 sm:px-5">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-2 text-[#787774] transition-colors hover:bg-[#f1f1ef] hover:text-[#191919]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-xs font-medium text-[#787774]">AI workspace</div>
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
