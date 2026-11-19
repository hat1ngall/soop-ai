"use client";

import { LanguageProvider } from "./LanguageProvider";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus>
      <LanguageProvider>{children}</LanguageProvider>
    </SessionProvider>
  );
}
