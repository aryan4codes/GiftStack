"use client";

import Link from "next/link";
import { Show, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { SwiggyMCPBadge } from "@/components/SwiggyMCPBadge";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-semibold tracking-tight text-[var(--color-text)]"
        >
          GiftStack
        </Link>
        <div className="flex items-center gap-3">
          <SwiggyMCPBadge />
          <Show when="signed-in">
            <nav className="hidden items-center gap-4 text-sm md:flex">
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
