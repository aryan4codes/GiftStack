"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FadeIn } from "@/components/magicui/fade-in";
import { GiftCard } from "@/components/GiftCard";
import { SwiggyMCPBadge } from "@/components/SwiggyMCPBadge";
import type { GiftOptionsPayload } from "@/types/gift";
import Link from "next/link";
import { Heart } from "lucide-react";

export default function GiftLinkPage() {
  const params = useParams<{ giftId: string }>();
  const id = params.giftId;
  const [gift, setGift] = React.useState<Record<string, unknown> | null>(null);
  const [directorText, setDirectorText] = React.useState("");

  async function notifyChoose(
    type: "dineout" | "instamart" | "food",
    restaurantId?: string
  ) {
    await fetch(`/api/gifts/${id}/choose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chosen_type: type,
        restaurant_id: restaurantId,
      }),
    });
  }

  React.useEffect(() => {
    (async () => {
      await fetch(`/api/gifts/${id}/open`, { method: "POST" });
      const res = await fetch(`/api/gifts/${id}`);
      const data = await res.json();
      setGift(data);

      const d = await fetch(`/api/gifts/${id}/director`, { method: "POST" });
      const reader = d.body?.getReader();
      const dec = new TextDecoder();
      if (!reader) return;
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setDirectorText(acc);
      }
    })();
  }, [id]);

  if (!gift || !gift.options) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="h-12 w-12 animate-pulse rounded-full bg-[var(--color-accent-soft)]" />
        <p className="text-sm font-medium text-[var(--color-text-muted)]">
          Unwrapping your gift…
        </p>
      </div>
    );
  }

  const options = gift.options as GiftOptionsPayload;
  const dineTop = [...options.dineout].sort((a, b) => a.rank - b.rank)[0];
  const initials = String(gift.sender_name || "GS")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!dineTop) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <p>Gift options are incomplete — seed cached dine-out data.</p>
      </div>
    );
  }

  const ridEnc = encodeURIComponent(dineTop.restaurant_id);

  return (
    <div className="relative mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <div className="hero-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 opacity-50" />

      <div className="glass-panel soft-ring relative mx-auto max-w-2xl rounded-[2rem] px-8 py-10 text-center sm:px-12">
        <Avatar className="mx-auto h-16 w-16 border-2 border-white shadow-md">
          <AvatarFallback className="bg-[var(--color-accent)] text-lg font-semibold text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
          A gift from
        </p>
        <p className="font-display mt-2 text-3xl font-semibold text-[var(--color-ink)]">
          {String(gift.sender_name)}
        </p>
        <div className="mt-6 flex justify-center">
          <SwiggyMCPBadge />
        </div>
        <Badge
          variant="muted"
          className="mx-auto mt-8 inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium capitalize"
        >
          <Heart className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
          {String(gift.occasion || "occasion")}
        </Badge>
      </div>

      {directorText ? (
        <p className="font-display mx-auto mt-14 mb-6 max-w-2xl text-center text-xl leading-relaxed text-[var(--color-ink)] sm:text-2xl">
          {directorText}
        </p>
      ) : null}

      {!directorText && gift.message ? (
        <p className="font-display mx-auto mt-14 mb-6 max-w-2xl text-center text-xl leading-relaxed text-[var(--color-ink)] sm:text-2xl">
          {String(gift.message)}
        </p>
      ) : null}

      <Separator className="mx-auto mb-14 max-w-3xl opacity-60" />

      <p className="mb-8 text-center font-display text-xl font-semibold text-[var(--color-ink)]">
        Pick your experience
      </p>

      <div className="grid gap-8 md:grid-cols-3">
        <FadeIn>
          <GiftCard
            kind="dineout"
            option={dineTop}
            href={`/g/${id}/redeem?type=dineout&rid=${ridEnc}`}
            highlight
            onChoose={() => notifyChoose("dineout", dineTop.restaurant_id)}
          />
        </FadeIn>

        <FadeIn delayMs={120}>
          <GiftCard
            kind="instamart"
            option={options.instamart}
            href={`/g/${id}/redeem?type=instamart`}
            onChoose={() => notifyChoose("instamart")}
          />
        </FadeIn>

        <FadeIn delayMs={240}>
          <GiftCard
            kind="food"
            option={options.food_credit}
            href={`/g/${id}/redeem?type=food`}
            onChoose={() => notifyChoose("food")}
          />
        </FadeIn>
      </div>

      <p className="mt-14 text-center text-xs leading-relaxed text-[var(--color-text-muted)]">
        Powered by curated Swiggy MCP–derived catalogue slices — demo build.{" "}
        <Link href="/" className="font-medium text-[var(--color-accent)] underline-offset-4 hover:underline">
          About GiftStack
        </Link>
      </p>
    </div>
  );
}

