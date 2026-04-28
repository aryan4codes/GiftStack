"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ParticlesBurst } from "@/components/magicui/particles";
import { SwiggyMCPBadge } from "@/components/SwiggyMCPBadge";
import { FadeIn } from "@/components/magicui/fade-in";
import { CheckCircle2 } from "lucide-react";

export default function ConfirmedPage() {
  const params = useParams<{ giftId: string }>();
  const id = params.giftId;
  const [gift, setGift] = React.useState<Record<string, unknown> | null>(null);

  React.useEffect(() => {
    (async () => {
      const res = await fetch(`/api/gifts/${id}`);
      setGift(await res.json());
    })();
  }, [id]);

  if (!gift) {
    return (
      <div className="mx-auto max-w-lg p-10 text-center">Loading…</div>
    );
  }

  const opt = gift.chosen_option as Record<string, unknown> | null | undefined;
  const foodCart = gift.food_cart as unknown;
  const ctype = gift.chosen_type as string | null;

  const hasChosen =
    opt !== null &&
    opt !== undefined &&
    typeof opt === "object" &&
    Object.keys(opt as object).length > 0;

  const cartLines = Array.isArray(foodCart) ? (foodCart as unknown[]) : [];
  const snapshot =
    hasChosen
      ? opt
      : ctype === "food" && cartLines.length > 0
        ? {
            food_cart: cartLines,
            note: "Saved cart (redeem step may not have run — use Complete order on the food page)",
          }
        : ctype === "food" && cartLines.length === 0
          ? {
              message:
                "No order details yet — go back to Food credit, add dishes, tap “Complete order & confirmation”.",
            }
          : opt ?? { message: "No snapshot stored for this gift yet." };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-16 text-center">
      <ParticlesBurst />
      <FadeIn>
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600 drop-shadow-sm" />
        <h1 className="font-display mt-8 text-3xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-4xl">
          You&apos;re all set
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {ctype === "dineout" && "Table reservation"}
          {ctype === "instamart" && "Instamart order"}
          {ctype === "food" && "Food order"}
        </p>
      </FadeIn>

      <Card className="mx-auto mt-12 max-w-lg text-left shadow-[0_28px_65px_rgba(80,45,20,0.12)]">
        <CardHeader>
          <CardTitle className="text-lg text-[var(--color-ink)]">Redemption snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <pre className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[#1a120c] p-5 text-left text-xs leading-relaxed text-emerald-100/95">
            {JSON.stringify(snapshot, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Button asChild variant="outline" className="mt-10 rounded-full px-8">
        <Link href="/">Back home</Link>
      </Button>

      <div className="mt-14 flex justify-center">
        <SwiggyMCPBadge />
      </div>
    </div>
  );
}
