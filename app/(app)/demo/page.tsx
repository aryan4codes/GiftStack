"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function DemoOperatorPage() {
  const [prompt, setPrompt] = React.useState(
    "Thank you gift for my client in Mumbai, ₹1500 budget, birthday"
  );
  const [result, setResult] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/demo/operator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const j = await res.json();
      setResult(JSON.stringify(j, null, 2));
    } catch {
      setResult("Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">
          Demo operator
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          One API call creates a gift with parsed intent + cached ranked options.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prompt</CardTitle>
          <CardDescription>Natural language — same as /create</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} />
          <Button onClick={run} disabled={loading}>
            {loading ? "Running…" : "Create demo gift"}
          </Button>
          {result ? (
            <pre className="max-h-80 overflow-auto rounded-md bg-neutral-50 p-4 text-xs">
              {result}
            </pre>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
