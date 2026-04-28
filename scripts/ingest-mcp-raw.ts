/**
 * Batch-run import-mcp-snapshot.ts on everything under data/mcp-seeds/mcp-raw/.
 * Instamart query hints → category labels: keyed by basename (no extension).
 *
 * Usage: npx tsx scripts/ingest-mcp-raw.ts [--force]
 */
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

/** Basename stem → IM_QUERY_HINT (spaces ok) for Instamart product searches */
const INSTAMART_QUERY_HINTS: Record<string, string> = {
  "im-celebrations-gift-o0": "celebrations gift",
  "im-chocolate-box-o0": "chocolate gift box",
  "im-gift-hamper-o1": "gift hamper",
  "im-chocolates-o0": "chocolate gifting",
  "im-chocolates-o1": "premium chocolate gift",
  "im-dryfruit-hamper-o0": "dry fruit gift hamper",
  "im-premium-sweets-o0": "premium assorted sweets gift",
};

const rawDir = path.join(process.cwd(), "data/mcp-seeds/mcp-raw");
const importScript = path.join(process.cwd(), "scripts/import-mcp-snapshot.ts");

function main() {
  const force = process.argv.includes("--force");
  if (!fs.existsSync(rawDir)) {
    console.error(`Missing directory: ${rawDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(rawDir).filter((f) => f.endsWith(".json"));
  files.sort();

  for (const f of files) {
    const full = path.join(rawDir, f);
    const stem = path.basename(f, ".json");
    const hint = INSTAMART_QUERY_HINTS[stem];
    const env = { ...process.env };
    if (hint) env.IM_QUERY_HINT = hint;

    const args = ["tsx", importScript, full];
    if (force) args.push("--force");

    const r = spawnSync("npx", args, {
      env,
      stdio: "inherit",
      cwd: process.cwd(),
    });
    if (r.status !== 0) {
      console.error(`Failed: ${f}`);
      process.exit(r.status ?? 1);
    }
  }
  console.log(`Done. Processed ${files.length} file(s).`);
}

main();
