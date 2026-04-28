import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

export type DineoutCandidate = {
  id: string;
  name: string;
  /** Full cuisine tags from cached_dineout_restaurants — primary signal for fit. */
  cuisines: string[];
  area: string;
  avg_for_two_inr: number | null;
  rating: number | null;
};

const pickSchema = z.object({
  restaurant_ids: z.array(z.string()).min(1).max(3),
});

const MAX_CANDIDATES = 64;

/** Boost catalog rows toward sender keywords so bar/pub venues aren't buried under rating-only ordering (fine dining dominates Mumbai caches). */
function scoreDineoutForIntent(c: DineoutCandidate, intentText: string): number {
  const m = intentText.toLowerCase();
  const cuis = c.cuisines.map((x) => x.toLowerCase()).join(" ");
  const blob = `${cuis} ${c.name.toLowerCase()} ${c.area.toLowerCase()}`;
  let score = 0;

  if (/\b(bars?|pubs?|lounges?|brew|brewery|cocktail|beer|drinks?|wine\s*bar|taproom)\b/i.test(m)) {
    if (/\bbar food\b/i.test(cuis) || /\b(pub|lounge|bar|brew|social|taproom|cocktail)\b/i.test(blob))
      score += 25_000;
  }

  if (/\b(lowkey|quiet|intimate|dessert|sweet\s*tooth|coffee|café|cafe)\b/i.test(m)) {
    if (/\b(dessert|bakery|cafe|café|continental|ice cream|coffee)\b/i.test(blob))
      score += 18_000;
  }

  if (/\b(client|business|professional|impress|formal|corporate)\b/i.test(m)) {
    if (/\b(chinese|continental|fusion|modern|north indian|multi cuisine|steak|grill|japanese)\b/i.test(blob))
      score += 8000;
    if ((c.avg_for_two_inr ?? 0) >= 2000) score += 2500;
  }

  score += (c.rating ?? 0) * 400;
  return score;
}

function capCandidates(
  candidates: DineoutCandidate[],
  intentText: string,
): DineoutCandidate[] {
  const intent = intentText.trim() || "(no message)";
  const sorted = [...candidates].sort(
    (a, b) =>
      scoreDineoutForIntent(b, intent) - scoreDineoutForIntent(a, intent),
  );
  if (sorted.length <= MAX_CANDIDATES) return sorted;
  return sorted.slice(0, MAX_CANDIDATES);
}

export type DineoutPickContext = {
  occasion: string;
  message: string;
  tone?: string;
  /** Gift headline in INR — soft hint for appropriate restaurant price tier. */
  gift_value_inr: number;
};

export async function selectDineoutRestaurantIdsViaLlm(
  candidates: DineoutCandidate[],
  ctx: DineoutPickContext,
): Promise<string[] | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  if (candidates.length === 0) return null;

  const intentText = [ctx.message, ctx.occasion].filter(Boolean).join("\n");
  const capped = capCandidates(candidates, intentText);
  const catalog = capped.map((c) => ({
    id: c.id,
    name: c.name,
    cuisines: c.cuisines,
    area: c.area || "",
    avg_for_two_inr: c.avg_for_two_inr,
    rating: c.rating,
  }));

  const model =
    process.env.OPENAI_FAST_MODEL ??
    process.env.OPENAI_MODEL ??
    "gpt-4.1-nano";

  try {
    const { object } = await generateObject({
      model: openai(model),
      schema: pickSchema,
      system: `You pick Swiggy Dineout restaurants for a gift card shortlist (demo).

RULES — non-negotiable:
- ONLY return restaurant id strings from JSON "catalog[].id". Never invent ids.
- Return 1–3 restaurant_ids, ordered by best fit (best first). Prefer 3 when the catalog allows.
- Primary signal: match "catalog[].cuisines" (array) to the sender's intent. Examples:
  - Lowkey, intimate, quiet, dessert, sweet tooth → favour dessert, bakery, cafe, ice cream, continental breakfast vibes in cuisines; avoid loud "bar / pub" unless it fits.
  - Client, business, impress, formal → favour Chinese, Continental, multi-cuisine fine, bar & grill, steak, rooftop, etc.; higher avg_for_two_inr when available.
  - Casual friends, beer → bar, pub, lounge in cuisines.
  - Family, kids → multi-cuisine, north indian, south indian as appropriate.
- CRITICAL: If the sender mentions bars, pubs, lounges, cocktails, beer, or drinking, you MUST prefer restaurants whose cuisines include "Bar Food" / bar-appropriate continental, OR whose name clearly signals Bar/Pub/Lounge/SOCIAL/brew — do NOT replace them with unrelated top-rated fine dining unless no bar-like row exists in the catalog.
- Use name and area as secondary hints (neighbourhood vibe); use avg_for_two_inr vs approximate_gift_value_inr as a soft price-tier check (not strict math).
- If nothing matches well, still pick the strongest available options from the catalog.`,
      prompt: JSON.stringify({
        occasion: ctx.occasion.replace(/_/g, " "),
        tone_hint: ctx.tone ?? "",
        sender_message_and_intent:
          ctx.message.slice(0, 4000) ||
          "(sender did not paste a prose message)",
        approximate_gift_value_inr: Math.max(1, Math.round(ctx.gift_value_inr)),
        catalogue_size: catalog.length,
        catalog,
      }),
    });

    const unique = [...new Set(object.restaurant_ids)];
    const allowed = new Set(catalog.map((c) => c.id));
    const filtered = unique.filter((id) => allowed.has(id));
    return filtered.length ? filtered.slice(0, 3) : null;
  } catch {
    return null;
  }
}
