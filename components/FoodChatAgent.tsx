"use client";

import * as React from "react";
import Image from "next/image";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/magicui/animated-number";
import { MapPin, Sparkles, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

export type FoodRestaurantRow = {
  id: string;
  name: string;
  cuisine?: string[] | null;
  area?: string | null;
  city?: string | null;
  rating?: number | null;
  delivery_time?: string | null;
  image_url?: string | null;
};

export function FoodChatAgent({
  giftId,
  budgetPaise,
  catalogueCity,
}: {
  giftId: string;
  budgetPaise: number;
  /** Gift recipient city — matches `cached_food_restaurants.city` slice */
  catalogueCity: string;
}) {
  const [input, setInput] = React.useState("");
  const [restaurants, setRestaurants] = React.useState<FoodRestaurantRow[]>(
    [],
  );
  const [catalogLoading, setCatalogLoading] = React.useState(true);

  React.useEffect(() => {
    if (!catalogueCity.trim()) {
      setRestaurants([]);
      setCatalogLoading(false);
      return;
    }
    let cancelled = false;
    setCatalogLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/cached-food-restaurants?city=${encodeURIComponent(catalogueCity.trim())}`,
        );
        const j = (await res.json()) as { restaurants?: FoodRestaurantRow[] };
        if (!cancelled) setRestaurants(j.restaurants ?? []);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogueCity]);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/agent/chat",
      body: { giftId },
    }),
  });

  const cuisinePreview = (r: FoodRestaurantRow) =>
    Array.isArray(r.cuisine)
      ? r.cuisine.slice(0, 2).join(" · ")
      : null;

  return (
    <div className="flex min-h-[520px] flex-col gap-8">
      <div className="rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-white via-[#fffdfb] to-[#fff5eb] p-6 shadow-[0_20px_50px_rgba(80,45,20,0.07)]">
        <div className="flex flex-wrap items-start gap-3">
          <Badge variant="accent" className="gap-1 rounded-full px-3 py-1 font-semibold">
            <Sparkles className="h-3 w-3" aria-hidden />
            Cached catalogue
          </Badge>
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
            Browse restaurants we already mirrored from Swiggy for{" "}
            <strong className="font-semibold text-[var(--color-ink)]">
              {catalogueCity.trim() || "your city"}
            </strong>
            . The agent can search menus and add to cart only within this set — name a
            restaurant or a cuisine to begin.
          </p>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-[var(--color-accent)]" aria-hidden />
            <p className="font-display text-sm font-semibold text-[var(--color-ink)]">
              Restaurants in our database
            </p>
            {!catalogLoading ? (
              <Badge variant="muted" className="rounded-full font-normal">
                {restaurants.length} places
              </Badge>
            ) : null}
          </div>
          {catalogLoading ? (
            <div className="flex gap-3 overflow-hidden pb-2">
              {[1, 2, 3].map((k) => (
                <div
                  key={k}
                  className="h-[108px] w-[148px] shrink-0 animate-pulse rounded-2xl bg-neutral-200/70"
                />
              ))}
            </div>
          ) : restaurants.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
              No food venues cached for this city yet — seed{" "}
              <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
                cached_food_restaurants
              </code>{" "}
              or try another metro that exists in Supabase.
            </p>
          ) : (
            <div className="-mx-1 flex gap-3 overflow-x-auto pb-3 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {restaurants.map((r) => (
                <div
                  key={r.id}
                  className="w-[min(11.5rem,calc(100vw-4rem))] shrink-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="relative aspect-[5/3] w-full bg-neutral-100">
                    {r.image_url ? (
                      <Image
                        src={r.image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="180px"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[10px] text-[var(--color-text-faint)]">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="line-clamp-2 text-xs font-semibold leading-snug text-[var(--color-ink)]">
                      {r.name}
                    </p>
                    <p className="line-clamp-1 text-[10px] text-[var(--color-text-muted)]">
                      {[cuisinePreview(r), r.area].filter(Boolean).join(" · ") ||
                        "Swiggy food"}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {typeof r.rating === "number" ? (
                        <Badge variant="muted" className="h-5 rounded px-1.5 text-[10px]">
                          ★ {r.rating.toFixed(1)}
                        </Badge>
                      ) : null}
                      {r.delivery_time ? (
                        <span className="text-[10px] text-[var(--color-text-faint)]">
                          {r.delivery_time}
                        </span>
                      ) : null}
                    </div>
                    {r.area ? (
                      <p className="flex items-center gap-0.5 text-[10px] text-[var(--color-text-muted)]">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate">{r.area}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-white/75 px-5 py-4 shadow-sm backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Budget left
          </p>
          <p className="mt-1 text-lg font-semibold text-[var(--color-accent)]">
            <AnimatedNumber value={Math.round(budgetPaise / 100)} prefix="₹" />
          </p>
        </div>
        <p className="max-w-xs text-right text-xs leading-relaxed text-[var(--color-text-muted)]">
          The agent searches cached dishes and edits your cart with tools until you confirm.
        </p>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden rounded-3xl border-[var(--color-border)] bg-gradient-to-b from-white to-[#fffaf7] p-1 shadow-[0_24px_60px_rgba(80,45,20,0.08)]">
        <div className="scrollbar-thin max-h-[400px] flex-1 space-y-4 overflow-y-auto p-5 pb-2">
          {messages.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              Say what you&apos;re in the mood for — try naming a restaurant from the strip
              above (e.g. &quot;order from [name]&quot;) or a cuisine. The agent only pulls
              dishes from our cached menus and keeps you under budget.
            </p>
          ) : null}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "bg-[var(--color-accent)] text-white"
                    : "border border-[var(--color-border)] bg-white text-[var(--color-text)]"
                }`}
              >
                {m.parts
                  .filter((part) => part.type === "text")
                  .map((part, i) => (
                    <span key={`${m.id}-${i}`}>
                      {"text" in part ? part.text : ""}
                    </span>
                  ))}
              </div>
            </div>
          ))}
          {status === "streaming" || status === "submitted" ? (
            <p className="text-xs text-[var(--color-text-muted)]">
              Thinking with tools…
            </p>
          ) : null}
        </div>
        <form
          className="mt-2 flex gap-2 border-t border-[var(--color-border)] bg-white/90 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            void sendMessage({ text: input });
            setInput("");
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='e.g. "Starters from [restaurant name]" or "North Indian under budget"'
            className="flex-1 rounded-full border-[var(--color-border)] bg-white"
          />
          <Button type="submit" disabled={status === "streaming"} className="shrink-0 rounded-full px-6">
            Send
          </Button>
        </form>
      </Card>

      <Button variant="outline" asChild className="w-full sm:w-auto">
        <Link href={`/g/${giftId}/confirmed`}>View confirmation</Link>
      </Button>
    </div>
  );
}
