"use client";

import Link from "next/link";
import { Show } from "@clerk/nextjs";
import { ArrowRight, ChefHat, Gift, Sparkles, UtensilsCrossed } from "lucide-react";
import { SwiggyMCPBadge } from "@/components/SwiggyMCPBadge";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { FadeIn } from "@/components/magicui/fade-in";
import { AnimatedNumber } from "@/components/magicui/animated-number";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="hero-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem] opacity-70" />

      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[#fff8f1]/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
          <Link
            href="/"
            className="group flex items-center gap-2 font-semibold tracking-tight text-[var(--color-text)]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[var(--color-accent)] text-sm text-white shadow-[0_12px_28px_rgba(252,128,25,0.32)]">
              G
            </span>
            <span>GiftStack</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <SwiggyMCPBadge />
            <Show when="signed-in">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </Show>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/70 px-4 py-1.5 text-xs font-medium text-[var(--color-text-muted)] shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
              Swiggy dine-out · Instamart · food credit
            </p>
            <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-[var(--color-ink)] sm:text-5xl lg:text-6xl">
              Gift an experience.
              <br />
              <span className="text-[var(--color-text-muted)]">Not another voucher.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--color-text-muted)]">
              Describe the moment in plain English. We turn it into three beautiful
              choices - restaurant, hamper, or food credit.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Show when="signed-in">
                <Link href="/create" className="inline-flex">
                  <ShimmerButton className="px-8">
                    Send a gift
                    <ArrowRight className="ml-1 inline h-4 w-4" aria-hidden />
                  </ShimmerButton>
                </Link>
              </Show>
              <Show when="signed-out">
                <Link href="/sign-in" className="inline-flex">
                  <ShimmerButton className="px-8">
                    Sign in to send
                    <ArrowRight className="ml-1 inline h-4 w-4" aria-hidden />
                  </ShimmerButton>
                </Link>
              </Show>
              <p className="text-sm text-[var(--color-text-muted)] sm:pl-2">
                <AnimatedNumber value={1284} />+ demo gifts crafted
              </p>
            </div>

            <div className="mt-14 grid gap-4 sm:grid-cols-3">
              {[
                { n: "30s", l: "intent to link" },
                { n: "3", l: "recipient choices" },
                { n: "1", l: "budget to respect" },
              ].map((s) => (
                <div
                  key={s.l}
                  className="rounded-2xl border border-[var(--color-border)] bg-white/65 px-5 py-4 shadow-sm backdrop-blur"
                >
                  <p className="font-display text-2xl font-semibold text-[var(--color-accent)]">
                    {s.n}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                    {s.l}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="glass-panel soft-ring relative overflow-hidden rounded-[2rem] p-8 sm:p-10">
              <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[var(--color-accent)]/15 blur-3xl" />
              <div className="relative space-y-6">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-accent-soft)]">
                    <Gift className="h-6 w-6 text-[var(--color-accent)]" aria-hidden />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                      Sender flow
                    </p>
                    <p className="mt-1 font-display text-xl text-[var(--color-ink)]">
                      “Client dinner in Mumbai, ~₹2000, says thanks without being loud.”
                    </p>
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
                <ul className="space-y-4 text-sm text-[var(--color-text-muted)]">
                  <li className="flex gap-3">
                    <ChefHat className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                    Ranked dine-out pick with a one-line pitch
                  </li>
                  <li className="flex gap-3">
                    <UtensilsCrossed className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                    Food credit with an agent that shops the cached menu
                  </li>
                  <li className="flex gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                    Instamart hamper built to fit the budget envelope
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <section className="mx-auto mt-20 max-w-5xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            How it works
          </p>
          <h2 className="font-display mx-auto mt-3 max-w-xl text-center text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
            From messy intent to a tidy gift link.
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                t: "Speak freely",
                d: "Birthdays, thanks, client wins — we parse city, budget, and tone.",
              },
              {
                t: "Three curated paths",
                d: "Each option is a real Swiggy-shaped choice, not a fake coupon grid.",
              },
              {
                t: "They unwrap the pick",
                d: "Recipients land on a cinematic page and redeem in-flow (demo).",
              },
            ].map((s, i) => (
              <FadeIn key={s.t} delayMs={i * 100}>
                <div className="h-full rounded-3xl border border-[var(--color-border)] bg-white/70 p-8 shadow-sm backdrop-blur">
                  <p className="text-xs font-semibold text-[var(--color-accent)]">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-3 font-display text-xl text-[var(--color-ink)]">{s.t}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    {s.d}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>
      </section>

      <footer className="border-t border-[var(--color-border)] bg-white/40 py-14 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 text-center sm:flex-row sm:justify-between sm:px-8 sm:text-left">
          <SwiggyMCPBadge />
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Show when="signed-in">
              <Link
                href="/create"
                className="font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
              >
                Create
              </Link>
              <Link
                href="/dashboard"
                className="font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
              >
                Dashboard
              </Link>
            </Show>
            <Show when="signed-out">
              <Button variant="outline" size="sm" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </Show>
          </div>
        </div>
      </footer>
    </div>
  );
}
