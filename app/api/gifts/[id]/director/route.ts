import { createServiceClient } from "@/lib/supabase/admin";
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

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
    process.env.ANTHROPIC_HAIKU_MODEL ?? "claude-3-5-haiku-20241022";

  const result = streamText({
    model: anthropic(model),
    messages: [
      {
        role: "user",
        content: `You are the Gift Director. Write a short premium "unboxing" narration (under 120 words total) as 3 tiny paragraphs separated by blank lines — tease → occasion heart → inviting them to pick an experience. Occasion context: ${gift.occasion}. City: ${gift.city}. Sender name: ${gift.sender_name}. No markdown, warm tone.`,
      },
    ],
  });

  return result.toTextStreamResponse();
}
