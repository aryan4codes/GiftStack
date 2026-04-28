"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FoodChatAgent } from "@/components/FoodChatAgent";
import type { GiftOptionsPayload } from "@/types/gift";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function RedeemPage() {
  const params = useParams<{ giftId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const id = params.giftId;
  const type = search.get("type") as "dineout" | "instamart" | "food" | null;
  const rid = search.get("rid");

  const [gift, setGift] = React.useState<Record<string, unknown> | null>(null);
  const [restaurant, setRestaurant] = React.useState<Record<string, unknown> | null>(null);
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [slots, setSlots] = React.useState<Array<Record<string, unknown>>>([]);
  const [slotPick, setSlotPick] = React.useState<Record<string, unknown> | null>(null);
  const [guests, setGuests] = React.useState(2);
  const [address, setAddress] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const res = await fetch(`/api/gifts/${id}`);
      const g = await res.json();
      setGift(g);
      if (type === "dineout" && rid) {
        const r = await fetch(`/api/cached-dineout-restaurant/${rid}`);
        if (r.ok) setRestaurant(await r.json());
      }
    })();
  }, [id, type, rid]);

  React.useEffect(() => {
    if (!type || type !== "dineout" || !rid || !date) {
      setSlots([]);
      return;
    }
    (async () => {
      const ds = format(date, "yyyy-MM-dd");
      const res = await fetch(
        `/api/cached-slots?restaurant_id=${encodeURIComponent(rid)}&date=${encodeURIComponent(ds)}`
      );
      const j = await res.json();
      setSlots(j.slots ?? []);
      setSlotPick(null);
    })();
  }, [type, rid, date]);

  if (!type) {
    return (
      <div className="mx-auto max-w-lg p-10 text-center text-sm text-[var(--color-text-muted)]">
        Missing option type. Open the gift link and pick an experience.
      </div>
    );
  }

  if (!gift) {
    return (
      <div className="mx-auto max-w-lg p-10 text-center">Loading…</div>
    );
  }

  const options = gift.options as GiftOptionsPayload;
  const budgetPaise = Number(gift.budget_paise);

  async function finalizeDineout() {
    if (!date || !slotPick || !restaurant)
      return;
    setBusy(true);
    try {
      await fetch(`/api/gifts/${id}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dineout",
          details: {
            restaurant_name: restaurant.name,
            restaurant_id: restaurant.id,
            date: format(date, "yyyy-MM-dd"),
            time: slotPick.display_time,
            slot_id: slotPick.slot_id,
            guests,
            booking_id: `DN-DEMO-${id}`,
          },
        }),
      });
      router.push(`/g/${id}/confirmed`);
    } finally {
      setBusy(false);
    }
  }

  async function finalizeInstamart() {
    setBusy(true);
    try {
      await fetch(`/api/gifts/${id}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "instamart",
          details: {
            items: options.instamart.items,
            address,
            order_id: `IM-DEMO-${id}`,
          },
        }),
      });
      router.push(`/g/${id}/confirmed`);
    } finally {
      setBusy(false);
    }
  }

  if (type === "food") {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:pt-12">
        <Link
          href={`/g/${id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to gift
        </Link>
        <h1 className="font-display mt-8 text-3xl font-semibold text-[var(--color-ink)]">
          Food credit
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--color-text-muted)]">
          Chat with the ordering agent — it pulls from cached menus and refuses to slip over
          your gift budget (demo tools).
        </p>
        <div className="mt-10">
          <FoodChatAgent giftId={id} budgetPaise={budgetPaise} />
        </div>
      </div>
    );
  }

  if (type === "instamart") {
    return (
      <div className="mx-auto max-w-lg px-4 pb-16 pt-8 sm:pt-12">
        <Link
          href={`/g/${id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to gift
        </Link>
        <h1 className="font-display mt-8 text-3xl font-semibold text-[var(--color-ink)]">
          Instamart hamper
        </h1>
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base">Your hamper</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-[var(--color-text-muted)]">
              {options.instamart.description}
            </p>
            <ul className="list-inside list-disc space-y-1">
              {options.instamart.items.map((it) => (
                <li key={it.item_id}>
                  {it.name} × {it.qty} — ₹{(it.price_paise * it.qty) / 100}
                </li>
              ))}
            </ul>
            <Input
              placeholder="Delivery address (demo)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <Button
              className="w-full"
              disabled={busy || !address.trim()}
              onClick={() => finalizeInstamart()}
            >
              Confirm delivery
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:pt-12">
      <Link
        href={`/g/${id}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to gift
      </Link>
      <h1 className="font-display mt-8 text-3xl font-semibold text-[var(--color-ink)]">
        Reserve a table
      </h1>
      {restaurant ? (
        <p className="mt-2 text-lg">{String(restaurant.name)}</p>
      ) : (
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Loading restaurant…
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pick a date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) =>
                d < new Date(Date.now() + 86400000)
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Guest count</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Input
              type="number"
              min={1}
              max={8}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
            />
            <div>
              <p className="mb-2 text-sm font-medium">Available slots</p>
              {slots.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  {date
                    ? "No cached slots for this date — try another day or re-seed."
                    : "Choose a date first."}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <Button
                      key={String(s.id)}
                      type="button"
                      size="sm"
                      variant={
                        slotPick?.display_time === s.display_time
                          ? "default"
                          : "outline"
                      }
                      onClick={() => setSlotPick(s)}
                    >
                      {String(s.display_time)}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <Button
              className="w-full"
              disabled={busy || !date || !slotPick}
              onClick={() => finalizeDineout()}
            >
              Book table (demo)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
