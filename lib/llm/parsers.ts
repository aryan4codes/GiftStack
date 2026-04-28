import Anthropic from "@anthropic-ai/sdk";
import type { ParsedIntent } from "@/types/gift";

const SYSTEM = `You are GiftStack's intent parser. Extract structured gifting parameters from the sender's free-form text.

Return ONLY valid JSON (no markdown) matching this shape:
{
  "recipient_type": string (optional),
  "city": string,
  "budget_paise": integer (Indian Rupees expressed in paise — ₹100 = 10000 paise),
  "occasion": short snake_case token e.g. birthday, thank_you, work_anniversary, professional_thanks,
  "dineout_query": short search phrase for restaurant vibe / cuisine + city tone,
  "tone": "premium" | "warm" | "celebratory" | "minimal",
  "message_draft": warm 2–3 sentence message Draft for the recipient,
  "needs_manual": boolean — true only if budget or city missing/ambiguous
}

If the user mentions rupees without "lakh/lac", treat as INR whole rupees.`;

export async function parseGiftIntent(text: string): Promise<ParsedIntent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallbackIntent(text);
  }
  const client = new Anthropic({ apiKey });
  const model =
    process.env.ANTHROPIC_HAIKU_MODEL ?? "claude-3-5-haiku-20241022";

  const res = await client.messages.create({
    model,
    max_tokens: 1200,
    system: SYSTEM,
    messages: [{ role: "user", content: text }],
  });
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    return fallbackIntent(text);
  }
  try {
    const raw = extractJson(block.text);
    const parsed = JSON.parse(raw) as ParsedIntent;
    return {
      recipient_type: parsed.recipient_type,
      city: parsed.city ?? "Bangalore",
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

function extractJson(s: string) {
  const m = s.match(/\{[\s\S]*\}/);
  return m ? m[0] : s;
}

function fallbackIntent(text: string): ParsedIntent {
  const budgetMatch = text.match(/₹?\s*([\d,]+)/);
  const rupees = budgetMatch
    ? Number(budgetMatch[1].replace(/,/g, ""))
    : 1500;
  return {
    city: "Bangalore",
    budget_paise: rupees * 100,
    occasion: "thank_you",
    dineout_query: "fine dining",
    tone: "warm",
    message_draft:
      "Here’s a little something to say thanks — pick what makes you happiest.",
    needs_manual: true,
  };
}
