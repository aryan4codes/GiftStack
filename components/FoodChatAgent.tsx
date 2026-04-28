"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/magicui/animated-number";
import Link from "next/link";

export function FoodChatAgent({
  giftId,
  budgetPaise,
}: {
  giftId: string;
  budgetPaise: number;
}) {
  const [input, setInput] = React.useState("");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/agent/chat",
      body: { giftId },
    }),
  });

  return (
    <div className="flex min-h-[520px] flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-[var(--color-text-muted)]">Food credit</p>
        <p className="text-lg font-semibold text-[var(--color-accent)]">
          <AnimatedNumber value={Math.round(budgetPaise / 100)} prefix="₹" />
        </p>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden bg-white p-4">
        <div className="scrollbar-thin max-h-[400px] flex-1 space-y-4 overflow-y-auto pb-4">
          {messages.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              Say what you&apos;re in the mood for — the agent searches cached menus
              and builds your cart within budget.
            </p>
          ) : null}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-[var(--color-accent-soft)] text-[var(--color-text)]"
                    : "bg-neutral-50 text-neutral-900"
                }`}
              >
                {m.parts
                  .filter((part) => part.type === "text")
                  .map((part, i) => (
                    <span key={`${m.id}-${i}`}>
                      {"text" in part ? part.text : ""}
                    </span>
                  ))}
              </div>
            </div>
          ))}
          {status === "streaming" || status === "submitted" ? (
            <p className="text-xs text-[var(--color-text-muted)]">
              Thinking with tools…
            </p>
          ) : null}
        </div>
        <form
          className="mt-4 flex gap-2 border-t border-neutral-100 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            void sendMessage({ text: input });
            setInput("");
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Try: "Japanese or Thai, something light"'
            className="flex-1"
          />
          <Button type="submit" disabled={status === "streaming"}>
            Send
          </Button>
        </form>
      </Card>

      <Button variant="outline" asChild className="w-full sm:w-auto">
        <Link href={`/g/${giftId}/confirmed`}>View confirmation</Link>
      </Button>
    </div>
  );
}
