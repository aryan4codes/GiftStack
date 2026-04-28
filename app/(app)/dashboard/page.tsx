"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/magicui/animated-number";
import type { GiftStatus } from "@/types/gift";
import { BarChart3, Gift, RefreshCw } from "lucide-react";

export default function DashboardPage() {
  const [gifts, setGifts] = React.useState<Array<Record<string, unknown>>>([]);

  React.useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/dashboard/gifts");
      const j = await res.json();
      setGifts(j.gifts ?? []);
    };
    void load();
    const i = setInterval(load, 8000);
    return () => clearInterval(i);
  }, []);

  const total = gifts.length;
  const redeemed = gifts.filter((g) => g.status === "redeemed").length;
  const pending = total - redeemed;

  function statusVariant(s: string) {
    if (s === "redeemed") return "success";
    if (s === "opened") return "secondary";
    if (s === "expired") return "muted";
    return "default";
  }

  return (
    <div className="space-y-10 pb-12">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            <BarChart3 className="h-4 w-4 text-[var(--color-accent)]" aria-hidden />
            Overview
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold text-[var(--color-ink)] sm:text-4xl">
            Your gifts
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-[var(--color-text-muted)]">
            Lightweight dashboard for the demo — we poll every eight seconds so you
            can watch status flip when someone redeems.
          </p>
        </div>
        <Button asChild className="shrink-0 rounded-full px-6">
          <Link href="/create">Send new gift</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-white to-[#fff3e8]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)]">
              <Gift className="h-4 w-4 text-[var(--color-accent)]" aria-hidden />
              Total sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-semibold text-[var(--color-ink)]">
              <AnimatedNumber value={total} />
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-white to-emerald-50/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-text-muted)]">
              Redeemed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-semibold text-emerald-700">
              <AnimatedNumber value={redeemed} />
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-white to-neutral-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)]">
              <RefreshCw className="h-4 w-4 text-[var(--color-cocoa)]" aria-hidden />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl font-semibold text-[var(--color-ink)]">
              <AnimatedNumber value={pending} />
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-[var(--color-ink)]">
            Gift list
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {gifts.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No gifts yet —{" "}
              <Link href="/create" className="text-[var(--color-accent)] underline">
                create one
              </Link>
              .
            </p>
          ) : (
            gifts.map((g) => (
              <div
                key={String(g.id)}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-white/75 p-5 shadow-sm backdrop-blur transition-shadow hover:shadow-md"
              >
                <div>
                  <p className="font-medium">{String(g.recipient_name || "Recipient")}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {String(g.occasion)} · ₹
                    {((Number(g.budget_paise) || 0) / 100).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariant(String(g.status))}>
                    {(g.status as GiftStatus) || "unknown"}
                  </Badge>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/g/${String(g.id)}`}>Open link</Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
