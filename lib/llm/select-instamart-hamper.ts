import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

export type InstamartCandidate = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  price_paise: number | null;
};

const pickSchema = z.object({
  item_ids: z.array(z.string()).min(1).max(5),
});

const MAX_IDS = 120;

/**
 * Score rows so sender intent (message + occasion) surfaces matching categories before
 * we cap the catalog. Price-only sampling was ranking premium bath/confectionery above
 * electronics and hiding mid-tier SKUs from the model entirely when the DB window was wrong.
 */
function scoreInstamartForIntent(
  p: InstamartCandidate,
  intentText: string,
): number {
  const m = intentText.toLowerCase();
  const blob = `${p.category ?? ""} ${p.name ?? ""} ${p.brand ?? ""}`.toLowerCase();
  let score = 0;
  /** Message hint must match AND product blob should look like that aisle. */
  const rails: { reMsg: RegExp; reProd: RegExp; w: number }[] = [
    {
      reMsg:
        /\b(electronics?|gadgets?|gadget|tech(?:ie)?|usb|charger|cables?|headphone|earbuds?|audio|power\s*bank|bluetooth|accessor(?:y|ies)|trimmer|shaver)\b/i,
      reProd:
        /electronics|electron|gadget|charger|cable|headphones?|earbuds?|power bank|speaker|keyboard|mouse|audio|bluetooth|trimmer|adapter|smart\b|gaming|tablet|buds\b|tws\b|anc\b/i,
      w: 8_000,
    },
    {
      reMsg: /self[\s-]?care|beauty|bath|skincare|wellness|pamper|skin care/i,
      reProd:
        /personal care|beauty|\bbath\b|shower|cosmetic|skin|body shop|\blotion|\bsoap|cream|serum|face wash/i,
      w: 6_000,
    },
    {
      reMsg:
        /\b(snacks?|chocolate|sweet|treat|munch|desserts?|cookies?)\b|\bfoods?\b|\bbeverages?\b/i,
      reProd:
        /chocolate|snack|wafer|biscuits?|confection|candy|chips|nuts\b|nuts |beverages?|juice|tea|coffee(?!\s*table)/i,
      w: 4_000,
    },
  ];
  for (const { reMsg, reProd, w } of rails) {
    if (reMsg.test(m) && reProd.test(blob)) score += w;
  }
  // Prefer pricier SKUs when intent is ambiguous (premium hamper heuristic).
  score += Math.min((p.price_paise ?? 0) / 50_000, 400);
  return score;
}

function sampleCatalog(
  products: InstamartCandidate[],
  intentText: string,
): InstamartCandidate[] {
  if (products.length <= MAX_IDS) return products;
  const trimmed = intentText.trim() || "(no message)";
  const scored = products.map((p) => ({
    p,
    s: scoreInstamartForIntent(p, trimmed),
  }));
  scored.sort(
    (a, b) => b.s - a.s || (b.p.price_paise ?? 0) - (a.p.price_paise ?? 0),
  );
  return scored.slice(0, MAX_IDS).map((x) => x.p);
}

export type HamperGiftContext = {
  occasion: string;
  message: string;
  tone?: string;
  budget_paise: number;
};

export async function selectInstamartItemIdsViaLlm(
  candidates: InstamartCandidate[],
  ctx: HamperGiftContext,
): Promise<string[] | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  if (candidates.length === 0) return null;

  const intentText = [ctx.message, ctx.occasion].filter(Boolean).join("\n");
  const capped = sampleCatalog(candidates, intentText);
  const catalog = capped.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand ?? "",
    category: p.category ?? "",
    price_inr:
      typeof p.price_paise === "number" && p.price_paise > 0
        ? Math.round(p.price_paise / 100)
        : 0,
  }));

  const budgetInr = Math.max(1, Math.round(ctx.budget_paise / 100));

  const model =
    process.env.OPENAI_FAST_MODEL ??
    process.env.OPENAI_MODEL ??
    "gpt-4.1-nano";

  try {
    const { object } = await generateObject({
      model: openai(model),
      schema: pickSchema,
      system: `You compose Instamart gift hamper line-items for GiftStack demo.

RULES — non-negotiable:
- ONLY choose product id strings from JSON "catalog[].id" (Swiggy SKUs). Never invent ids.
- Return 1 to 5 item_ids ordered by relevance (hero item first).
- Total sum of catalogue prices (price_inr × 1 qty) must NOT exceed ₹${budgetInr}. If unsure, skew cheaper.
- Use product "category" (Instamart aisle/type) together with brand and name — category is the main thematic lever (snacks, beverages, personal care, electronics, etc.).
- Match category + brand + name to the sender's intent. If they ask for electronics / gadgets / tech, choose products whose category clearly lives under Electronics (or similar), not bath or confectionery unless the message also asks for those.
- When budget is tight, prefer cheaper SKUs in the requested category (from the catalog) over unrelated premium items that happen to fit the rupee cap.
- Coherent hamper: fewer stronger picks beat random variety.`,
      prompt: JSON.stringify({
        occasion: ctx.occasion.replace(/_/g, " "),
        tone_hint: ctx.tone ?? "",
        sender_message_and_intent:
          ctx.message.slice(0, 4000) ||
          "(sender did not paste a prose message)",
        recipient_budget_inr: budgetInr,
        catalogue_size: catalog.length,
        catalog,
      }),
    });

    const unique = [...new Set(object.item_ids)];
    const allowed = new Set(catalog.map((c) => c.id));
    const filtered = unique.filter((id) => allowed.has(id));
    return filtered.length ? filtered.slice(0, 5) : null;
  } catch {
    return null;
  }
}
