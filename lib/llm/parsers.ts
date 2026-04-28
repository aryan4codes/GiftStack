import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import type { ParsedIntent } from "@/types/gift";

const SYSTEM = `You are GiftStack's intent parser. Extract structured gifting parameters from the sender's free-form text.
Always set "city" to the Indian city the user names (e.g. Bangalore, Mumbai). Never substitute a default city when the prompt names one.
If the user mentions rupees without "lakh/lac", treat as INR whole rupees. Keep the output warm, practical, and India-local.`;

const intentSchema = z.object({
  recipient_type: z.string().optional(),
  city: z.string(),
  budget_paise: z
    .number()
    .int()
    .describe("Indian Rupees expressed in paise. INR 100 = 10000 paise."),
  occasion: z
    .string()
    .describe("Short snake_case token, e.g. birthday or professional_thanks."),
  dineout_query: z.string(),
  tone: z.enum(["premium", "warm", "celebratory", "minimal"]),
  message_draft: z.string(),
  needs_manual: z.boolean(),
});

export async function parseGiftIntent(text: string): Promise<ParsedIntent> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackIntent(text);
  }

  const model =
    process.env.OPENAI_FAST_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4.1-nano";

  try {
    const { object: parsed } = await generateObject({
      model: openai(model),
      schema: intentSchema,
      system: SYSTEM,
      prompt: text,
    });

    return {
      recipient_type: parsed.recipient_type,
      city: parsed.city ?? "Mumbai",
      budget_paise:
        typeof parsed.budget_paise === "number" ? parsed.budget_paise : 150000,
      occasion: parsed.occasion ?? "thank_you",
      dineout_query: parsed.dineout_query ?? "restaurants",
      tone: parsed.tone ?? "warm",
      message_draft: parsed.message_draft ?? "Thinking of you — enjoy.",
      needs_manual: !!parsed.needs_manual,
    };
  } catch {
    return fallbackIntent(text);
  }
}

/** Used when no API key or the model call fails. Extracts city, budget, and cues from text. */
function fallbackIntent(raw: string): ParsedIntent {
  const text = raw.trim();

  const rupees = extractRupees(text) ?? 1500;
  const city = extractCity(text) ?? "Mumbai";
  const occasion = guessOccasion(text);
  const tone = guessTone(text);
  const dineout_query = guessDineoutQuery(text, occasion);

  return {
    city,
    budget_paise: rupees * 100,
    occasion,
    dineout_query,
    tone,
    message_draft:
      tone === "premium"
        ? "A thoughtful pick for the occasion — enjoy something memorable on us."
        : "Here's a little something to say thanks — pick what makes you happiest.",
    needs_manual: true,
  };
}

function extractRupees(text: string): number | undefined {
  // Prefer explicit ₹ amounts; handles ₹2,000 and 2000 without symbol
  const inr =
    text.match(/₹\s*([\d,.]+)/i) ??
    text.match(/\brupees?\s*[:.]?\s*([\d,.]+)/i) ??
    text.match(/\bINR\s*([\d,.]+)/i);
  if (inr) {
    const n = Number(inr[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  // Last resort: first standalone number that looks like a budget (not a year)
  const loose = text.match(/\b(\d{3,7})\b/);
  if (loose) {
    const n = Number(loose[1]);
    if (n >= 100 && n <= 1_000_000) return n;
  }
  return undefined;
}

/** Ordered by specificity (multi-word cities first). */
const CITY_HINTS: ReadonlyArray<{ re: RegExp; city: string }> = [
  { re: /\bnew\s+delhi\b/i, city: "Delhi" },
  { re: /\bnavi\s+mumbai\b/i, city: "Mumbai" },
  { re: /\bbengaluru\b/i, city: "Bangalore" },
  { re: /\bbangalore\b/i, city: "Bangalore" },
  { re: /\bhyderabad\b/i, city: "Hyderabad" },
  { re: /\bchennai\b|\bmadras\b/i, city: "Chennai" },
  { re: /\bkolkata\b|\bcalcutta\b/i, city: "Kolkata" },
  { re: /\bpune\b/i, city: "Pune" },
  { re: /\bahmedabad\b/i, city: "Ahmedabad" },
  { re: /\bjaipur\b/i, city: "Jaipur" },
  { re: /\bgoa\b/i, city: "Goa" },
  { re: /\bkochi\b|\bernakulam\b/i, city: "Kochi" },
  { re: /\bgurgaon\b|\bgurugram\b/i, city: "Gurgaon" },
  { re: /\bnoida\b/i, city: "Noida" },
  { re: /\bchandigarh\b/i, city: "Chandigarh" },
  { re: /\bindore\b/i, city: "Indore" },
  { re: /\blucknow\b/i, city: "Lucknow" },
  { re: /\bcoimbatore\b/i, city: "Coimbatore" },
  { re: /\bmumbai\b|\bbombay\b/i, city: "Mumbai" },
  { re: /\bdelhi\b/i, city: "Delhi" },
];

function extractCity(text: string): string | undefined {
  for (const { re, city } of CITY_HINTS) {
    if (re.test(text)) return city;
  }
  return undefined;
}

function guessOccasion(text: string): string {
  const t = text.toLowerCase();
  if (/\b(birthday|bday)\b/.test(t)) return "birthday";
  if (/\banniversary\b/.test(t)) return "anniversary";
  if (/\bwedding\b/.test(t)) return "wedding";
  if (/\b(graduation|congrats)\b/.test(t)) return "celebration";
  if (/\b(client|professional|office|colleague|boss|investor)\b/.test(t))
    return "professional_thanks";
  if (/\bthank/.test(t)) return "thank_you";
  return "thank_you";
}

function guessTone(text: string): "premium" | "warm" | "celebratory" | "minimal" {
  const t = text.toLowerCase();
  if (/\b(premium|fancy|celebration|splash|splurge)\b/.test(t)) return "premium";
  if (/\b(minimal|simple|quiet)\b/.test(t)) return "minimal";
  if (/\b(birthday|party|celebrate)\b/.test(t)) return "celebratory";
  if (/\b(client|dinner|candle|chef|corporate)\b/.test(t)) return "premium";
  return "warm";
}

function guessDineoutQuery(text: string, occasion: string): string {
  const t = text.toLowerCase();
  if (/\bjapanese\b|\bsushi\b/.test(t)) return "Japanese / sushi";
  if (/\bindian\b|\bcurry\b/.test(t)) return "Indian";
  if (/\bitalian\b|\bpasta\b|\bpizza\b/.test(t)) return "Italian";
  if (/\bchinese\b/.test(t)) return "Chinese";
  if (/\bthai\b/.test(t)) return "Thai";
  if (/\bcontinental\b|\bsteak\b/.test(t)) return "Continental";
  if (/\bdinner\b/.test(t) || /\bmeal\b/.test(t)) return "sit-down dinner";
  if (occasion === "professional_thanks" || /\bclient\b/.test(t))
    return "professional dinner venues";
  return "restaurants";
}
