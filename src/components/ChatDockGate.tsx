"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { chatDockHidden, subscribeChatDock } from "@/lib/ui/chat-dock";
import { ChatDock } from "./ChatDock";

const HIDDEN_PREFIXES = ["/login", "/signup", "/auth"];

export function ChatDockGate() {
  const pathname = usePathname();
  // First run and phone-width sheets hide the launcher; it stays mounted so a conversation survives.
  const hidden = useSyncExternalStore(subscribeChatDock, chatDockHidden, () => null);
  if (HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) return null;
  return <ChatDock hidden={hidden} />;
}
