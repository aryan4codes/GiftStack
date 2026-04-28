import { createServiceClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/** Hydrate hamper lines with DB fields (images, brand) when gift JSON is stale */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("ids") ?? "";
  const ids = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))].slice(
    0,
    40
  );

  if (!ids.length) {
    return NextResponse.json({ products: [] });
  }

  const sb = createServiceClient();
  const { data, error } = await sb
    .from("cached_instamart_products")
    .select("id,name,brand,category,price_paise,image_url,city")
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data ?? [] });
}
