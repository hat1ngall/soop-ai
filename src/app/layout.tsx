import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Soop AI",
  description: "AI Chat Interface",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Soop AI",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d0d0d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
      </head>
      <body className={`${inter.className} min-h-screen bg-[#f5efe6] text-slate-900 antialiased`}>
        <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(245,239,230,0.98)_35%,_rgba(232,240,255,0.9)_100%)]">
          <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35 [mask-image:radial-gradient(circle_at_center,black,transparent_85%)]" />
          <div className="pointer-events-none fixed left-[-10%] top-[-8%] -z-10 h-72 w-72 rounded-full bg-amber-300/25 blur-3xl animate-pulse-glow" />
          <div className="pointer-events-none fixed right-[-8%] top-[15%] -z-10 h-80 w-80 rounded-full bg-sky-300/25 blur-3xl animate-pulse-glow" style={{ animationDelay: "-2s" }} />
          <div className="pointer-events-none fixed bottom-[-12%] left-[20%] -z-10 h-80 w-80 rounded-full bg-violet-300/20 blur-3xl animate-pulse-glow" style={{ animationDelay: "-4s" }} />
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
