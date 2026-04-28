import type { SupabaseClient } from "@supabase/supabase-js";
import { selectDineoutRestaurantIdsViaLlm } from "@/lib/llm/select-dineout-restaurants";
import { selectInstamartItemIdsViaLlm } from "@/lib/llm/select-instamart-hamper";
import type { GiftOptionsPayload } from "@/types/gift";

/**
 * Optional sender context so Instamart hamper line-items can match message + occasion (LLM).
 */
export type GiftContextForOptions = {
  occasion?: string;
  message?: string;
  tone?: string;
};

/**
 * Fill instamart hamper approaching the gift budget (not ₹10 chocolates only).
 * Greedy descending: pick expensive SKUs first so totals track premium gifts (~₹2k headline).
 */
type InstamartProductRow = {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  price_paise: number | null;
  image_url?: string | null;
};

function assembleInstamartFromIds(
  orderedIds: string[],
  byId: Map<string, InstamartProductRow>,
  budgetPaise: number
): GiftOptionsPayload["instamart"]["items"] {
  const cap = Math.max(0, Math.floor(budgetPaise * 0.92));
  const items: GiftOptionsPayload["instamart"]["items"] = [];
  let spent = 0;
  for (const rawId of orderedIds) {
    if (items.length >= 5) break;
    const p = byId.get(rawId);
    if (!p) continue;
    const price = p.price_paise ?? 0;
    if (price <= 0) continue;
    if (spent + price > cap) continue;
    const row: GiftOptionsPayload["instamart"]["items"][number] = {
      item_id: p.id,
      name: p.name,
      qty: 1,
      price_paise: price,
    };
    const im = p.image_url?.trim();
    if (im) row.image_url = im;
    items.push(row);
    spent += price;
  }
  return items;
}

async function resolveInstamartItems(
  filtered: InstamartProductRow[],
  budgetPaise: number,
  giftContext?: GiftContextForOptions
): Promise<GiftOptionsPayload["instamart"]["items"]> {
  const fallback = () => packInstamartItems(filtered, budgetPaise);
  if (!giftContext) return fallback();

  const msg = (giftContext.message ?? "").trim();
  const occ = (giftContext.occasion ?? "").trim();
  if (!process.env.OPENAI_API_KEY || (!msg && !occ)) return fallback();

  const candidates = filtered.map((p) => ({
    id: String(p.id),
    name: String(p.name),
    brand: p.brand ?? null,
    category: p.category ?? null,
    price_paise: p.price_paise,
  }));

  const ids = await selectInstamartItemIdsViaLlm(candidates, {
    occasion: occ || "gift",
    message: msg || occ,
    tone: giftContext.tone,
    budget_paise: Math.max(0, budgetPaise),
  });

  if (!ids?.length) return fallback();

  const byId = new Map(
    filtered.map((r) => [String(r.id), r] as const)
  );
  const assembled = assembleInstamartFromIds(ids, byId, budgetPaise);
  return assembled.length ? assembled : fallback();
}

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

const DINEOUT_CANDIDATE_LIMIT = 72;

function mapDineoutRow(
  r: Record<string, unknown>,
  rank: number
): GiftOptionsPayload["dineout"][number] {
  const cuisines = Array.isArray(r.cuisine)
    ? (r.cuisine as unknown[]).map(String).filter(Boolean)
    : [];
  return {
    restaurant_id: String(r.id),
    name: String(r.name),
    cuisine: cuisines.length ? cuisines.slice(0, 5).join(" · ") : undefined,
    area: r.area != null ? String(r.area) : undefined,
    avg_cost_for_2:
      r.avg_cost_for_two != null && r.avg_cost_for_two !== ""
        ? Number(r.avg_cost_for_two)
        : undefined,
    image_url: r.image_url != null ? String(r.image_url) : undefined,
    pitch: "",
    rank,
  };
}

async function resolveDineoutOptions(
  rows: Record<string, unknown>[],
  giftBudgetPaise: number,
  giftContext?: GiftContextForOptions
): Promise<GiftOptionsPayload["dineout"]> {
  const fallback = (): GiftOptionsPayload["dineout"] => {
    const top = rows.slice(0, 3);
    return top.map((r, i) => mapDineoutRow(r, i + 1));
  };

  if (!giftContext || !process.env.OPENAI_API_KEY) return fallback();

  const msg = (giftContext.message ?? "").trim();
  const occ = (giftContext.occasion ?? "").trim();
  if (!msg && !occ) return fallback();

  const candidates = rows.map((raw) => {
    const r = raw as Record<string, unknown>;
    const cuisines = Array.isArray(r.cuisine)
      ? (r.cuisine as unknown[]).map(String).filter(Boolean)
      : [];
    return {
      id: String(r.id),
      name: String(r.name),
      cuisines,
      area: r.area != null ? String(r.area) : "",
      avg_for_two_inr:
        r.avg_cost_for_two != null && r.avg_cost_for_two !== ""
          ? Number(r.avg_cost_for_two)
          : null,
      rating:
        r.rating != null && r.rating !== "" ? Number(r.rating) : null,
    };
  });

  const ids = await selectDineoutRestaurantIdsViaLlm(candidates, {
    occasion: occ || "gift",
    message: msg || occ,
    tone: giftContext.tone,
    gift_value_inr: Math.max(1, Math.round(giftBudgetPaise / 100)),
  });

  if (!ids?.length) return fallback();

  const byId = new Map(
    rows.map((raw) => [String((raw as Record<string, unknown>).id), raw])
  );
  const out: GiftOptionsPayload["dineout"] = [];
  let rank = 1;
  for (const id of ids) {
    const raw = byId.get(id);
    if (!raw) continue;
    out.push(mapDineoutRow(raw as Record<string, unknown>, rank++));
    if (out.length >= 3) break;
  }
  return out.length ? out : fallback();
}

export async function buildOptionsFromCache(
  sb: SupabaseClient,
  city: string,
  budgetPaise: number,
  giftContext?: GiftContextForOptions
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
    .limit(DINEOUT_CANDIDATE_LIMIT);

  if (errCity) {
    throw new Error(`cached_dineout_restaurants (by city): ${errCity.message}`);
  }

  let rows = (byCity ?? []) as Record<string, unknown>[];
  if (!rows.length) {
    const { data: anyCity, error: errAny } = await dineoutOrder().limit(
      DINEOUT_CANDIDATE_LIMIT
    );
    if (errAny) {
      throw new Error(`cached_dineout_restaurants (fallback): ${errAny.message}`);
    }
    rows = (anyCity ?? []) as Record<string, unknown>[];
  }

  const dineout = await resolveDineoutOptions(
    rows,
    Math.max(0, budgetPaise),
    giftContext
  );

  const { data: productsRaw, error: errIm } = await sb
    .from("cached_instamart_products")
    .select("id,name,brand,category,price_paise,city,image_url")
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

  const items = await resolveInstamartItems(
    filtered as InstamartProductRow[],
    Math.max(0, budgetPaise),
    giftContext
  );
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
