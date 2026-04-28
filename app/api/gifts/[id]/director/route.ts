import { createServiceClient } from "@/lib/supabase/admin";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = createServiceClient();
  const { data: gift } = await sb.from("gifts").select("*").eq("id", id).single();
  if (!gift) {
    return new Response("Not found", { status: 404 });
  }

  const model =
    process.env.OPENAI_FAST_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4.1-nano";

  const result = streamText({
    model: openai(model),
    messages: [
      {
        role: "user",
        content: `You are the Gift Director. Write a short premium "unboxing" narration (under 120 words total) as 3 tiny paragraphs separated by blank lines — tease → occasion heart → inviting them to pick an experience. Occasion context: ${gift.occasion}. City: ${gift.city}. Sender name: ${gift.sender_name}. No markdown, warm tone.`,
      },
    ],
  });

  return result.toTextStreamResponse();
}
