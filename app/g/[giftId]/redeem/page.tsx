"use client";

import * as React from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FoodChatAgent } from "@/components/FoodChatAgent";
import type { GiftOptionsPayload } from "@/types/gift";
import { Calendar } from "@/components/ui/calendar";
import { addDays, format, startOfDay } from "date-fns";
import Link from "next/link";
import { ArrowLeft, IndianRupee, MapPin, Sparkles, Star, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type CachedProductRow = {
  id: string;
  brand?: string | null;
  category?: string | null;
  image_url?: string | null;
};

const EMPTY_OPTIONS: GiftOptionsPayload = {
  dineout: [],
  instamart: {
    tier: "",
    description: "",
    items: [],
    estimated_total_paise: 0,
  },
  food_credit: { amount_paise: 0, description: "" },
};

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

  /** Merge Supabase snapshots for SKU images/brands when gift JSON predates uploads */
  const [imHydrate, setImHydrate] = React.useState<Record<string, CachedProductRow>>({});

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
        `/api/cached-slots?restaurant_id=${encodeURIComponent(rid)}&date=${encodeURIComponent(ds)}`,
      );
      const j = await res.json();
      setSlots(j.slots ?? []);
      setSlotPick(null);
    })();
  }, [type, rid, date]);

  const catalogueCity =
    typeof gift?.city === "string" ? gift.city : "";

  React.useEffect(() => {
    if (type !== "instamart" || !gift) return;
    const opts = gift.options as GiftOptionsPayload | undefined;
    const items = opts?.instamart?.items ?? [];
    const ids = items.map((i) => i.item_id).join(",");
    if (!ids) return;

    let cancelled = false;
    void (async () => {
      const res = await fetch(
        `/api/cached-instamart-products?ids=${encodeURIComponent(ids)}`,
      );
      const data = (await res.json()) as { products?: CachedProductRow[] };
      if (cancelled) return;
      const m: Record<string, CachedProductRow> = {};
      for (const p of data.products ?? []) m[p.id] = p;
      setImHydrate(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [type, gift, id]);

  const dineTomorrow = React.useMemo(
    () => addDays(startOfDay(new Date()), 1),
    [],
  );

  const resolvedOptions = React.useMemo((): GiftOptionsPayload => {
    if (!gift?.options) return EMPTY_OPTIONS;
    return gift.options as GiftOptionsPayload;
  }, [gift]);

  const cuisineLabels = React.useMemo(() => {
    const c = restaurant?.cuisine;
    if (!Array.isArray(c)) return [];
    return c.map((x) => String(x)).filter(Boolean).slice(0, 6);
  }, [restaurant]);

  const highlightLabels = React.useMemo(() => {
    const h = restaurant?.highlights;
    if (!Array.isArray(h)) return [];
    return h.map((x) => String(x)).filter(Boolean).slice(0, 5);
  }, [restaurant]);

  const restImageUrl = React.useMemo(() => {
    if (restaurant && typeof restaurant.image_url === "string") {
      return restaurant.image_url;
    }
    return undefined;
  }, [restaurant]);

  const instamartHeroTiles = React.useMemo(() => {
    return resolvedOptions.instamart.items.flatMap((it) => {
      const hydrated = imHydrate[it.item_id];
      const src = it.image_url ?? hydrated?.image_url ?? "";
      const label = hydrated?.brand ?? it.name;
      return src
        ? [{ key: it.item_id, src, alt: label, name: it.name }]
        : [];
    });
  }, [resolvedOptions.instamart.items, imHydrate]);

  const instamartTotalRupee = resolvedOptions.instamart.estimated_total_paise / 100;

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

  const options = resolvedOptions;
  const budgetPaise = Number(gift.budget_paise);

  function disableBookingDates(calDate: Date) {
    return startOfDay(calDate) < dineTomorrow;
  }

  async function finalizeDineout() {
    if (!date || !slotPick || !restaurant) return;
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
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:pt-12">
        <Link
          href={`/g/${id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to gift
        </Link>
        <h1 className="font-display mt-8 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">
          Food credit
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-text-muted)]">
          Choose a restaurant below, then dishes from the cached menu for{" "}
          <strong>{catalogueCity.trim()}</strong>. Stay within your credit; optional chat can
          help explore the same catalog.
        </p>
        <div className="mt-10">
          <FoodChatAgent
            giftId={id}
            budgetPaise={budgetPaise}
            catalogueCity={catalogueCity}
          />
        </div>
      </div>
    );
  }

  if (type === "instamart") {
    return (
      <div className="relative mx-auto max-w-xl px-4 pb-20 pt-8 sm:pt-12">
        <Link
          href={`/g/${id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to gift
        </Link>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <Badge variant="accent" className="gap-1 rounded-full px-3 py-1 font-semibold">
            <Sparkles className="h-3 w-3" aria-hidden />
            Swiggy Instamart
          </Badge>
          {catalogueCity ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-muted)]">
              <Store className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {catalogueCity}
            </span>
          ) : null}
        </div>

        <h1 className="font-display mt-4 text-[1.95rem] font-semibold tracking-tight text-[var(--color-ink)] sm:text-[2.125rem]">
          Your gift hamper
        </h1>
        <p className="mt-2 flex flex-wrap items-baseline gap-2 text-[var(--color-text-muted)]">
          <span>Estimated hamper value</span>
          <span className="font-display text-xl font-semibold tracking-tight text-[var(--color-accent)] tabular-nums">
            ₹{instamartTotalRupee.toLocaleString("en-IN")}
          </span>
        </p>

        {instamartHeroTiles.length > 0 ? (
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {instamartHeroTiles.map((t, i) => (
              <div
                key={`${t.key}-${i}`}
                className="relative aspect-square w-[calc(44vw-2rem)] max-w-[7.75rem] shrink-0 overflow-hidden rounded-3xl bg-neutral-100 shadow-[0_14px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.06]"
              >
                <Image
                  src={t.src}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="124px"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-[var(--color-border)] bg-white/70 px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
            Loading product art from catalogue… Run{' '}
            <code className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-xs font-mono text-[var(--color-ink)]">
              npm run seed
            </code>{' '}
            so SKU images attach.
          </div>
        )}

        <Card className="mt-8 overflow-hidden rounded-[1.65rem] border-[var(--color-border)] bg-white/95 shadow-[0_24px_56px_rgba(80,45,24,0.08)] backdrop-blur">
          <CardHeader className="space-y-1 border-b border-[var(--color-border)]/70 bg-white/80 pb-4">
            <CardTitle className="font-display text-lg">Packed for you</CardTitle>
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
              Exactly what ships with this surprise
            </p>
          </CardHeader>
          <CardContent className="space-y-5 px-4 py-6 sm:px-6">
            <p className="text-[0.9375rem] leading-relaxed text-[var(--color-text-muted)]">
              {options.instamart.description}
            </p>
            <ul className="space-y-3">
              {options.instamart.items.map((it) => {
                const hydrated = imHydrate[it.item_id];
                const src = it.image_url ?? hydrated?.image_url ?? undefined;
                const brand = hydrated?.brand?.trim();

                return (
                  <li key={it.item_id}>
                    <div className="flex gap-4 rounded-[1.15rem] border border-neutral-100 bg-gradient-to-br from-white via-white to-orange-50/40 p-[0.625rem] shadow-sm ring-1 ring-black/[0.03]">
                      <div className="relative h-[5.125rem] w-[5.125rem] shrink-0 overflow-hidden rounded-2xl bg-neutral-50 shadow-inner">
                        {src ? (
                          <Image
                            src={src}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="82px"
                          />
                        ) : (
                          <div className="grid h-full place-items-center p-2 text-center text-[9px] font-semibold uppercase leading-tight tracking-wide text-neutral-400">
                            Swiggy
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
                        {brand ? (
                          <p className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                            {brand}
                          </p>
                        ) : null}
                        <p className="text-sm font-semibold leading-snug text-[var(--color-ink)]">
                          {it.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.8125rem] tabular-nums text-[var(--color-text-muted)]">
                          <span>× {it.qty}</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-ink)]">
                            <IndianRupee className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
                            {(it.price_paise * it.qty) / 100}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <Separator className="my-2 bg-[var(--color-border)]/80" />

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Delivery address <span className="text-red-600">*</span>
              </label>
              <Input
                placeholder="Flat, street & landmark (demo)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-11 rounded-xl border-neutral-200/90 bg-white/90"
              />
            </div>
            <Button
              className="h-11 w-full rounded-full text-[0.95rem] shadow-[0_12px_32px_rgba(252,128,25,0.28)]"
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

  const restName =
    restaurant && typeof restaurant.name === "string" ? restaurant.name : null;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:pt-12">
      <Link
        href={`/g/${id}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to gift
      </Link>

      <section className="mt-10 overflow-hidden rounded-[2rem] bg-white shadow-[0_34px_80px_rgba(40,26,14,0.12)] ring-1 ring-black/[0.04]">
        <div className="relative aspect-[21/11] max-h-[16.5rem] w-full bg-gradient-to-br from-orange-900/30 via-orange-950/10 to-transparent sm:aspect-[21/10] md:max-h-[18rem]">
          {restImageUrl ? (
            <Image src={restImageUrl} alt="" fill className="object-cover" sizes="960px" priority />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-neutral-200 via-neutral-100 to-white" />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-6 pb-7 pt-28 sm:p-10 sm:pb-9 sm:pt-36">
            {restaurant ? (
              <>
                <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/85">
                  Dine-out gift
                </p>
                <h1 className="font-display mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-[2.125rem]">
                  {restName}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {[
                    ...(cuisineLabels.length ? cuisineLabels : []),
                  ].map((c) => (
                    <Badge
                      key={c}
                      className="border-white/35 bg-white/15 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur hover:bg-white/25"
                      variant="secondary"
                    >
                      {c}
                    </Badge>
                  ))}
                  {typeof restaurant.area === "string" && restaurant.area ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-white/92">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      {restaurant.area}
                      {typeof restaurant.city === "string" && restaurant.city
                        ? ` · ${restaurant.city}`
                        : ""}
                    </span>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-sm text-white/90">Opening restaurant dossier…</p>
            )}
          </div>
        </div>

        <div className="grid gap-8 border-t border-neutral-100/90 bg-[#fdfaf6] px-5 py-8 sm:p-10">
          {!restaurant ? (
            <p className="text-sm text-[var(--color-text-muted)]">Loading cached venue…</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-4 text-sm">
                {typeof restaurant.rating === "number" ? (
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-orange-100/90 bg-orange-50/90 px-4 py-2.5 text-[var(--color-ink)] shadow-sm">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden />
                    <span className="font-semibold">{restaurant.rating.toFixed(1)}</span>
                    {typeof restaurant.rating_count === "number" ? (
                      <span className="text-[var(--color-text-muted)]">
                        ({restaurant.rating_count.toLocaleString("en-IN")} votes)
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {typeof restaurant.avg_cost_for_two === "number" ? (
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 shadow-sm tabular-nums">
                    <IndianRupee className="h-4 w-4 text-neutral-700" aria-hidden />
                    <span className="text-[var(--color-text-muted)]">Avg ·</span>
                    <span className="font-semibold text-[var(--color-ink)]">
                      ₹{restaurant.avg_cost_for_two} for two
                    </span>
                  </div>
                ) : null}
              </div>
              {highlightLabels.length > 0 ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    Venue highlights (from dine-out catalogue)
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {highlightLabels.map((h) => (
                      <Badge
                        key={h}
                        variant="muted"
                        className="rounded-full px-4 py-1.5 font-medium text-[var(--color-ink)]"
                      >
                        {h}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              <Separator />

              <div className="grid gap-10 lg:grid-cols-[minmax(18rem,_1fr)_minmax(20rem,_1.1fr)]">
                <Card className="rounded-[1.65rem] border-[var(--color-border)] bg-white/95 pt-6 shadow-[0_20px_50px_rgba(80,45,22,0.07)] backdrop-blur">
                  <CardHeader className="space-y-0 pb-2">
                    <CardTitle className="font-display text-lg">Reserve a slot</CardTitle>
                    <p className="text-[0.8125rem] leading-relaxed text-[var(--color-text-muted)]">
                      Pick tomorrow onwards — calendars use cached MCP availability for this
                      restaurant.
                    </p>
                  </CardHeader>
                  <CardContent className="flex justify-center px-5 pb-6 pt-4 sm:px-8">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={disableBookingDates}
                    />
                  </CardContent>
                </Card>

                <Card className="flex flex-col rounded-[1.65rem] border-[var(--color-border)] bg-white shadow-[0_20px_50px_rgba(80,45,22,0.07)]">
                  <CardHeader className="space-y-1 border-b border-[var(--color-border)]/80 pb-6">
                    <CardTitle className="font-display text-lg">Guests & seating</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-9 px-7 py-9">
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                        Party size
                      </p>
                      <Input
                        type="number"
                        min={1}
                        max={8}
                        value={guests}
                        onChange={(e) => setGuests(Number(e.target.value))}
                        className="h-11 max-w-[min(12rem,100%)] rounded-xl text-base font-medium"
                      />
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                        Available slots
                      </p>
                      {slots.length === 0 ? (
                        <p className="rounded-2xl border border-dashed border-[var(--color-border)] bg-neutral-50/90 px-4 py-5 text-sm text-[var(--color-text-muted)]">
                          {date
                            ? "No cached slots for this date — try another day or re-seed dine-out slots."
                            : "Choose a date in the calendar to load live cached times."}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2.5">
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
                              className="rounded-full px-5 font-medium"
                              onClick={() => setSlotPick(s)}
                            >
                              {String(s.display_time)}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      className="mt-auto h-11 w-full rounded-full text-base shadow-[0_12px_32px_rgba(252,128,25,0.26)] disabled:opacity-40"
                      disabled={busy || !date || !slotPick || !restaurant}
                      onClick={() => finalizeDineout()}
                    >
                      Book table (demo)
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
