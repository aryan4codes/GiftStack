import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import type { GiftOptionsPayload } from "@/types/gift";

const rankCopySchema = z.object({
  dineout: z.array(
    z.object({
      restaurant_id: z.string(),
      rank: z.number().int().min(1),
      pitch: z.string(),
    })
  ),
  instamart: z.object({ description: z.string() }),
  food_credit: z.object({ description: z.string() }),
});

export async function enrichOptionsCopy(
  options: GiftOptionsPayload,
  occasion: string
): Promise<GiftOptionsPayload> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return heuristicCopy(options, occasion);
  }
  const model =
    process.env.OPENAI_FAST_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4.1-nano";

  const prompt = JSON.stringify({
    occasion,
    options,
    instruction:
      "Write premium one-line pitches for restaurant gift cards and concise hamper/food-credit blurbs.",
  });

  try {
    const { object: out } = await generateObject({
      model: openai(model),
      schema: rankCopySchema,
      system:
        "You write polished, premium, concise gift copy for food experiences. Keep pitches specific, warm, and under 18 words.",
      prompt,
    });
    const byId = new Map(out.dineout.map((d) => [d.restaurant_id, d]));
    /** Preserve rank/order from build-time intent (LLM hamper step). Rank-copy pitches only — re-ranking by "premium copy" bury bar/pub picks behind top-rated fine dining. */
    const dineout = [...options.dineout]
      .map((r) => {
        const enrich = byId.get(r.restaurant_id);
        return enrich ? { ...r, pitch: enrich.pitch } : r;
      })
      .sort((a, b) => a.rank - b.rank);
    return {
      ...options,
      dineout,
      instamart: {
        ...options.instamart,
        description: out.instamart?.description ?? options.instamart.description,
      },
      food_credit: {
        ...options.food_credit,
        description:
          out.food_credit?.description ?? options.food_credit.description,
      },
    };
  } catch {
    return heuristicCopy(options, occasion);
  }
}

function heuristicCopy(
  o: GiftOptionsPayload,
  occasion: string
): GiftOptionsPayload {
  return {
    ...o,
    dineout: o.dineout.map((r, i) => ({
      ...r,
      rank: i + 1,
      pitch:
        r.pitch ||
        `${r.name} — perfect for ${occasion.replace(/_/g, " ")} in town.`,
    })),
    instamart: {
      ...o.instamart,
      description:
        o.instamart.description ||
        "A curated hamper of snacks and treats within your budget.",
    },
    food_credit: {
      ...o.food_credit,
      description:
        o.food_credit.description ||
        "Order anything on Swiggy — dinner, snacks, or dessert — on us.",
    },
  };
}
