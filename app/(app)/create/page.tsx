"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { AnimatedNumber } from "@/components/magicui/animated-number";
import { GiftCard } from "@/components/GiftCard";
import type { GiftOptionsPayload, ParsedIntent } from "@/types/gift";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Gift,
  IndianRupee,
  Mail,
  MapPin,
  MessageSquareText,
  PartyPopper,
  Sparkles,
  User,
  Wand2,
  Zap,
} from "lucide-react";

export default function CreateGiftPage() {
  const [input, setInput] = React.useState("");
  const [parsed, setParsed] = React.useState<ParsedIntent | null>(null);
  const [pending, setPending] = React.useState(false);
  const [parseError, setParseError] = React.useState<string | null>(null);

  const [options, setOptions] = React.useState<GiftOptionsPayload | null>(null);
  const [loadingOptions, setLoadingOptions] = React.useState(false);
  const [optionsError, setOptionsError] = React.useState<string | null>(null);

  const [recipientName, setRecipientName] = React.useState("");
  const [recipientEmail, setRecipientEmail] = React.useState("");

  const [giftUrl, setGiftUrl] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const optionsSectionRef = React.useRef<HTMLElement>(null);
  const linkSectionRef = React.useRef<HTMLElement>(null);

  /** When city / budget / occasion change, drop cached previews so rails never show stale ₹ amounts. */
  const intentFingerprint = React.useMemo(() => {
    if (!parsed) return null;
    return `${parsed.city}|${parsed.budget_paise}|${parsed.occasion}`;
  }, [parsed]);

  React.useEffect(() => {
    setOptions(null);
    setOptionsError(null);
    setCreateError(null);
    setGiftUrl(null);
  }, [intentFingerprint]);

  // ── Auto-parse intent with abort controller for race safety ──
  React.useEffect(() => {
    if (!input.trim()) {
      setParsed(null);
      setParseError(null);
      return;
    }

    const controller = new AbortController();

    const t = setTimeout(async () => {
      setPending(true);
      setParseError(null);
      try {
        const res = await fetch("/api/parse-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: input }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Parse failed (${res.status})`);
        }
        const data = await res.json();
        if (!controller.signal.aborted) {
          setParsed(data);
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setParseError(e instanceof Error ? e.message : "Parse failed");
          setParsed(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setPending(false);
        }
      }
    }, 700);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [input]);

  async function previewOptions() {
    if (!parsed) return;
    setLoadingOptions(true);
    setOptions(null);
    setOptionsError(null);
    try {
      const res = await fetch("/api/rank-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: parsed.city,
          budget_paise: parsed.budget_paise,
          occasion: parsed.occasion,
          message: parsed.message_draft,
          tone: parsed.tone,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to build options (${res.status})`);
      }
      const data = await res.json();
      if (!data.options) {
        throw new Error("No options returned from the API");
      }
      setOptions(data.options);
      setTimeout(() => {
        optionsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e) {
      setOptionsError(e instanceof Error ? e.message : "Failed to build options");
    } finally {
      setLoadingOptions(false);
    }
  }

  async function sendGift() {
    if (!parsed) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/gifts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parsed,
          options,
          recipient_name: recipientName.trim() || undefined,
          recipient_email: recipientEmail.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to create gift (${res.status})`);
      }
      const data = await res.json();
      if (data.giftUrl) {
        setGiftUrl(data.giftUrl);
        setTimeout(() => {
          linkSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create gift");
    } finally {
      setCreating(false);
    }
  }

  function copyUrl() {
    if (!giftUrl) return;
    navigator.clipboard.writeText(giftUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const step = giftUrl ? 4 : options ? 3 : parsed ? 2 : 1;

  return (
    <div className="mx-auto max-w-5xl space-y-14 pb-24">
      {/* ─── Page header ─── */}
      <div className="max-w-2xl">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-accent)]">
          <Wand2 className="h-4 w-4" aria-hidden />
          Gift composer
        </p>
        <h1 className="font-display mt-3 text-4xl font-semibold leading-tight tracking-tight text-[var(--color-ink)] sm:text-5xl">
          Craft something
          <br />
          <span className="text-[var(--color-text-muted)]">
            they&apos;ll actually love.
          </span>
        </h1>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-[var(--color-text-muted)]">
          Describe the occasion in your own words. We parse budget, city, and
          tone with AI, then build three real options from the Swiggy cache.
        </p>
      </div>

      {/* ─── Progress stepper ─── */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, l: "Describe" },
          { n: 2, l: "Preview" },
          { n: 3, l: "Options" },
          { n: 4, l: "Share" },
        ].map((s, i) => (
          <React.Fragment key={s.n}>
            {i > 0 && (
              <div
                className={`h-px flex-1 transition-colors duration-500 ${
                  step > s.n - 1
                    ? "bg-[var(--color-accent)]"
                    : "bg-[var(--color-border)]"
                }`}
              />
            )}
            <div className="flex items-center gap-2">
              <span
                className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition-all duration-300 ${
                  step >= s.n
                    ? "bg-[var(--color-accent)] text-white shadow-[0_8px_18px_rgba(252,128,25,0.3)]"
                    : "border border-[var(--color-border)] bg-white text-[var(--color-text-muted)]"
                }`}
              >
                {step > s.n ? <Check className="h-3.5 w-3.5" /> : s.n}
              </span>
              <span className="hidden text-xs font-medium text-[var(--color-text-muted)] sm:inline">
                {s.l}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* ─── Composer + Live preview ─── */}
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        {/* Left: input */}
        <div className="space-y-6">
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={5}
              placeholder='e.g. "Thank-you for a client in Mumbai who helped ship v1 — around ₹1,500, keep it warm but professional"'
              className="resize-none rounded-2xl border-[var(--color-border)] bg-white/95 px-5 py-4 text-base leading-relaxed shadow-[0_8px_32px_rgba(80,45,20,0.06)] placeholder:text-[var(--color-text-faint)] focus:shadow-[0_0_0_3px_rgba(252,128,25,0.18)]"
            />
            {pending && (
              <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-accent)]">
                <Sparkles className="h-3 w-3 animate-spin" aria-hidden />
                Parsing…
              </div>
            )}
          </div>

          {/* Quick-fill chips */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Mumbai birthday ₹1,000", icon: PartyPopper },
              { label: "Client dinner Bangalore ₹2,000", icon: MapPin },
              { label: "Office hamper Delhi ₹750", icon: IndianRupee },
            ].map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => setInput(c.label)}
                className="group inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/85 px-4 py-2 text-xs font-medium text-[var(--color-text-muted)] transition-all hover:-translate-y-px hover:border-[var(--color-accent)]/50 hover:text-[var(--color-text)] hover:shadow-sm"
              >
                <c.icon
                  className="h-3.5 w-3.5 text-[var(--color-text-faint)] transition-colors group-hover:text-[var(--color-accent)]"
                  aria-hidden
                />
                {c.label}
              </button>
            ))}
          </div>

          {/* Parse error */}
          {parseError && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p className="font-medium">Couldn&apos;t parse your intent</p>
                <p className="mt-0.5 text-red-600/80">{parseError}</p>
              </div>
            </div>
          )}

          {/* Recipient details (collapsible feel) */}
          {parsed && (
            <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white/80 p-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                <User className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
                Recipient details
                <span className="font-normal normal-case tracking-normal text-[var(--color-text-faint)]">
                  (optional)
                </span>
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-faint)]" aria-hidden />
                  <Input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Their name"
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-faint)]" aria-hidden />
                  <Input
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="Their email"
                    type="email"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Build options CTA */}
          <div className="space-y-2">
            <Button
              onClick={previewOptions}
              disabled={!parsed || loadingOptions}
              className="gap-2 rounded-full px-7"
            >
              {loadingOptions ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" aria-hidden />
                  Building options…
                </>
              ) : (
                <>
                  Preview gift options
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </Button>
            {parsed ? (
              <p className="max-w-md text-xs leading-relaxed text-[var(--color-text-muted)]">
                Loads dine-out picks, an Instamart hamper, and Swiggy food credit for this
                intent. After you change city or budget, press Preview again so the cards match
                the sidebar.
              </p>
            ) : null}
          </div>
        </div>

        {/* Right: live parsed parameters */}
        <Card className="sticky top-24 overflow-hidden border-0 bg-gradient-to-b from-white/95 to-[#fff8f2]/90 shadow-[0_24px_60px_rgba(80,45,20,0.08)]">
          <CardHeader className="border-b border-[var(--color-border)] bg-white/60 pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
              <Sparkles className="h-4 w-4 text-[var(--color-accent)]" aria-hidden />
              Live preview
            </CardTitle>
            <CardDescription className="text-xs">
              Updates as you pause typing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-5 text-sm">
            {parsed ? (
              <>
                <div className="space-y-3">
                  {[
                    { icon: MapPin, label: "City", value: parsed.city },
                    {
                      icon: IndianRupee,
                      label: "Budget",
                      value: (
                        <AnimatedNumber
                          value={Math.round(parsed.budget_paise / 100)}
                          prefix="₹"
                        />
                      ),
                    },
                    {
                      icon: PartyPopper,
                      label: "Occasion",
                      value: parsed.occasion?.replace(/_/g, " "),
                    },
                    ...(parsed.tone
                      ? [
                          {
                            icon: Zap,
                            label: "Tone",
                            value: parsed.tone,
                          },
                        ]
                      : []),
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--color-accent-soft)]">
                        <row.icon
                          className="h-3.5 w-3.5 text-[var(--color-accent)]"
                          aria-hidden
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
                          {row.label}
                        </p>
                        <p className="truncate font-medium capitalize text-[var(--color-ink)]">
                          {row.value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-[var(--color-accent-soft)]/60 p-4">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
                    <MessageSquareText className="h-3 w-3" aria-hidden />
                    Message draft
                  </p>
                  <p className="font-display text-base leading-relaxed text-[var(--color-ink)]">
                    {parsed.message_draft}
                  </p>
                </div>
              </>
            ) : pending ? (
              <div className="space-y-4 py-4">
                <Skeleton className="h-4 w-3/4 rounded-full" />
                <Skeleton className="h-4 w-1/2 rounded-full" />
                <Skeleton className="h-4 w-2/3 rounded-full" />
                <Skeleton className="mt-4 h-16 rounded-2xl" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-accent-soft)]">
                  <Wand2 className="h-5 w-5 text-[var(--color-accent)]/50" aria-hidden />
                </div>
                <p className="text-sm text-[var(--color-text-faint)]">
                  Start typing above to see your intent parsed in real time
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Loading skeleton for options ─── */}
      {loadingOptions && (
        <div className="grid gap-6 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-4 rounded-3xl border border-[var(--color-border)] bg-white p-6">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <Skeleton className="h-4 w-2/3 rounded-full" />
              <Skeleton className="h-3 w-1/2 rounded-full" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-10 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* ─── Options error ─── */}
      {optionsError && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Couldn&apos;t build gift options</p>
            <p className="mt-1 text-red-600/80">{optionsError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={previewOptions}
              className="mt-3 rounded-full border-red-200 text-red-700 hover:bg-red-100"
            >
              Try again
            </Button>
          </div>
        </div>
      )}

      {/* ─── Gift option cards ─── */}
      {options && (
        <section ref={optionsSectionRef} className="space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
                Three paths to delight
              </h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Each card becomes a live option on the recipient&apos;s gift
                page.
              </p>
              {parsed ? (
                <p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white/80 px-4 py-2 text-xs font-medium text-[var(--color-cocoa)]">
                  <span className="text-[var(--color-text-faint)]">Preview built for</span>
                  <span>{parsed.city}</span>
                  <span className="text-[var(--color-text-faint)]">·</span>
                  <span>
                    ₹{(parsed.budget_paise / 100).toLocaleString("en-IN")}
                  </span>
                  <span className="text-[var(--color-text-faint)]">·</span>
                  <span className="capitalize">
                    {parsed.occasion?.replace(/_/g, " ")}
                  </span>
                </p>
              ) : null}
            </div>
            <div className="shrink-0">
              {creating ? (
                <Button disabled className="rounded-full px-8">
                  <Sparkles className="h-4 w-4 animate-spin" aria-hidden />
                  Creating gift…
                </Button>
              ) : (
                <ShimmerButton onClick={sendGift} className="px-10">
                  Send gift
                  <ArrowRight className="ml-1 inline h-4 w-4" aria-hidden />
                </ShimmerButton>
              )}
            </div>
          </div>

          {createError && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">Couldn&apos;t create the gift</p>
                <p className="mt-1 text-red-600/80">{createError}</p>
              </div>
            </div>
          )}

          {options?.dineout.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              No dine-out restaurants are seeded for{" "}
              <strong>{parsed?.city}</strong> in Supabase yet — Instamart + food credit preview below still applies once caches ship rows for this city.
            </div>
          ) : null}

          <div className="grid gap-6 sm:grid-cols-3">
            {options.dineout[0] ? (
              <GiftCard
                kind="dineout"
                option={options.dineout[0]}
                href="#"
                highlight
                showCta={false}
              />
            ) : null}
            <GiftCard
              kind="instamart"
              option={options.instamart}
              href="#"
              showCta={false}
            />
            <GiftCard
              kind="food"
              option={options.food_credit}
              href="#"
              showCta={false}
            />
          </div>
        </section>
      )}

      {/* ─── Generated link ─── */}
      {giftUrl && (
        <section ref={linkSectionRef} className="mx-auto max-w-xl">
          <Card className="overflow-hidden border-2 border-[var(--color-accent)]/25 bg-gradient-to-br from-[var(--color-accent-soft)] to-white shadow-[0_30px_70px_rgba(252,128,25,0.12)]">
            <CardHeader className="pb-3 text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-[var(--color-accent)] text-white shadow-[0_12px_28px_rgba(252,128,25,0.36)]">
                <Check className="h-7 w-7" />
              </div>
              <CardTitle className="text-xl text-[var(--color-ink)]">
                Gift link ready!
              </CardTitle>
              <CardDescription>
                Share this with your recipient — no account needed to redeem.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-8">
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white p-2">
                <code className="flex-1 truncate px-3 text-sm font-medium text-[var(--color-cocoa)]">
                  {giftUrl}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-xl"
                  onClick={copyUrl}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button asChild className="gap-2 rounded-full">
                  <Link
                    href={
                      giftUrl.startsWith("http")
                        ? new URL(giftUrl).pathname
                        : giftUrl
                    }
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden />
                    Open gift page
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setGiftUrl(null);
                    setOptions(null);
                    setParsed(null);
                    setInput("");
                    setRecipientName("");
                    setRecipientEmail("");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="gap-2 rounded-full"
                >
                  <Gift className="h-4 w-4" aria-hidden />
                  Create another
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ─── How it works ─── */}
      <section className="rounded-[2rem] border border-[var(--color-border)] bg-gradient-to-br from-white/90 to-[#fffaf4]/80 px-8 py-12 sm:px-12">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-accent)]">
          How it works
        </p>
        <h2 className="font-display mt-2 text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
          From words to a curated gift in seconds
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {[
            {
              icon: MessageSquareText,
              title: "Describe your occasion",
              body: "Tell us who it's for, the city, your budget, and the vibe you want. Our AI parses the rest.",
            },
            {
              icon: Sparkles,
              title: "We build three options",
              body: "A dine-out reservation, an Instamart hamper, and food credit — all powered by real Swiggy data.",
            },
            {
              icon: Gift,
              title: "Share the magic link",
              body: "Your recipient picks their favourite and redeems instantly. No sign-up, no voucher codes.",
            },
          ].map((item, i) => (
            <div key={item.title} className="relative">
              {i < 2 && (
                <ChevronRight
                  className="absolute -right-5 top-5 hidden h-5 w-5 text-[var(--color-text-faint)] sm:block"
                  aria-hidden
                />
              )}
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-accent-soft)]">
                <item.icon
                  className="h-5 w-5 text-[var(--color-accent)]"
                  aria-hidden
                />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[var(--color-ink)]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
