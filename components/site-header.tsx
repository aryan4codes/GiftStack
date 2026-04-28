"use client";

import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { SwiggyMCPBadge } from "@/components/SwiggyMCPBadge";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[#fff8f1]/82 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2 font-semibold tracking-tight text-[var(--color-text)]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-2xl bg-[var(--color-accent)] text-sm text-white shadow-[0_12px_28px_rgba(252,128,25,0.32)]">
            G
          </span>
          <span>GiftStack</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <SwiggyMCPBadge />
          </div>
          <Show when="signed-in">
            <nav className="hidden items-center gap-5 rounded-full border border-[var(--color-border)] bg-white/60 px-4 py-2 text-sm text-[var(--color-text-muted)] md:flex">
              <Link href="/create" className="hover:text-[var(--color-accent)]">
                Send a Gift
              </Link>
              <Link
                href="/dashboard"
                className="hover:text-[var(--color-accent)]"
              >
                Dashboard
              </Link>
              <Link href="/demo" className="hover:text-[var(--color-accent)]">
                Demo operator
              </Link>
            </nav>
            <UserButton appearance={{ variables: { colorPrimary: "#fc8019" } }} />
          </Show>
          <Show when="signed-out">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
          </Show>
        </div>
      </div>
    </header>
  );
}
