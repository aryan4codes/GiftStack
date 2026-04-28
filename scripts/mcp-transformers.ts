/** Helpers to convert Swiggy MCP JSON → cache row shapes (used by import scripts). */

export type DineSearchRest = {
  id: string;
  name: string;
  cuisine: string[];
  area: string;
  rating: { value: string; count: number };
  costForTwo?: string;
  imageUrl?: string;
  highlights?: string[];
  distance?: string;
};

export type FoodSearchRest = {
  id: string;
  name: string;
  cuisines?: string[];
  areaName?: string;
  avgRating?: number;
  deliveryTimeRange?: string;
  imageUrl?: string;
  availabilityStatus?: string;
  distanceKm?: number;
};

export function dineRestToCached(
  r: DineSearchRest,
  city = "Mumbai",
  coords: [number, number] = [19.076, 72.8777]
): Record<string, unknown> {
  const cost = r.costForTwo ?? "";
  const avg = /\d+/.exec(String(cost).replace(/,/g, ""))?.[0];
  const ratingNum = parseFloat(r.rating?.value);
  const ratingCount =
    typeof r.rating?.count === "number" ? r.rating.count : Number(r.rating?.count ?? 0) || null;
  return {
    id: String(r.id),
    name: r.name,
    cuisine: r.cuisine ?? [],
    area: r.area ?? "",
    city,
    avg_cost_for_two: avg ? parseInt(avg, 10) : null,
    rating: Number.isFinite(ratingNum) ? ratingNum : null,
    rating_count: ratingCount && Number.isFinite(ratingCount) ? ratingCount : null,
    image_url: r.imageUrl ?? null,
    highlights: r.highlights ?? [],
    latitude: coords[0],
    longitude: coords[1],
    raw_data: { distance: r.distance },
  };
}

export function foodRestToCached(
  r: FoodSearchRest,
  city = "Mumbai"
): Record<string, unknown> {
  const name = String(r.name ?? "").replace(/\s*\(Ad\)\s*/gi, "").trim();
  return {
    id: String(r.id),
    name,
    cuisine: r.cuisines ?? [],
    area: String(r.areaName ?? "").trim(),
    city,
    rating: r.avgRating ?? null,
    delivery_time: r.deliveryTimeRange ?? null,
    image_url: r.imageUrl ?? null,
    availability_status: r.availabilityStatus ?? "OPEN",
    raw_data: { distanceKm: r.distanceKm },
  };
}
