# MCP → JSON → Supabase

1. **In Cursor**, use the Swiggy MCP servers (Food, Dineout, Instamart) and copy tool responses you care about.
2. Paste / normalize rows into **`cache.json`** using the shape in **`template.cache.json`** (same keys as Supabase tables).
3. Run from project root:

```bash
npm run seed
```

Loads `cache.json` (or `MCP_CACHE_JSON`), upserts into `cached_*` tables via the service-role key (`NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`).

**Dineout slots:** rows in `cached_dineout_slots` are **replaced** per `restaurant_id` (delete then insert); omit `id` in JSON (serial in DB).

Tips: Prefer stable IDs from MCP (`restaurantId`, etc.) where possible so re-seeding updates rows instead of duplicating.
