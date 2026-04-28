"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/magicui/animated-number";
import type { GiftStatus } from "@/types/gift";

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
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-semibold">Your gifts</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Status updates every few seconds (demo polling).
          </p>
        </div>
        <Button asChild>
          <Link href="/create">Send New Gift</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-[var(--color-text-muted)]">
              Total sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              <AnimatedNumber value={total} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-[var(--color-text-muted)]">
              Redeemed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-emerald-700">
              <AnimatedNumber value={redeemed} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-[var(--color-text-muted)]">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              <AnimatedNumber value={pending} />
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gift list</CardTitle>
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
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] p-4"
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
