/**
 * One-off: sample Mumbai dine-out + Instamart rows relevant to "bars" + "electronics".
 * Run: npx tsx scripts/inspect-catalog-intent-samples.ts
 */
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const BAR_RE = /\b(bar|pub|lounge|brew|taproom|bier|cocktail|wine\s*&\s*dine)\b/i;
  const ELEC_RE =
    /\belectronics\b|gadget|charger|USB|buds|headphone|earbuds|Power bank|speaker/i;

  // --- Dine-out: Mumbai pool (same order as build-options tier-1 fetch) ---
  const { data: dineRows, error: dErr } = await sb
    .from("cached_dineout_restaurants")
    .select("id,name,city,cuisine,area,rating,avg_cost_for_two")
    .order("rating", { ascending: false, nullsFirst: false })
    .order("rating_count", { ascending: false, nullsFirst: false })
    .ilike("city", "%Mumbai%")
    .limit(120);

  if (dErr) {
    console.error("dineout:", dErr.message);
  } else {
    const rows = dineRows ?? [];
    const barLike = rows.filter((r) =>
      (r.cuisine as string[] | null)?.some((c) => BAR_RE.test(c)),
    );
    const barByName = rows.filter((r) => BAR_RE.test(String(r.name)));
    const unionBar = [...new Map([...barLike, ...barByName].map((r) => [r.id, r])).values()];

    console.log("\n=== cached_dineout_restaurants (Mumbai, rating-ordered limit 120) ===");
    console.log(`Rows returned: ${rows.length}`);
    console.log(
      `Cuisine/name matches bar|pub|lounge|brew|cocktail heuristic: ${unionBar.length}`,
    );
    if (unionBar.length) {
      console.log("\nSample bar-like:");
      unionBar.slice(0, 8).forEach((r) => {
        console.log(
          `  - ${r.name} | cuisines: ${JSON.stringify(r.cuisine)} | ${r.area ?? ""}`,
        );
      });
    }
    console.log("\nTop 8 by rating (what LLM pool starts from):");
    rows.slice(0, 8).forEach((r) => {
      console.log(`  - ${r.name} | cuisines: ${JSON.stringify(r.cuisine)}`);
    });
  }

  // Unique cuisine tokens containing "bar" etc. anywhere in Mumbai sample
  const { data: dineAll } = await sb
    .from("cached_dineout_restaurants")
    .select("cuisine")
    .ilike("city", "%Mumbai%")
    .limit(500);

  const tokenSet = new Set<string>();
  for (const r of dineAll ?? []) {
    for (const c of (r.cuisine as string[] | null) ?? []) {
      if (/bar|pub|lounge|brew|cocktail|wine/i.test(c)) tokenSet.add(c);
    }
  }
  console.log(
    `\nDistinct cuisine tokens (Mumbai sample 500 rows) mentioning bar/pub/lounge/... (${tokenSet.size}):`,
  );
  [...tokenSet].slice(0, 25).forEach((t) => console.log(`  · ${t}`));

  // --- Instamart: Electronics + Mumbai ---
  const { data: imHi } = await sb
    .from("cached_instamart_products")
    .select("id,name,category,price_paise,city")
    .order("price_paise", { ascending: false })
    .limit(400);

  const { data: imLo } = await sb
    .from("cached_instamart_products")
    .select("id,name,category,price_paise,city")
    .order("price_paise", { ascending: true })
    .limit(400);

  type ImRow = {
    id: string;
    name: string;
    category: string | null;
    price_paise: number | null;
    city: string | null;
  };
  const merged = new Map<string, ImRow>();
  for (const r of [...(imHi ?? []), ...(imLo ?? [])] as ImRow[]) {
    merged.set(String(r.id), r);
  }
  const imList = [...merged.values()];
  const lc = "mumbai";
  const mum = imList.filter(
    (p) => !p.city || String(p.city).toLowerCase().includes(lc),
  );
  const elec = mum.filter((p) => /^electronics/i.test(String(p.category ?? "")));
  const elecSoft = mum.filter((p) => ELEC_RE.test(`${p.category} ${p.name}`));

  console.log("\n=== cached_instamart_products (merged hi+low price tiers, deduped) ===");
  console.log(`Merged unique SKUs: ${imList.length}`);
  console.log(`Mumbai-filtered (~create flow): ${mum.length}`);
  console.log(`category starts with 'Electronics' (case-sensitive): ${elec.length}`);
  console.log(`category+name electronics heuristic: ${elecSoft.length}`);

  console.log("\nSample Electronics › … (category prefix):");
  elec.slice(0, 6).forEach((p) => {
    const inr =
      typeof p.price_paise === "number" ? Math.round(p.price_paise / 100) : "?";
    console.log(`  - ₹${inr} | ${String(p.category).slice(0, 55)}… | ${String(p.name).slice(0, 60)}…`);
  });

  console.log("\nSample non-electronics premium (first 6 by merge order hitting beauty/bath):");
  const beauty = mum.filter((p) =>
    /\bbeauty|bath|body|personal care/i.test(`${p.category} ${p.name}`),
  );
  beauty.slice(0, 6).forEach((p) => {
    const inr =
      typeof p.price_paise === "number" ? Math.round(p.price_paise / 100) : "?";
    console.log(`  - ₹${inr} | ${String(p.category).slice(0, 50)} | ${String(p.name).slice(0, 55)}…`);
  });

  console.log("\nDone.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
