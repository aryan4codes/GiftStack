import Anthropic from "@anthropic-ai/sdk";
import type { GiftOptionsPayload } from "@/types/gift";

export async function enrichOptionsCopy(
  options: GiftOptionsPayload,
  occasion: string
): Promise<GiftOptionsPayload> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return heuristicCopy(options, occasion);
  }
  const client = new Anthropic({ apiKey });
  const model =
    process.env.ANTHROPIC_HAIKU_MODEL ?? "claude-3-5-haiku-20241022";

  const prompt = JSON.stringify({
    occasion,
    options,
    instruction:
      'Return ONLY JSON {"dineout":[{"restaurant_id":string,"rank":number,"pitch":string}],"instamart":{"description":string},"food_credit":{"description":string}}',
  });

  const res = await client.messages.create({
    model,
    max_tokens: 2000,
    system:
      "You write premium one-line pitches for restaurant gift cards and hamper blurbs. JSON only.",
    messages: [{ role: "user", content: prompt }],
  });
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    return heuristicCopy(options, occasion);
  }
  try {
    const m = block.text.match(/\{[\s\S]*\}/);
    const raw = m ? m[0] : block.text;
    const out = JSON.parse(raw) as {
      dineout: Array<{
        restaurant_id: string;
        rank: number;
        pitch: string;
      }>;
      instamart: { description: string };
      food_credit: { description: string };
    };
    const byId = new Map(out.dineout.map((d) => [d.restaurant_id, d]));
    const dineout = [...options.dineout]
      .map((r) => {
        const enrich = byId.get(r.restaurant_id);
        return enrich
          ? { ...r, pitch: enrich.pitch, rank: enrich.rank }
          : r;
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
