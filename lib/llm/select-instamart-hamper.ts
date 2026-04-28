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

const MAX_IDS = 96;

function sampleCatalog(products: InstamartCandidate[]): InstamartCandidate[] {
  if (products.length <= MAX_IDS) return products;
  const sorted = [...products].sort(
    (a, b) => (b.price_paise ?? 0) - (a.price_paise ?? 0),
  );
  return sorted.slice(0, MAX_IDS);
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

  const capped = sampleCatalog(candidates);
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
- Match category + brand + name to the sender's intent: birthday treats vs gadgets vs chocolates vs wellness snacks, etc.
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
