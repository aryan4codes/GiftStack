import { createServiceClient } from "@/lib/supabase/admin";
import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, tool } from "ai";
import { z } from "zod";

type CartLine = {
  restaurant_id: string;
  restaurant_name: string;
  menu_item_id: string;
  name: string;
  qty: number;
  price_paise: number;
};

function sumCart(lines: CartLine[]) {
  return lines.reduce((s, l) => s + l.price_paise * l.qty, 0);
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const giftId = typeof body.giftId === "string" ? body.giftId : null;
  const messages = body.messages;
  if (!giftId || !Array.isArray(messages)) {
    return new Response("giftId and messages required", { status: 400 });
  }

  const sb = createServiceClient();
  const { data: gift, error: gErr } = await sb
    .from("gifts")
    .select("*")
    .eq("id", giftId)
    .single();
  if (gErr || !gift) {
    return new Response("Gift not found", { status: 404 });
  }

  const city = String(gift.city);
  const budgetPaise = Number(gift.budget_paise);

  let modelMessages: Awaited<ReturnType<typeof convertToModelMessages>>;
  try {
    modelMessages = await convertToModelMessages(
      messages as Parameters<typeof convertToModelMessages>[0]
    );
  } catch {
    return new Response("Invalid messages shape", { status: 400 });
  }

  const model =
    process.env.OPENAI_FAST_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4.1-nano";

  async function loadCart(): Promise<CartLine[]> {
    const { data } = await sb
      .from("gifts")
      .select("food_cart")
      .eq("id", giftId)
      .single();
    const raw = data?.food_cart;
    if (!raw || !Array.isArray(raw)) return [];
    return raw as CartLine[];
  }

  async function saveCart(lines: CartLine[]) {
    await sb.from("gifts").update({ food_cart: lines }).eq("id", giftId);
  }

  const result = streamText({
    model: openai(model),
    system: `You are GiftStack's conversational food ordering agent (demo). You only have access to cached restaurants and menus in our database for city: ${city}.

Rules:
- Budget in paise: ${budgetPaise} (₹${(budgetPaise / 100).toFixed(0)}). Total cart must NEVER exceed this.
- Call get_food_cart after add/remove to show truth to the user.
- Before place_food_order: confirm address is OK (demo assumes saved address) and get explicit "yes" / "place order".
- Be concise, warm, and helpful. Mention you're using cached Swiggy catalog for the demo.`,
    messages: modelMessages,
    stopWhen: stepCountIs(18),
    tools: {
      search_restaurants: tool({
        description: "Search cached restaurants by name or cuisine keywords",
        inputSchema: z.object({ query: z.string().min(1) }),
        execute: async ({ query }) => {
          const { data } = await sb
            .from("cached_food_restaurants")
            .select("*")
            .ilike("city", `%${city}%`)
            .limit(60);
          const q = query.toLowerCase();
          const rows =
            data?.filter(
              (r) =>
                String(r.name).toLowerCase().includes(q) ||
                (Array.isArray(r.cuisine)
                  ? r.cuisine.some((c: string) =>
                      String(c).toLowerCase().includes(q)
                    )
                  : false)
            ) ?? [];
          return rows.slice(0, 12);
        },
      }),
      get_restaurant_menu: tool({
        description: "Get menu items for a restaurant (subset / search)",
        inputSchema: z.object({
          restaurant_id: z.string(),
          keyword: z.string().optional(),
        }),
        execute: async ({ restaurant_id, keyword }) => {
          if (keyword?.trim()) {
            const { data } = await sb
              .from("cached_food_menu_items")
              .select("*")
              .eq("restaurant_id", restaurant_id)
              .ilike("name", `%${keyword.trim()}%`)
              .limit(40);
            return data ?? [];
          }
          const { data } = await sb
            .from("cached_food_menu_items")
            .select("*")
            .eq("restaurant_id", restaurant_id)
            .limit(40);
          return data ?? [];
        },
      }),
      add_to_cart: tool({
        description: "Add a menu line to the gift food cart",
        inputSchema: z.object({
          restaurant_id: z.string(),
          restaurant_name: z.string(),
          menu_item_id: z.string(),
          name: z.string(),
          price_paise: z.number().int().positive(),
          qty: z.number().int().min(1).max(20),
        }),
        execute: async (line) => {
          const cart = await loadCart();
          const next = [...cart];
          const idx = next.findIndex(
            (l) =>
              l.menu_item_id === line.menu_item_id &&
              l.restaurant_id === line.restaurant_id
          );
          if (idx >= 0) {
            next[idx] = { ...next[idx], qty: next[idx].qty + line.qty };
          } else {
            next.push({
              restaurant_id: line.restaurant_id,
              restaurant_name: line.restaurant_name,
              menu_item_id: line.menu_item_id,
              name: line.name,
              price_paise: line.price_paise,
              qty: line.qty,
            });
          }
          const total = sumCart(next);
          if (total > budgetPaise) {
            return {
              ok: false,
              error: `That would exceed the ₹${(budgetPaise / 100).toFixed(0)} budget (cart would be ₹${(total / 100).toFixed(0)}).`,
              cart,
            };
          }
          await saveCart(next);
          return { ok: true, cart: next, total_paise: total };
        },
      }),
      get_food_cart: tool({
        description: "Return cart lines and total paise",
        inputSchema: z.object({}),
        execute: async () => {
          const cart = await loadCart();
          return { lines: cart, total_paise: sumCart(cart), budget_paise: budgetPaise };
        },
      }),
      clear_food_cart: tool({
        description: "Clear the cart",
        inputSchema: z.object({}),
        execute: async () => {
          await saveCart([]);
          return { ok: true };
        },
      }),
      place_food_order: tool({
        description:
          "Place order after user confirms. Marks gift redeemed and stores summary.",
        inputSchema: z.object({ confirm: z.boolean() }),
        execute: async ({ confirm }) => {
          if (!confirm) return { ok: false, error: "Not confirmed" };
          const cart = await loadCart();
          const total = sumCart(cart);
          if (total <= 0) {
            return { ok: false, error: "Cart is empty" };
          }
          if (total > budgetPaise) {
            return { ok: false, error: "Over budget" };
          }
          await sb
            .from("gifts")
            .update({
              status: "redeemed",
              redeemed_at: new Date().toISOString(),
              chosen_type: "food",
              chosen_option: {
                type: "food",
                items: cart,
                total_paise: total,
                order_id: `GS-DEMO-${giftId}`,
              },
            })
            .eq("id", giftId);
          return {
            ok: true,
            message:
              "Swiggy order placed successfully (demo) — enjoy your meal!",
            order_id: `GS-DEMO-${giftId}`,
            total_paise: total,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
