"use client";

import { usePathname } from "next/navigation";
import { ChatDock } from "./ChatDock";

const HIDDEN_PREFIXES = ["/login", "/signup", "/auth"];

export function ChatDockGate() {
  const pathname = usePathname();
  if (HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) return null;
  return <ChatDock />;
}
