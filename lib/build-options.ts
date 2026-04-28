import type { SupabaseClient } from "@supabase/supabase-js";
import type { GiftOptionsPayload } from "@/types/gift";

/**
 * Fill instamart hamper approaching the gift budget (not ₹10 chocolates only).
 * Greedy descending: pick expensive SKUs first so totals track premium gifts (~₹2k headline).
 */
type InstamartProductRow = {
  id: string;
  name: string;
  price_paise: number | null;
  image_url?: string | null;
};

function packInstamartItems(
  products: InstamartProductRow[],
  budgetPaise: number
): GiftOptionsPayload["instamart"]["items"] {
  const budget = Math.max(0, budgetPaise);
  const usable = [...products].filter((p) => (p.price_paise ?? 0) > 0);

  function packDescendingForCap(cap: number): GiftOptionsPayload["instamart"]["items"] {
    const sorted = [...usable].sort(
      (a, b) => (b.price_paise ?? 0) - (a.price_paise ?? 0)
    );
    let remaining = cap;
    const items: GiftOptionsPayload["instamart"]["items"] = [];

    for (const p of sorted) {
      if (items.length >= 5) break;
      const price = p.price_paise ?? 0;
      if (price <= 0 || price > remaining) continue;
      const row: GiftOptionsPayload["instamart"]["items"][number] = {
        item_id: p.id,
        name: p.name,
        qty: 1,
        price_paise: price,
      };
      const im = p.image_url?.trim();
      if (im) row.image_url = im;
      items.push(row);
      remaining -= price;
      if (remaining <= 0) break;
    }
    return items;
  }

  // Spend up to ~92% of the gift headline so the hamper “feels” close to stated value (demo UX).
  const capPrefer = Math.floor(budget * 0.92);
  let items = packDescendingForCap(capPrefer);

  // Micro-budget: fall back closer to spend limit
  if (items.length === 0 || items.reduce((s, l) => s + l.price_paise * l.qty, 0) < Math.floor(budget * 0.2)) {
    items = packDescendingForCap(Math.floor(budget));
  }

  // Last resort — cheap-first baskets (legacy mix)
  if (items.length === 0) {
    const cheapFirst = [...usable].sort(
      (a, b) => (a.price_paise ?? 0) - (b.price_paise ?? 0)
    );
    const cap = Math.floor(budget * 0.92);
    let total = 0;
    for (const p of cheapFirst) {
      const price = p.price_paise ?? 0;
      if (total + price <= cap && items.length < 5 && price > 0) {
        const row: GiftOptionsPayload["instamart"]["items"][number] = {
          item_id: p.id,
          name: p.name,
          qty: 1,
          price_paise: price,
        };
        const im = p.image_url?.trim();
        if (im) row.image_url = im;
        items.push(row);
        total += price;
      }
      if (items.length >= 5) break;
    }
  }

  if (items.length === 0 && usable.length > 0) {
    const cheapest = [...usable].sort(
      (a, b) => (a.price_paise ?? 0) - (b.price_paise ?? 0)
    )[0];
    const price = cheapest.price_paise ?? 0;
    if (price <= budget * 1.2) {
      const row: GiftOptionsPayload["instamart"]["items"][number] = {
        item_id: cheapest.id,
        name: cheapest.name,
        qty: 1,
        price_paise: price,
      };
      const im = cheapest.image_url?.trim();
      if (im) row.image_url = im;
      items = [row];
    }
  }

  return items;
}

export async function buildOptionsFromCache(
  sb: SupabaseClient,
  city: string,
  budgetPaise: number
): Promise<GiftOptionsPayload> {
  const cityNorm = city.trim();

  const dineoutOrder = () =>
    sb
      .from("cached_dineout_restaurants")
      .select("*")
      .order("rating", { ascending: false, nullsFirst: false })
      .order("rating_count", { ascending: false, nullsFirst: false });

  const { data: byCity, error: errCity } = await dineoutOrder()
    .ilike("city", `%${cityNorm}%`)
    .limit(12);

  if (errCity) {
    throw new Error(`cached_dineout_restaurants (by city): ${errCity.message}`);
  }

  let rows = byCity ?? [];
  if (!rows.length) {
    const { data: anyCity, error: errAny } = await dineoutOrder().limit(12);
    if (errAny) {
      throw new Error(`cached_dineout_restaurants (fallback): ${errAny.message}`);
    }
    rows = anyCity ?? [];
  }

  const top = rows.slice(0, 3);
  const dineout = top.map((r, i) => ({
    restaurant_id: r.id,
    name: r.name,
    cuisine: Array.isArray(r.cuisine) ? r.cuisine[0] : undefined,
    area: r.area ?? undefined,
    avg_cost_for_2: r.avg_cost_for_two ?? undefined,
    image_url: r.image_url ?? undefined,
    pitch: "",
    rank: i + 1,
  }));

  const { data: productsRaw, error: errIm } = await sb
    .from("cached_instamart_products")
    .select("id,name,price_paise,city,image_url")
    .limit(800);

  if (errIm) {
    throw new Error(`cached_instamart_products: ${errIm.message}`);
  }

  const raw = productsRaw ?? [];
  const lc = cityNorm.toLowerCase();
  let filtered = raw.filter(
    (p) =>
      !p.city ||
      String(p.city)
        .toLowerCase()
        .includes(lc)
  );
  if (!filtered.length) {
    filtered = raw;
  }

  const items = packInstamartItems(filtered as InstamartProductRow[], Math.max(0, budgetPaise));
  const total = items.reduce((s, l) => s + l.price_paise * l.qty, 0);

  return {
    dineout,
    instamart: {
      tier: "premium",
      description: "",
      items,
      estimated_total_paise: total,
    },
    food_credit: {
      amount_paise: Math.max(0, budgetPaise),
      description: "",
    },
  };
}
