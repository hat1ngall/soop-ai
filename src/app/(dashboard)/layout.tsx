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

  const handleUpgradeRequest = () => {
    setUpgradeOpen(true);
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0d0d]">
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60" style={{ animationDelay: "0ms" }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60" style={{ animationDelay: "150ms" }} />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0d0d0d] sm:flex-row">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - top on mobile, left on desktop */}
      <div className={`fixed inset-x-0 top-0 z-40 h-[260px] transform transition-transform duration-200 ease-in-out sm:inset-y-0 sm:inset-x-auto sm:h-full sm:w-[260px] sm:translate-x-0 ${
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
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-12 shrink-0 items-center border-b border-white/5 bg-[#0d0d0d] px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-hidden bg-[#0d0d0d]">
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
