import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock syncCurrentUserEmail so tests do not need a real Clerk/DB context
vi.mock("@/lib/sync-user", () => ({
  syncCurrentUserEmail: vi.fn().mockResolvedValue(undefined),
}));

// ClerkProvider requires a real Clerk environment; replace with a passthrough
vi.mock("@clerk/nextjs", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// globals.css import would fail in the test environment
vi.mock("../../../app/globals.css", () => ({}));

import { syncCurrentUserEmail } from "@/lib/sync-user";
import RootLayout from "@/app/layout";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(syncCurrentUserEmail).mockResolvedValue(undefined);
});

describe("RootLayout", () => {
  it("calls syncCurrentUserEmail on every render", async () => {
    const jsx = await RootLayout({ children: <div>content</div> });
    render(jsx);
    expect(syncCurrentUserEmail).toHaveBeenCalledTimes(1);
  });

  it("renders children inside the layout", async () => {
    const jsx = await RootLayout({ children: <p data-testid="child">Hello</p> });
    render(jsx);
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders an <html> element with lang='en'", async () => {
    const jsx = await RootLayout({ children: <span>x</span> });
    render(jsx);
    // jsdom merges <html lang="en"> into the document root, so we check
    // the document element rather than the render container.
    expect(document.documentElement.lang).toBe("en");
  });

  it("does not throw when syncCurrentUserEmail resolves successfully", async () => {
    vi.mocked(syncCurrentUserEmail).mockResolvedValue(undefined);
    await expect(RootLayout({ children: <div /> })).resolves.not.toThrow();
  });

  it("propagates errors thrown by syncCurrentUserEmail", async () => {
    vi.mocked(syncCurrentUserEmail).mockRejectedValue(new Error("sync failed"));
    await expect(RootLayout({ children: <div /> })).rejects.toThrow("sync failed");
  });
});