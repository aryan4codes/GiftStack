import type { SupabaseClient } from "@supabase/supabase-js";
import type { GiftOptionsPayload } from "@/types/gift";

/** Fill instamart lines under budget — prefers cheaper picks first when data is scarce. */
function packInstamartItems(
  products: Array<{ id: string; name: string; price_paise: number | null }>,
  budgetPaise: number
): GiftOptionsPayload["instamart"]["items"] {
  const budget = Math.max(0, budgetPaise);
  const usable = [...products].filter((p) => (p.price_paise ?? 0) > 0);
  usable.sort((a, b) => (a.price_paise ?? 0) - (b.price_paise ?? 0));

  let cap = Math.floor(budget * 0.85);
  let items: GiftOptionsPayload["instamart"]["items"] = [];
  let total = 0;

  for (const p of usable) {
    const price = p.price_paise ?? 0;
    if (price <= 0) continue;
    if (total + price <= cap && items.length < 5) {
      items.push({
        item_id: p.id,
        name: p.name,
        qty: 1,
        price_paise: price,
      });
      total += price;
    }
    if (items.length >= 5) break;
  }

  // If cap was too tight vs price distribution, retry with full budget (still greedy cheap-first).
  if (items.length === 0 && usable.length > 0) {
    cap = budget;
    total = 0;
    items = [];
    for (const p of usable) {
      const price = p.price_paise ?? 0;
      if (total + price <= cap && items.length < 5) {
        items.push({
          item_id: p.id,
          name: p.name,
          qty: 1,
          price_paise: price,
        });
        total += price;
      }
      if (items.length >= 5) break;
    }
  }

  // Last resort: at least one line item if cheapest fits under nominal budget at all (demo UX).
  if (items.length === 0 && usable.length > 0) {
    const cheapest = usable[0];
    const price = cheapest.price_paise ?? 0;
    if (price <= budget || price <= budget * 1.15) {
      items = [
        {
          item_id: cheapest.id,
          name: cheapest.name,
          qty: 1,
          price_paise: price,
        },
      ];
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
    .select("id,name,price_paise,city")
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

  const items = packInstamartItems(filtered, Math.max(0, budgetPaise));
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
