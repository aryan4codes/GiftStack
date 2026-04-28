"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FadeIn } from "@/components/magicui/fade-in";
import { GiftCard } from "@/components/GiftCard";
import { GiftUnwrap } from "@/components/GiftUnwrap";
import { SwiggyMCPBadge } from "@/components/SwiggyMCPBadge";
import type { GiftOptionsPayload } from "@/types/gift";
import Link from "next/link";
import { Heart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PICK_POPUP_DELAY_MS = 5500;

export default function GiftLinkPage() {
  const params = useParams<{ giftId: string }>();
  const id = params.giftId;
  const [gift, setGift] = React.useState<Record<string, unknown> | null>(null);
  const [directorText, setDirectorText] = React.useState("");
  const [unwrapped, setUnwrapped] = React.useState(false);
  const [pickPopupOpen, setPickPopupOpen] = React.useState(false);
  /** Shown below the fold after the intro modal is dismissed (or if user never got the timer). */
  const [showPicksInline, setShowPicksInline] = React.useState(false);
  const apiKickedOff = React.useRef(false);
  const picksAnchorRef = React.useRef<HTMLDivElement | null>(null);

  const sessionKey = React.useMemo(() => `gs-unwrapped-${id}`, [id]);

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

  /**
   * Fetch the gift snapshot up-front so the unwrap overlay can show "from {sender}".
   * The /open + director streaming calls are deferred until the user actually taps.
   */
  React.useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/gifts/${id}`);
      const data = await res.json();
      setGift(data);
    })();
  }, [id]);

  /** Skip the overlay if user already unwrapped this gift earlier in this tab. */
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(sessionKey) === "1") {
      setUnwrapped(true);
    }
  }, [sessionKey]);

  /**
   * Fire /open + start director streaming. Runs once per page session — either
   * triggered by a user tap on the unwrap box, or immediately if we restored
   * `unwrapped` from sessionStorage.
   */
  const startOpenAndDirector = React.useCallback(() => {
    if (apiKickedOff.current) return;
    apiKickedOff.current = true;
    void (async () => {
      await fetch(`/api/gifts/${id}/open`, { method: "POST" });
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

  React.useEffect(() => {
    if (unwrapped) startOpenAndDirector();
  }, [unwrapped, startOpenAndDirector]);

  /** After the main gift view is ready, wait ~5.5s then spotlight “Pick your experience”. */
  React.useEffect(() => {
    if (!gift?.options || !unwrapped) return;
    const opts = gift.options as GiftOptionsPayload;
    const top = [...opts.dineout].sort((a, b) => a.rank - b.rank)[0];
    if (!top) return;
    const t = window.setTimeout(() => {
      setPickPopupOpen(true);
    }, PICK_POPUP_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [gift, unwrapped]);

  const handlePickDialogOpenChange = React.useCallback((open: boolean) => {
    setPickPopupOpen(open);
    if (!open) setShowPicksInline(true);
  }, []);

  React.useEffect(() => {
    if (!showPicksInline) return;
    const fid = requestAnimationFrame(() => {
      picksAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(fid);
  }, [showPicksInline]);

  function handleUnwrapClick() {
    /* Kick off API the moment the user taps so the LLM has streaming time
     * during the lid animation. */
    startOpenAndDirector();
  }

  function handleUnwrapComplete() {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(sessionKey, "1");
    }
    setUnwrapped(true);
  }

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

  if (!unwrapped) {
    return (
      <GiftUnwrap
        senderName={String(gift.sender_name ?? "")}
        occasion={String(gift.occasion ?? "")}
        onUnwrap={handleUnwrapClick}
        onComplete={handleUnwrapComplete}
      />
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

      {/* Modest min-height: limits layout jump while streaming without a huge empty band */}
      <div
        className="mx-auto mt-10 mb-5 flex min-h-[clamp(9.5rem,22vh,16.5rem)] max-w-2xl items-start justify-center px-2 pb-2 pt-0"
        aria-live="polite"
      >
        <p className="font-display w-full text-center text-xl leading-relaxed text-[var(--color-ink)] sm:text-2xl">
          {directorText
            ? directorText
            : gift.message
              ? String(gift.message)
              : "\u00a0"}
        </p>
      </div>

      <Separator className="mx-auto mb-14 max-w-3xl opacity-60" />

      {!showPicksInline && !pickPopupOpen ? (
        <p className="mb-12 text-center text-sm leading-relaxed text-[var(--color-text-muted)]">
          Your experience choices will open in a few seconds…
        </p>
      ) : null}

      <Dialog open={pickPopupOpen} onOpenChange={handlePickDialogOpenChange}>
        <DialogContent className="max-h-[min(92vh,900px)] max-w-[min(94vw,64rem)] gap-5 overflow-y-auto rounded-[1.65rem] border-[var(--color-border)] bg-[#fffaf6] p-5 shadow-[0_40px_100px_rgba(40,24,12,0.18)] sm:p-8">
          <DialogHeader className="space-y-2 text-center sm:text-center">
            <DialogTitle className="font-display text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
              Pick your experience
            </DialogTitle>
            <DialogDescription className="text-[0.9375rem] leading-relaxed">
              Dine out, Instamart hamper, or Swiggy food credit — tap a card to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 sm:gap-7 md:grid-cols-3">
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
        </DialogContent>
      </Dialog>

      {showPicksInline ? (
        <div ref={picksAnchorRef} id="gift-picks-inline" className="scroll-mt-8">
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
        </div>
      ) : null}

      <p className="mt-14 text-center text-xs leading-relaxed text-[var(--color-text-muted)]">
        Powered by curated Swiggy MCP–derived catalogue slices — demo build.{" "}
        <Link href="/" className="font-medium text-[var(--color-accent)] underline-offset-4 hover:underline">
          About GiftStack
        </Link>
      </p>
    </div>
  );
}

