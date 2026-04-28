import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import type { ParsedIntent } from "@/types/gift";

/**
 * Parsing is intentionally **one structured LLM call**. Regex ladders duplicate the model,
 * drift from user language, and fight edge cases the model already understands (14k, slang,
 * “client in BLR”, mixed English–Hindi).
 *
 * We only use a tiny **offline default** when there is no API key or the call throws (network,
 * rate limit, etc.).
 */

const SYSTEM = `You parse free-form gift instructions for GiftStack (India, Swiggy-powered).

Output must follow the JSON schema. Be literal to the sender’s latest wording.

**recipient_type**
- A short phrase who it’s for (e.g. colleague, client, friend), or null if they didn’t say.

**City**
- Use the Indian city they name (common spellings: Bangalore/Bengaluru, Mumbai/Bombay…).
- If they give no city at all, set city to "Mumbai" and needs_manual=true.

**budget_inr** (whole rupees, integer)
- This is the *total* gift budget in INR rupees, NOT paise. We convert to paise downstream.
- Understand: "14k" → 14000, "1.5k" → 1500, "₹20,000" → 20000, "2 lac" / "2 lakh" → 200000.
- If they only say "small budget" without a number, pick a reasonable typical amount (e.g. 1500–3000) and set needs_manual=true.

**occasion**
- Short snake_case slug that matches their story: birthday, professional_thanks, professional_gadgets,
  food_gift, thank_you, anniversary, etc.—not a generic default if they were specific (e.g. electronics
  for a founder ≠ generic thank_you).

**dineout_query**
- Short phrase for ranking dine-out venues: cuisine, vibe, or intent (e.g. "Japanese dinner",
  "premium client dinner South Mumbai", "casual Italian").

**tone** — match the sender’s voice (warm default is fine if neutral).

**message_draft** — 1–3 sentences, suitable to show the recipient; reflect their occasion and tone.

**needs_manual** — true if budget or city is ambiguous or missing.`;

// OpenAI structured outputs require every `properties` key to be listed in `required`.
// Optional fields must be expressed as nullable (or removed), not z.optional().
const intentSchema = z.object({
  recipient_type: z
    .union([z.string(), z.null()])
    .describe("Who the gift is for, or null if not stated."),
  city: z.string(),
  budget_inr: z
    .number()
    .int()
    .positive()
    .describe(
      "Total budget in whole Indian rupees (not paise). Examples: 14000 for ‘14k’, 150000 for 1.5 lac.",
    ),
  occasion: z
    .string()
    .describe("snake_case label matching the sender’s situation."),
  dineout_query: z
    .string()
    .describe("Search-oriented hint for dine-out options (cuisine, vibe, area)."),
  tone: z.enum(["premium", "warm", "celebratory", "minimal"]),
  message_draft: z.string(),
  needs_manual: z.boolean(),
});

export async function parseGiftIntent(text: string): Promise<ParsedIntent> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return offlineDefaults();
  }

  const model =
    process.env.OPENAI_FAST_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4.1-nano";

  try {
    const { object: o } = await generateObject({
      model: openai(model),
      schema: intentSchema,
      system: SYSTEM,
      prompt: text.trim(),
    });

    return {
      recipient_type: o.recipient_type ?? undefined,
      city: o.city,
      budget_paise: Math.round(o.budget_inr * 100),
      occasion: o.occasion,
      dineout_query: o.dineout_query,
      tone: o.tone,
      message_draft: o.message_draft,
      needs_manual: o.needs_manual,
    };
  } catch (e) {
    console.error("parseGiftIntent", e);
    return offlineDefaults();
  }
}

function offlineDefaults(): ParsedIntent {
  return {
    city: "Mumbai",
    budget_paise: 150_000,
    occasion: "thank_you",
    dineout_query: "restaurants",
    tone: "warm",
    message_draft:
      "Configure OPENAI_API_KEY in your environment so we can read your message. Until then you can edit details in the next step.",
    needs_manual: true,
  };
}
