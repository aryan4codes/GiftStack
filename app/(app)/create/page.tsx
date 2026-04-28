"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { TypingAnimation } from "@/components/magicui/typing-animation";
import { GiftCard } from "@/components/GiftCard";
import type { GiftOptionsPayload, ParsedIntent } from "@/types/gift";
import Link from "next/link";

export default function CreateGiftPage() {
  const [input, setInput] = React.useState(
    "Thank you gift for a friend in Mumbai, ₹1000, birthday"
  );
  const [parsed, setParsed] = React.useState<ParsedIntent | null>(null);
  const [pending, setPending] = React.useState(false);
  const [options, setOptions] = React.useState<GiftOptionsPayload | null>(null);
  const [loadingOptions, setLoadingOptions] = React.useState(false);
  const [giftUrl, setGiftUrl] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(async () => {
      if (!input.trim()) return;
      setPending(true);
      try {
        const res = await fetch("/api/parse-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: input }),
        });
        const data = await res.json();
        setParsed(data);
      } catch {
        setParsed(null);
      } finally {
        setPending(false);
      }
    }, 750);
    return () => clearTimeout(t);
  }, [input]);

  async function previewOptions() {
    if (!parsed) return;
    setLoadingOptions(true);
    setOptions(null);
    try {
      const res = await fetch("/api/rank-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: parsed.city,
          budget_paise: parsed.budget_paise,
          occasion: parsed.occasion,
        }),
      });
      const data = await res.json();
      setOptions(data.options);
    } finally {
      setLoadingOptions(false);
    }
  }

  async function sendGift() {
    if (!parsed) return;
    setCreating(true);
    try {
      const res = await fetch("/api/gifts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parsed,
          options,
        }),
      });
      const data = await res.json();
      if (data.giftUrl) setGiftUrl(data.giftUrl);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Create a gift
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Describe your gift in plain English — we&apos;ll structure it for MCP-style
            fulfilment rails (cached demo data).
          </p>
        </div>
        <div className="space-y-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={8}
            placeholder="e.g. Thank you gift for a client in Bangalore who helped close a deal, around ₹1,500"
            className="font-sans text-base"
          />
          <div className="flex flex-wrap gap-2">
            {[
              "Mumbai birthday ₹1000",
              "Premium client dinner Bangalore ₹2000",
              "Office hamper Delhi ₹750",
            ].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setInput(c)}
                className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs text-[var(--color-text-muted)] hover:border-[var(--color-accent)]"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={previewOptions}>
            Preview Gift Options
          </Button>
          {pending ? (
            <span className="text-xs text-[var(--color-text-muted)]">
              Parsing…
            </span>
          ) : null}
        </div>
      </div>

      <aside className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live preview</CardTitle>
            <CardDescription>
              Parsed parameters update as you pause typing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {parsed ? (
              <>
                <dl className="grid grid-cols-2 gap-x-2 gap-y-2">
                  <dt className="text-[var(--color-text-muted)]">City</dt>
                  <dd className="font-medium">{parsed.city}</dd>
                  <dt className="text-[var(--color-text-muted)]">Budget</dt>
                  <dd className="font-medium">
                    ₹{(parsed.budget_paise / 100).toLocaleString("en-IN")}
                  </dd>
                  <dt className="text-[var(--color-text-muted)]">Occasion</dt>
                  <dd className="font-medium">{parsed.occasion}</dd>
                </dl>
                <div>
                  <p className="mb-1 text-[var(--color-text-muted)]">Message draft</p>
                  <TypingAnimation
                    text={parsed.message_draft}
                    className="font-display text-lg leading-relaxed text-[var(--color-text)]"
                  />
                </div>
              </>
            ) : (
              <p className="text-[var(--color-text-muted)]">Start typing…</p>
            )}
          </CardContent>
        </Card>

        {loadingOptions ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        ) : null}

        {options ? (
          <div className="space-y-4">
            <h2 className="font-medium">Your three options</h2>
            <div className="grid gap-6 md:grid-cols-3">
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {creating ? (
                <Button disabled>Sending…</Button>
              ) : (
                <ShimmerButton onClick={sendGift}>Send Gift</ShimmerButton>
              )}
            </div>
            {giftUrl ? (
              <Card className="border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)]">
                <CardHeader>
                  <CardTitle className="text-base">Gift link</CardTitle>
                  <CardDescription>
                    Share this URL with your recipient (no email in demo).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <code className="block break-all rounded-md bg-white p-3 text-xs">
                    {giftUrl}
                  </code>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={
                        giftUrl.startsWith("http")
                          ? new URL(giftUrl).pathname
                          : giftUrl
                      }
                    >
                      Open gift
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
