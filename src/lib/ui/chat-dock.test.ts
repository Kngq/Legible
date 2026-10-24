import { describe, expect, it } from "vitest";
import { chatDockHidden, hideChatDock, subscribeChatDock } from "./chat-dock";

describe("Ask Kiro launcher visibility", () => {
  it("shows by default, and the strongest hide wins until each is released", () => {
    expect(chatDockHidden()).toBeNull();
    const sheet = hideChatDock("narrow");
    expect(chatDockHidden()).toBe("narrow");
    const firstRun = hideChatDock("always");
    expect(chatDockHidden()).toBe("always");
    firstRun();
    expect(chatDockHidden()).toBe("narrow");
    sheet();
    expect(chatDockHidden()).toBeNull();
  });

  it("a release called twice does not unhide another screen's hide", () => {
    const a = hideChatDock();
    const b = hideChatDock();
    a();
    a();
    expect(chatDockHidden()).toBe("always");
    b();
    expect(chatDockHidden()).toBeNull();
  });

  it("tells subscribers on every change", () => {
    let calls = 0;
    const off = subscribeChatDock(() => calls++);
    hideChatDock()();
    off();
    expect(calls).toBe(2);
  });
});
