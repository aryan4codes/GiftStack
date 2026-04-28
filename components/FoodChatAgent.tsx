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
import {
  ArrowLeft,
  MapPin,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
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

type FoodMenuItemRow = {
  id: string;
  restaurant_id: string;
  name: string;
  category: string | null;
  price_paise: number | null;
  description: string | null;
  is_veg: boolean | null;
  image_url: string | null;
  has_variants: boolean;
  has_addons: boolean;
};

export type FoodCartLine = {
  restaurant_id: string;
  restaurant_name: string;
  menu_item_id: string;
  name: string;
  qty: number;
  price_paise: number;
};

function sumCart(lines: FoodCartLine[]) {
  return lines.reduce((s, l) => s + l.price_paise * l.qty, 0);
}

export function FoodChatAgent({
  giftId,
  budgetPaise,
  catalogueCity,
}: {
  giftId: string;
  budgetPaise: number;
  catalogueCity: string;
}) {
  const [input, setInput] = React.useState("");
  const [restaurants, setRestaurants] = React.useState<FoodRestaurantRow[]>(
    [],
  );
  const [restFilter, setRestFilter] = React.useState("");
  const [catalogLoading, setCatalogLoading] = React.useState(true);

  const [phase, setPhase] = React.useState<"browse" | "menu">("browse");
  const [selected, setSelected] = React.useState<FoodRestaurantRow | null>(null);
  const [menuLoading, setMenuLoading] = React.useState(false);
  const [menuError, setMenuError] = React.useState<string | null>(null);
  const [menuGrouped, setMenuGrouped] = React.useState<
    { title: string; items: FoodMenuItemRow[] }[]
  >([]);
  const [cart, setCart] = React.useState<FoodCartLine[]>([]);

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

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/gifts/${giftId}`);
        const j = (await res.json()) as {
          food_cart?: FoodCartLine[];
          budget_paise?: number;
        };
        if (!cancelled && Array.isArray(j.food_cart)) setCart(j.food_cart);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [giftId]);

  const persistCart = React.useCallback(
    async (lines: FoodCartLine[]) => {
      await fetch(`/api/gifts/${giftId}/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ food_cart: lines }),
      });
      setCart(lines);
    },
    [giftId],
  );

  const openMenu = React.useCallback(async (r: FoodRestaurantRow) => {
    setSelected(r);
    setPhase("menu");
    setMenuError(null);
    setMenuGrouped([]);
    setMenuLoading(true);
    try {
      const res = await fetch(
        `/api/cached-food-menu?restaurant_id=${encodeURIComponent(r.id)}`,
      );
      const j = (await res.json()) as {
        error?: string;
        grouped?: { title: string; items: FoodMenuItemRow[] }[];
        hasLinkedMenu?: boolean;
      };
      if (!res.ok) {
        setMenuError(j.error ?? "Could not load menu");
        return;
      }
      setMenuGrouped(j.grouped ?? []);
      if (!j.hasLinkedMenu && (j.grouped?.length ?? 0) === 0) {
        setMenuError(null);
      }
    } catch {
      setMenuError("Network error loading menu.");
    } finally {
      setMenuLoading(false);
    }
  }, []);

  const filteredRestaurants = React.useMemo(() => {
    const q = restFilter.trim().toLowerCase();
    if (!q) return restaurants;
    return restaurants.filter((r) => {
      const name = r.name.toLowerCase();
      const area = (r.area ?? "").toLowerCase();
      const cuis = Array.isArray(r.cuisine) ? r.cuisine.join(" ").toLowerCase() : "";
      return name.includes(q) || area.includes(q) || cuis.includes(q);
    });
  }, [restaurants, restFilter]);

  const cartTotal = sumCart(cart);
  const remaining = Math.max(0, budgetPaise - cartTotal);

  const addItem = (r: FoodRestaurantRow, it: FoodMenuItemRow) => {
    const price = it.price_paise ?? 0;
    if (price <= 0) return;
    /** Adding another ₹portion increment (+qty × sku unit price concept — qty increments × sku paise). */
    if (cartTotal + price > budgetPaise) return;

    const idx = cart.findIndex(
      (l) =>
        l.menu_item_id === it.id && l.restaurant_id === r.id,
    );
    let next: FoodCartLine[];
    if (idx >= 0) {
      next = cart.map((l, i) =>
        i === idx ? { ...l, qty: l.qty + 1 } : l,
      );
    } else {
      next = [
        ...cart,
        {
          restaurant_id: r.id,
          restaurant_name: r.name,
          menu_item_id: it.id,
          name: it.name,
          qty: 1,
          price_paise: price,
        },
      ];
    }
    void persistCart(next);
  };

  const removeOne = (menu_item_id: string, restaurant_id: string) => {
    const idx = cart.findIndex(
      (l) =>
        l.menu_item_id === menu_item_id && l.restaurant_id === restaurant_id,
    );
    if (idx < 0) return;
    const line = cart[idx]!;
    let next: FoodCartLine[];
    if (line.qty <= 1) {
      next = cart.filter((_, i) => i !== idx);
    } else {
      next = cart.map((l, i) =>
        i === idx ? { ...l, qty: l.qty - 1 } : l,
      );
    }
    void persistCart(next);
  };

  const clearCart = () => void persistCart([]);

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
    <div className="flex min-h-[520px] flex-col gap-6">
      {/* —— Picker: restaurant → menu —— */}
      <div className="rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-white via-[#fffdfb] to-[#fff5eb] p-6 shadow-[0_20px_50px_rgba(80,45,20,0.07)]">
        <div className="flex flex-wrap items-start gap-3">
          <Badge variant="accent" className="gap-1 rounded-full px-3 py-1 font-semibold">
            <ShoppingBag className="h-3 w-3" aria-hidden />
            Order with your credit
          </Badge>
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
            <strong className="font-semibold text-[var(--color-ink)]">
              Step 1 · Pick a restaurant
            </strong>{" "}
            from the Swiggy mirror for{" "}
            <strong>{catalogueCity.trim() || "your city"}</strong>, then{" "}
            <strong>browse dishes</strong> and tap add to cart. Menus only load when we have
            rows in{" "}
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
              cached_food_menu_items
            </code>{" "}
            for that outlet.
          </p>
        </div>

        {phase === "browse" ? (
          <>
            <div className="mt-5">
              <Input
                value={restFilter}
                onChange={(e) => setRestFilter(e.target.value)}
                placeholder="Search by name, cuisine, or area..."
                className="max-w-md rounded-full border-[var(--color-border)] bg-white"
              />
            </div>

            <div className="mt-4">
              <div className="mb-3 flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-[var(--color-accent)]" aria-hidden />
                <p className="font-display text-sm font-semibold text-[var(--color-ink)]">
                  Restaurants
                </p>
                {!catalogLoading ? (
                  <Badge variant="muted" className="rounded-full font-normal">
                    {filteredRestaurants.length} matches
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
              ) : filteredRestaurants.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/60 px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                  No venues cached for this city yet — seed{" "}
                  <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
                    cached_food_restaurants
                  </code>
                  .
                </p>
              ) : (
                <div className="-mx-1 flex max-h-[min(52vh,520px)] flex-wrap gap-3 overflow-y-auto pb-2 pt-1">
                  {filteredRestaurants.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => void openMenu(r)}
                      className="w-[min(11.5rem,calc(100vw-4rem))] shrink-0 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white text-left shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
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
                        </div>
                        <p className="pt-1 text-[10px] font-medium text-[var(--color-accent)]">
                          View menu →
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          selected && (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-start gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    setPhase("browse");
                    setSelected(null);
                    setMenuGrouped([]);
                    setMenuError(null);
                  }}
                >
                  <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
                  All restaurants
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold text-[var(--color-ink)]">
                    {selected.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {[cuisinePreview(selected), selected.area].filter(Boolean).join(" · ")}
                    {selected.area ? (
                      <span className="ml-1 inline-flex items-center gap-0.5">
                        <MapPin className="inline h-3 w-3" aria-hidden />
                        {selected.area}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-[var(--color-text-faint)]">
                    id {selected.id}
                  </p>
                </div>
              </div>

              {menuLoading ? (
                <p className="text-sm text-[var(--color-text-muted)]">Loading menu…</p>
              ) : menuError ? (
                <p className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {menuError}
                </p>
              ) : menuGrouped.length === 0 ? (
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-5 text-sm leading-relaxed text-amber-950">
                  <p className="font-semibold">No dishes in cache for this restaurant</p>
                  <p className="mt-2 text-amber-900/90">
                    We have the outlet in{" "}
                    <code className="rounded bg-white/80 px-1">cached_food_restaurants</code> but no
                    rows in{" "}
                    <code className="rounded bg-white/80 px-1">
                      cached_food_menu_items
                    </code>{" "}
                    for this <code className="rounded bg-white/80 px-1">{selected.id}</code>. Hydrate
                    with Swiggy MCP <strong>get_restaurant_menu</strong> (see{" "}
                    <code className="rounded bg-white/80 px-1">POST /api/cached-food-menu/hydrate</code>
                    ) or import via <code className="rounded bg-white/80 px-1">npm run seed</code> /
                    compose parts.
                  </p>
                </div>
              ) : (
                <div className="scrollbar-thin max-h-[min(50vh,480px)] space-y-6 overflow-y-auto pr-1">
                  {menuGrouped.map((grp) => (
                    <div key={grp.title}>
                      <p className="sticky top-0 z-[1] bg-gradient-to-r from-[#fffdfb] to-transparent py-2 text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                        {grp.title}
                      </p>
                      <ul className="space-y-2">
                        {grp.items.map((it) => {
                          const price = it.price_paise ?? 0;
                          const inr = price > 0 ? Math.round(price / 100) : null;
                          const atCap =
                            price > 0 && cartTotal + price > budgetPaise;
                          return (
                            <li
                              key={it.id}
                              className="flex gap-3 rounded-2xl border border-[var(--color-border)] bg-white/90 p-3 shadow-sm"
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                                    {it.name}
                                  </p>
                                  {it.is_veg === true ? (
                                    <span className="text-[10px] text-green-700">veg</span>
                                  ) : it.is_veg === false ? (
                                    <span className="text-[10px] text-amber-800">non-veg</span>
                                  ) : null}
                                </div>
                                {it.description ? (
                                  <p className="line-clamp-2 text-xs text-[var(--color-text-muted)]">
                                    {it.description}
                                  </p>
                                ) : null}
                                <p className="text-sm font-semibold text-[var(--color-accent)]">
                                  {inr != null ? `₹${inr.toLocaleString("en-IN")}` : "—"}
                                </p>
                                {(it.has_variants || it.has_addons) ? (
                                  <p className="text-[10px] text-[var(--color-text-faint)]">
                                    Customization (variants/add-ons) is simplified in this demo.
                                  </p>
                                ) : null}
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                className="shrink-0 self-center rounded-full"
                                disabled={!price || atCap}
                                onClick={() => addItem(selected, it)}
                                title={atCap ? "Over budget" : "Add to cart"}
                              >
                                <Plus className="h-4 w-4" aria-hidden />
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Cart */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-white/90 px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              Your cart
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--color-accent)]">
              <AnimatedNumber value={Math.round(cartTotal / 100)} prefix="₹" />
              <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
                of ₹{Math.round(budgetPaise / 100).toLocaleString("en-IN")}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
              Remaining: ₹{Math.round(remaining / 100).toLocaleString("en-IN")}
            </p>
          </div>
          {cart.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={clearCart}
            >
              <Trash2 className="mr-1 h-4 w-4" aria-hidden />
              Clear
            </Button>
          ) : null}
        </div>
        {cart.length > 0 ? (
          <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto border-t border-[var(--color-border)] pt-3">
            {cart.map((l) => (
              <li
                key={`${l.restaurant_id}-${l.menu_item_id}`}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-[var(--color-ink)]">
                  {l.qty}× {l.name}
                </span>
                <span className="shrink-0 text-[var(--color-text-muted)]">
                  ₹{Math.round((l.price_paise * l.qty) / 100).toLocaleString("en-IN")}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-full"
                  onClick={() => removeOne(l.menu_item_id, l.restaurant_id)}
                  aria-label="Remove one"
                >
                  −
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            Cart is empty — choose a restaurant and add dishes above.
          </p>
        )}
      </div>

      {/* Assistant (secondary) */}
      <Card className="flex flex-1 flex-col overflow-hidden rounded-3xl border-[var(--color-border)] bg-gradient-to-b from-white to-[#fffaf7] p-1 shadow-[0_24px_60px_rgba(80,45,20,0.08)]">
        <details className="group">
          <summary className="cursor-pointer list-none px-5 py-3 text-sm font-semibold text-[var(--color-ink)] marker:content-none">
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--color-accent)]" aria-hidden />
              Chat assistant (cached catalog only)
            </span>
            <span className="float-right text-xs font-normal text-[var(--color-text-muted)] group-open:hidden">
              Open
            </span>
          </summary>
          <div className="scrollbar-thin max-h-[320px] space-y-4 overflow-y-auto border-t border-[var(--color-border)] px-5 pb-2 pt-3">
            {messages.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                Optional: ask in natural language — the assistant uses the same cache. For reliable
                ordering, use the picker above.
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
              <p className="text-xs text-[var(--color-text-muted)]">Thinking with tools…</p>
            ) : null}
          </div>
          <form
            className="flex gap-2 border-t border-[var(--color-border)] bg-white/90 p-4"
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
              placeholder="Ask about cuisines or a restaurant name…"
              className="flex-1 rounded-full border-[var(--color-border)] bg-white"
            />
            <Button
              type="submit"
              disabled={status === "streaming"}
              className="shrink-0 rounded-full px-6"
            >
              Send
            </Button>
          </form>
        </details>
      </Card>

      <Button variant="outline" asChild className="w-full sm:w-auto">
        <Link href={`/g/${giftId}/confirmed`}>View confirmation</Link>
      </Button>
    </div>
  );
}
