"use client";

import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { SwiggyMCPBadge } from "@/components/SwiggyMCPBadge";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { FadeIn } from "@/components/magicui/fade-in";
import { AnimatedNumber } from "@/components/magicui/animated-number";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg)]/90 px-4 py-4 backdrop-blur-sm sm:px-8">
        <span className="font-semibold">GiftStack</span>
        <SwiggyMCPBadge />
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-3xl flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-[var(--color-text)] sm:text-6xl">
          Gift an experience.
          <br />
          <span className="text-[var(--color-text-muted)]">Not a voucher.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-[var(--color-text-muted)]">
          Send a Swiggy dinner, hamper, or food credit in 30 seconds. Recipient
          picks what they want.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Show when="signed-in">
            <Link href="/create">
              <ShimmerButton>Send a Gift →</ShimmerButton>
            </Link>
          </Show>
          <Show when="signed-out">
            <Link href="/sign-in">
              <ShimmerButton>Send a Gift →</ShimmerButton>
            </Link>
          </Show>
          <p className="text-sm text-[var(--color-text-muted)]">
            <AnimatedNumber value={1284} />+ treats queued (demo)
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-8 px-6 pb-24 md:grid-cols-3">
        {[
          { t: "Create", d: "Describe your intent in plain English." },
          { t: "Choose", d: "They pick dine-out, hamper, or food credit." },
          {
            t: "Experience",
            d: "Fulfilled on Swiggy — powered by MCP-shaped cached data.",
          },
        ].map((s, i) => (
          <FadeIn key={s.t} delayMs={i * 120}>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-left shadow-sm">
              <h3 className="font-medium text-[var(--color-text)]">{s.t}</h3>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">{s.d}</p>
            </div>
          </FadeIn>
        ))}
      </section>

      <footer className="border-t border-[var(--color-border)] py-10 text-center">
        <SwiggyMCPBadge />
        <div className="mt-6 space-x-4 text-sm">
          <Show when="signed-in">
            <Link href="/dashboard" className="text-[var(--color-accent)] underline-offset-4 hover:underline">
              Dashboard
            </Link>
          </Show>
          <Show when="signed-out">
            <Link href="/sign-in">
              <Button variant="outline" size="sm">
                Sign in to send
              </Button>
            </Link>
          </Show>
        </div>
      </footer>
    </div>
  );
}
