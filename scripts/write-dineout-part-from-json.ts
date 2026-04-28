/**
 * Build data/mcp-seeds/parts/part-dineout-mumbai.json from
 * data/mcp-seeds/dineout-north-data.json (array of MCP Dine shapes).
 *
 * Run: npx tsx scripts/write-dineout-part-from-json.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { dineRestToCached, type DineSearchRest } from "./mcp-transformers";

const inPath = path.join(process.cwd(), "data/mcp-seeds/dineout-north-data.json");

function main() {
  const raw = JSON.parse(fs.readFileSync(inPath, "utf8")) as unknown;
  const rests = raw as DineSearchRest[];

  const part = {
    _meta: { kind: "dineout_merged_north_indian", source: "write-dineout-part-from-json.ts" },
    // map(fn) passes (i, idx) as 2nd/3rd args — never pass dineRestToCached directly
    cached_dineout_restaurants: rests.map((r) => dineRestToCached(r)),
  };

  const out = path.join(process.cwd(), "data/mcp-seeds/parts/part-dineout-mumbai.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(part, null, 2), "utf8");
  console.log(`Wrote ${out} (${part.cached_dineout_restaurants.length} rows)`);
}

main();
