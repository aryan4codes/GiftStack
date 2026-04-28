import type { SupabaseClient } from "@supabase/supabase-js";
import type { GiftOptionsPayload } from "@/types/gift";

export async function buildOptionsFromCache(
  sb: SupabaseClient,
  city: string,
  budgetPaise: number
): Promise<GiftOptionsPayload> {
  const cityNorm = city.trim();

  const { data: restaurants } = await sb
    .from("cached_dineout_restaurants")
    .select("*")
    .ilike("city", `%${cityNorm}%`)
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(12);

  const top = (restaurants ?? []).slice(0, 3);
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

  const { data: productsRaw } = await sb
    .from("cached_instamart_products")
    .select("*")
    .limit(150);

  const products = (productsRaw ?? []).filter(
    (p) =>
      !p.city ||
      String(p.city).toLowerCase().includes(cityNorm.toLowerCase())
  );

  const items: GiftOptionsPayload["instamart"]["items"] = [];
  let total = 0;
  const budget = Math.max(0, budgetPaise);

  for (const p of products) {
    const price = p.price_paise ?? 0;
    if (price <= 0) continue;
    const qty = 1;
    if (total + price * qty <= budget * 0.85) {
      items.push({
        item_id: p.id,
        name: p.name,
        qty,
        price_paise: price,
      });
      total += price * qty;
    }
    if (items.length >= 5) break;
  }

  return {
    dineout,
    instamart: {
      tier: "premium",
      description: "",
      items,
      estimated_total_paise: total,
    },
    food_credit: {
      amount_paise: budget,
      description: "",
    },
  };
}
