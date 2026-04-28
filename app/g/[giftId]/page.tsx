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
      <div className="mx-auto flex min-h-[50vh] max-w-xl items-center justify-center p-8">
        <p className="text-[var(--color-text-muted)]">Loading gift…</p>
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
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6">
      <div className="text-center">
        <Avatar className="mx-auto h-14 w-14">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
          A gift from
        </p>
        <p className="font-display mt-2 text-2xl">{String(gift.sender_name)}</p>
        <div className="mt-5 flex justify-center">
          <SwiggyMCPBadge />
        </div>
      </div>

      <Badge variant="muted" className="mx-auto mt-8 mb-10 block w-fit capitalize">
        {String(gift.occasion || "occasion")}
      </Badge>

      {directorText ? (
        <p className="font-display mx-auto mb-14 max-w-2xl text-center text-xl leading-relaxed">
          {directorText}
        </p>
      ) : null}

      {!directorText && gift.message ? (
        <p className="font-display mx-auto mb-14 max-w-2xl text-center text-xl leading-relaxed">
          {String(gift.message)}
        </p>
      ) : null}

      <Separator className="mb-14 opacity-70" />

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

      <p className="mt-12 text-center text-xs text-[var(--color-text-muted)]">
        Powered by curated Swiggy MCP-derived cache — demo build.
      </p>
    </div>
  );
}
