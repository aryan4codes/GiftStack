/**
 * Normalize Swiggy Food MCP `get_restaurant_menu` shape → `cached_food_menu_items` rows.
 * Mirrors `flattenMenuCategories` in `scripts/import-mcp-snapshot.ts`.
 */
export type SwiggyFoodMenuBlob = Record<string, unknown> & {
  categories?: SwiggyMenuCategory[];
  restaurant?: { id?: string; name?: string };
};

export type SwiggyMenuCategory = {
  title?: string;
  items?: Record<string, unknown>[];
  subcategories?: SwiggyMenuCategory[];
};

export function flattenFoodMenuCategories(
  data: SwiggyFoodMenuBlob,
  restaurantId: string,
): Record<string, unknown>[] {
  const categories = data.categories;
  const out: Record<string, unknown>[] = [];
  if (!categories?.length) return out;

  function walk(catTitle: string, items: Record<string, unknown>[] | undefined) {
    if (!items) return;
    for (const raw of items) {
      const it = raw;
      const priceRupee =
        typeof it.price === "number"
          ? it.price
          : typeof (it as { finalPrice?: number }).finalPrice === "number"
            ? (it as { finalPrice?: number }).finalPrice!
            : 0;
      out.push({
        id: String(it.id ?? ""),
        restaurant_id: restaurantId,
        name: String(it.name ?? ""),
        category: catTitle,
        price_paise: Math.round(Number(priceRupee) * 100),
        description:
          typeof it.description === "string" ? it.description.slice(0, 280) : null,
        is_veg:
          it.isVeg === true ? true : it.isVeg === false ? false : null,
        image_url: (it.imageUrl as string | undefined) ?? null,
        has_variants: !!(it.hasVariants ?? it.has_variants),
        has_addons: !!(it.hasAddons ?? it.has_addons),
        raw_data: {},
      });
    }
  }

  for (const c of categories) {
    const ct = String(c.title ?? "");
    walk(ct, c.items as Record<string, unknown>[] | undefined);
    const subs = c.subcategories;
    if (subs)
      for (const s of subs)
        walk(
          ct + " › " + String(s.title ?? ""),
          s.items as Record<string, unknown>[] | undefined,
        );
  }
  return out.filter((r) => r.id && r.restaurant_id);
}
