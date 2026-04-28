# GiftStack — Product Requirements Document

**Version:** 2.0 (Builders Club Demo)
**Date:** April 2026
**Status:** Active
**Purpose:** Demo application for Swiggy Builders Club application
**Badge:** Powered by Swiggy MCP

---

## Executive Summary

GiftStack is a corporate and personal gifting platform that converts gifting intent into a real, delivered experience — not a voucher code. A sender sets a budget and occasion in under 30 seconds. The recipient receives a link and picks from three curated options: a restaurant booking via Swiggy Dineout MCP, a delivered hamper via Swiggy Instamart MCP, or a food credit via Swiggy Food MCP. The order is placed automatically on the recipient's Swiggy account the moment they confirm.

This document describes the MVP built as a demo for the Swiggy Builders Club application. The primary goal of this build is to demonstrate deep, meaningful integration across all three Swiggy MCP servers — Dineout, Instamart, and Food — in a single coherent product experience. The platform showcases what is possible when MCP APIs are used not as a search layer but as a live fulfilment rail.

---

## Demo Context — Builders Club Application

This build is the GiftStack demo submitted alongside the Swiggy Builders Club application. The following principles guide every decision in this version:

- **Showcase breadth:** All three MCP servers (Food, Instamart, Dineout) must be used visibly and meaningfully
- **Showcase depth:** MCP is used for the full tool chain — search, details, slots, cart, book, order — not just search
- **Minimal friction:** The demo must be completable by a reviewer in under 5 minutes
- **"Powered by Swiggy MCP" badge:** Displayed prominently in the site header, on the gift link page, and in the confirmation screen
- **Polish:** The UI must feel production-ready, not a prototype — it represents the quality of work being proposed

---

## Problem Statement

### For Senders
- Corporate gifting defaults to generic Amazon gift cards or dry fruit hampers with zero emotional resonance
- Personal gifting requires time, research, and coordination the sender rarely has
- No platform ties gifting intent to a real, instantaneous experience delivered through Swiggy's infrastructure

### For Recipients
- Gift cards expire unused or get forgotten in email inboxes
- Physical hampers arrive battered or full of items nobody asked for
- The gap between "I'll treat you" and an actual meal being delivered has never been closed by any product

### For Companies
- No structured platform for recurring gifting (birthdays, work anniversaries, onboarding)
- No visibility into whether the gift was actually used
- Budget tracking across distributed employee gifts is manual and error-prone

---

## Top 3 LLM Integrations

These three LLM layers are included in this demo build. They are the highest-leverage points where AI adds visible, tangible value — not cosmetic intelligence.

### LLM #1 — Gift Intention Parser (Replaces the Form)

The gift creation form is replaced with a single natural language input. The sender types their intent in plain English and the LLM converts it into structured parameters that drive all subsequent MCP calls.

**Input:**
> "Want to say thank you to my client in Bangalore who helped close a big deal, around ₹1,500"

**LLM Output (structured JSON):**
```json
{
  "recipient_type": "client",
  "city": "Bangalore",
  "budget_paise": 150000,
  "occasion": "professional_thanks",
  "dineout_query": "fine dining business Bangalore",
  "tone": "premium",
  "message_draft": "This one's been a long time coming — couldn't have done it without you. Enjoy a well-earned meal on us."
}
```

This struct is passed directly to the MCP pre-fetch layer. The LLM is the form. No dropdowns, no friction.

**Model:** Claude Haiku (fast, cheap, structured output via tool_use)
**Prompt strategy:** System prompt defines the JSON schema; user message is freeform sender input
**Fallback:** If LLM parse fails or confidence is low, drop back to the standard form fields

---

### LLM #2 — Option Ranker + Pitch Writer (Between MCP Fetch and Display)

`dineout search` and `dineout details` return raw restaurant data — names, cuisines, costs, tags. The LLM sits between this raw data and the recipient's screen. It ranks the restaurants for appropriateness to the occasion and writes a one-line pitch for each that makes the recipient want to choose it.

**Input to LLM:** Raw MCP response + occasion context + recipient type
**Output from LLM:** Ranked list with pitch copy per restaurant

```json
[
  {
    "restaurant_id": "rest_229",
    "rank": 1,
    "pitch": "Rare Burmese cuisine in a stunning space — an experience, not just a meal"
  },
  {
    "restaurant_id": "rest_001",
    "rank": 2,
    "pitch": "Quiet, warm Italian — ideal for a long catch-up over wine"
  }
]
```

The recipient sees the LLM's pitch on their gift card, not raw MCP data. This is the difference between a list and a recommendation. Same logic applies to the Instamart hamper — the LLM writes the hamper description from the item list.

**Model:** Claude Haiku
**When it runs:** Async background task triggered immediately after gift creation, before the gift email is sent

---

### LLM #3 — Conversational Food Ordering (Recipient Experience, Food Credit Path)

For the Food MCP path, instead of a browse-and-pick UI, the recipient interacts with an LLM agent that calls Food MCP tools on their behalf. This is the core agentic loop — the primary showcase of MCP's power for the Builders Club demo.

**Conversation flow:**
```
Recipient: "Something light, maybe Japanese or Thai"

Agent → food search "Japanese Thai light Koramangala" → 6 results

Agent: "Edo Japanese has a great bento (₹480) and Ginja Thai has
a pad thai + curry combo (₹620). Want to see either menu?"

Recipient: "Show me Ginja Thai"

Agent → food menu rest_229 → full menu

Agent: "Their Pad Thai + Tom Kha combo is ₹580 — leaves ₹420 for
dessert or drinks. Want to add anything?"

Recipient: "Add the mango sticky rice"

Agent → food cart add item_441 → food cart add item_889

Agent: "Total ₹740. Shall I place the order? (~35 min delivery)"

Recipient: "Yes"

Agent → food order --confirm → Order ID returned
```

The LLM decides which MCP tools to call and when, based on the conversation state. This is a proper agentic loop using the MCP Python SDK's `ClientSession.call_tool()` method inside the LLM's tool-use cycle.

**Model:** Claude Sonnet 4 (multi-turn, agentic tool-calling)
**MCP tools available to agent:** `food_search`, `food_menu`, `food_cart_add`, `food_cart_show`, `food_cart_clear`, `food_order`

---

## Tech Stack

### Core Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend | Next.js 15 (App Router) | Server components, fast routing, ideal for MCP async flows |
| Styling | Tailwind CSS v4 | Utility-first, consistent spacing system |
| UI Components | shadcn/ui | Accessible, unstyled-by-default, full design control |
| Animations | Magic UI | Subtle, premium motion — shimmer, fade, number counters |
| Auth | Clerk | Best-in-class auth UX, drop-in React components, webhooks for user sync |
| Database | Supabase (Postgres) | Realtime subscriptions for gift status, RLS for security |
| Backend API | Next.js API Routes + Python FastAPI (MCP layer) | Next.js handles app logic; FastAPI handles MCP client sessions |
| MCP Client | `mcp` Python SDK (StreamableHTTP) | Official SDK, async-first, supports all three Swiggy servers |
| LLM | Anthropic Claude API | Haiku for parsing/ranking, Sonnet for agentic ordering |
| Email | Resend | Clean API, React Email templates, reliable deliverability |
| Payments | Razorpay | India-native, fast integration, UPI support |
| Deployment | Vercel (Next.js) + Railway (FastAPI MCP layer) | Zero-config, instant preview URLs |

### Why Clerk Over Supabase Auth
Clerk handles the sender authentication layer (magic link / Google OAuth). It provides:
- Pre-built `<SignIn />`, `<UserButton />`, `<SignedIn />` components that match the shadcn design system
- Webhooks that sync user creation to Supabase automatically
- Session management that works cleanly with Next.js App Router middleware
- The recipient Swiggy OAuth flow is separate and handled by the FastAPI MCP layer — Clerk only manages GiftStack sender accounts

### Auth Architecture (Two Separate Auth Flows)
```
SENDER AUTH (Clerk)
  └── Signs up / logs in to GiftStack
  └── Managed by Clerk
  └── Synced to Supabase users table via Clerk webhook

RECIPIENT AUTH (Swiggy OAuth 2.1 PKCE)
  └── Triggered only at gift redemption
  └── Managed by FastAPI MCP layer
  └── Token used for single MCP session, never stored
```

---

## UI Design System

### Design Philosophy
The UI must feel like a premium gifting product — not a food delivery utility. Every surface, spacing decision, and motion must communicate quality and intention. Reference aesthetic: Linear, Stripe, Luma.

### Colour Palette
```css
/* Neutral foundation — warm off-whites and rich darks */
--color-bg:          #FAFAF9;   /* Warm white */
--color-surface:     #FFFFFF;
--color-border:      rgba(0,0,0,0.08);
--color-text:        #1A1A1A;
--color-text-muted:  #6B6B6B;
--color-text-faint:  #B0B0B0;

/* Single accent — Swiggy Orange, used sparingly */
--color-accent:      #FC8019;   /* Swiggy brand orange */
--color-accent-soft: #FFF3E8;   /* Accent tint for badges */

/* "Powered by Swiggy MCP" badge */
--badge-bg:          #FC8019;
--badge-text:        #FFFFFF;
```

### Typography
```
Display font:  Instrument Serif (Google Fonts) — for gift messages and hero headings
Body font:     Geist (Vercel) — for UI chrome, labels, buttons
```

### shadcn/ui Components Used
- `Card`, `CardContent` — gift option cards
- `Button` (primary / ghost variants) — CTAs
- `Input`, `Textarea` — gift creation form
- `Badge` — "Powered by Swiggy MCP", status chips
- `Dialog` — confirmation modals
- `Skeleton` — loading states during MCP pre-fetch
- `Separator` — visual dividers
- `Avatar` — sender profile in gift link header
- `Progress` — gift budget usage bar

### Magic UI Components Used
- `ShimmerButton` — primary CTA on gift creation ("Send Gift")
- `AnimatedNumber` — gift value counter, redemption stats
- `FadeIn` — gift option cards entering the viewport
- `BorderBeam` — subtle animated border on the chosen gift option card
- `Particles` — confetti-style effect on booking confirmation screen
- `TypingAnimation` — LLM-generated message appearing character by character in the message preview

### "Powered by Swiggy MCP" Badge
Displayed in three locations:
1. **Site header** — right side, always visible, links to `mcp.swiggy.com/builders`
2. **Gift link page** — below the sender's name, before the options
3. **Confirmation screen** — footer of the booking/order confirmation

```tsx
// components/SwiggyMCPBadge.tsx
export function SwiggyMCPBadge() {
  return (
    <a
      href="https://mcp.swiggy.com/builders"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full bg-[#FC8019] 
                 px-3 py-1 text-xs font-medium text-white hover:bg-[#e5701a] 
                 transition-colors"
    >
      <SwiggyIcon className="h-3 w-3" />
      Powered by Swiggy MCP
    </a>
  )
}
```

---

## MCP Service Architecture

GiftStack uses all three Swiggy MCP servers. Each fires at a specific, meaningful stage.

### MCP Tool Map

| Stage | MCP Server | Tool | Purpose |
|-------|-----------|------|---------|
| Gift creation (async) | Dineout | `dineout search` | Fetch restaurants matching occasion vibe in recipient's city |
| Gift creation (async) | Dineout | `dineout details` | Pull cuisine, cost-for-2, ambiance tags for option cards |
| Gift creation (async) | Instamart | `im search` | Search hamper-suitable products within budget |
| Recipient views date picker | Dineout | `dineout slots` | Fetch live table availability for chosen restaurant |
| Redemption — Dineout | Dineout | `dineout book` | Book table on recipient's authenticated Swiggy account |
| Redemption — Instamart | Instamart | `im cart add` | Add each hamper item to recipient's cart |
| Redemption — Instamart | Instamart | `im order` | Place delivery to recipient's address |
| Redemption — Food (agent) | Food | `food search` | LLM agent searches restaurants based on recipient's request |
| Redemption — Food (agent) | Food | `food menu` | LLM agent fetches menu on recipient's request |
| Redemption — Food (agent) | Food | `food cart add` | LLM agent adds chosen items |
| Redemption — Food (agent) | Food | `food cart show` | Agent checks running total against budget |
| Redemption — Food (agent) | Food | `food order` | Agent places final order after recipient confirms |

### MCP Client Setup (FastAPI Layer)

```python
# mcp_client.py
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

SWIGGY_MCP_BASE = "https://mcp.swiggy.com"

async def get_mcp_session(server: str, access_token: str) -> ClientSession:
    """
    server: "food" | "im" | "dineout"
    access_token: recipient's Swiggy OAuth token (or platform token for pre-fetch)
    """
    url = f"{SWIGGY_MCP_BASE}/{server}"
    headers = {"Authorization": f"Bearer {access_token}"}
    async with streamablehttp_client(url, headers=headers) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            return session
```

### Auth Flow

```
Transport:  Streamable HTTP
Auth:       OAuth 2.1 with PKCE
Token use:  Per-request only — never stored in DB
Redirect:   https://giftstack.in/api/auth/swiggy/callback
State param: gift_id (passed through OAuth to re-associate after callback)
```

---

## Project Structure

```
giftstack/
├── app/                          # Next.js App Router
│   ├── (marketing)/
│   │   └── page.tsx              # Landing page
│   ├── (app)/
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Sender gift history
│   │   └── create/
│   │       └── page.tsx          # Gift creation flow
│   ├── g/
│   │   └── [giftId]/
│   │       ├── page.tsx          # Gift link — recipient choice UI
│   │       ├── redeem/
│   │       │   └── page.tsx      # Redemption flow (slots, address, confirm)
│   │       └── confirmed/
│   │           └── page.tsx      # Booking/order confirmation
│   └── api/
│       ├── gifts/
│       │   ├── create/route.ts   # POST — create gift, trigger MCP pre-fetch
│       │   └── [id]/
│       │       ├── route.ts      # GET status
│       │       └── choose/route.ts # POST — recipient selects option
│       ├── auth/
│       │   └── swiggy/
│       │       └── callback/route.ts  # Swiggy OAuth callback
│       └── webhooks/
│           └── clerk/route.ts    # Sync Clerk users to Supabase
│
├── mcp_service/                  # FastAPI — MCP client layer (Python)
│   ├── main.py                   # FastAPI app
│   ├── mcp_client.py             # Swiggy MCP session manager
│   ├── swiggy_tools.py           # Typed wrappers for each MCP tool
│   ├── llm_agent.py              # Claude agentic loop for Food path
│   ├── option_builder.py         # Pre-fetch + LLM ranking pipeline
│   └── intent_parser.py          # LLM #1 — freeform input → structured params
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── magicui/                  # Magic UI components
│   ├── SwiggyMCPBadge.tsx        # "Powered by Swiggy MCP" badge
│   ├── GiftCard.tsx              # Individual option card (Dineout/IM/Food)
│   ├── GiftCreationForm.tsx      # Freeform LLM intent input
│   ├── MessagePreview.tsx        # LLM-generated message with typing animation
│   ├── FoodChatAgent.tsx         # Conversational UI for Food credit path
│   └── ConfirmationScreen.tsx    # Post-redemption with Particles effect
│
├── lib/
│   ├── supabase.ts               # Supabase client
│   ├── clerk.ts                  # Clerk middleware config
│   └── utils.ts
│
└── middleware.ts                  # Clerk auth middleware — protects /dashboard, /create
```

---

## Data Model (Supabase)

### gifts table
```sql
CREATE TABLE gifts (
  id              TEXT PRIMARY KEY,           -- 8-char slug (e.g. "a3f9b2c1")
  sender_id       TEXT NOT NULL,              -- Clerk user ID
  sender_name     TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  budget_paise    INTEGER NOT NULL,
  occasion        TEXT NOT NULL,
  message         TEXT,
  city            TEXT NOT NULL,
  options         JSONB,                      -- Pre-fetched MCP results + LLM pitches
  chosen_option   JSONB,                      -- Set at redemption
  status          TEXT DEFAULT 'created',     -- created|opened|choosing|auth|redeemed|expired
  swiggy_order_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  opened_at       TIMESTAMPTZ,
  redeemed_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ                 -- created_at + 30 days
);

-- RLS: sender can only read/write their own gifts
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sender_owns_gift" ON gifts
  USING (sender_id = auth.uid());
```

### users table (synced from Clerk via webhook)
```sql
CREATE TABLE users (
  id              TEXT PRIMARY KEY,   -- Clerk user ID
  email           TEXT UNIQUE,
  name            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Options JSONB Schema
```json
{
  "dineout": [
    {
      "restaurant_id": "rest_001",
      "name": "Burma Burma",
      "cuisine": "Burmese",
      "area": "Indiranagar, Bangalore",
      "avg_cost_for_2": 1600,
      "image_url": "https://...",
      "pitch": "Rare Burmese cuisine in a stunning space — an experience, not just a meal",
      "rank": 1
    }
  ],
  "instamart": {
    "tier": "premium",
    "description": "A curated hamper of premium chocolates, artisan snacks, and cold brew to brighten their desk",
    "items": [
      { "item_id": "im_101", "name": "Lindt 70% Dark", "qty": 2, "price_paise": 32000 },
      { "item_id": "im_204", "name": "Perrier 750ml", "qty": 2, "price_paise": 18000 }
    ],
    "estimated_total_paise": 94000
  },
  "food_credit": {
    "amount_paise": 150000,
    "description": "Order anything from Swiggy — dinner for two, midnight snacks, or Sunday brunch"
  }
}
```

---

## Screen-by-Screen UI Spec

### Screen 1 — Landing Page (`/`)

**Purpose:** Communicate the product in 10 seconds. One CTA.

**Layout:**
- Full-viewport hero, centred, minimal
- `SwiggyMCPBadge` top-right of header alongside nav
- Headline: *"Gift an experience. Not a voucher."* (Instrument Serif, large)
- Subline: *"Send a Swiggy dinner, hamper, or food credit in 30 seconds. Recipient picks what they want."* (Geist, muted)
- Single CTA: `ShimmerButton` — "Send a Gift →"
- Below fold: 3-column explainer (Create / Choose / Experience) using `FadeIn` stagger
- Footer: `SwiggyMCPBadge` centered

**shadcn/Magic UI:** `ShimmerButton`, `FadeIn`, `AnimatedNumber` (show live redemption count)

---

### Screen 2 — Gift Creation (`/create`)

**Purpose:** Sender creates a gift in one input or a minimal form.

**Layout:**
- Left column (60%): Freeform intent input
  - Large textarea: *"Describe your gift in plain English…"*
  - Example prompts shown as subtle chips below input
  - As sender types, LLM parse result appears in real-time on the right (debounced 800ms)
- Right column (40%): Live preview panel
  - Shows parsed: city, occasion, budget
  - LLM-generated message draft with `TypingAnimation` effect
  - "Edit details manually" toggle reveals form fields if LLM parse is wrong
- Bottom: `ShimmerButton` — "Preview Gift Options"

**After "Preview Gift Options":**
- Inline loading state: "Checking restaurants in [city]…" → `Skeleton` cards for 3 options
- MCP pre-fetch runs (FastAPI), returns in 3–5 seconds
- Gift option preview slides in: 3 cards (Dineout / Instamart / Food)
- Each card shows LLM pitch copy, not raw data
- `BorderBeam` on the top-ranked card
- "Looks good — Send Gift" → Razorpay checkout → Gift created

**shadcn/Magic UI:** `Textarea`, `Skeleton`, `Card`, `BorderBeam`, `TypingAnimation`, `ShimmerButton`

---

### Screen 3 — Gift Link (`/g/[giftId]`)

**Purpose:** The recipient's first impression. Must feel like opening a real gift.

**Layout:**
- `SwiggyMCPBadge` top-right
- Sender's avatar (initials) + name centred
- Occasion tag (Birthday / Thank You / etc.) as a soft badge
- Message in Instrument Serif, large, warm
- Divider
- Three option cards in a row (desktop) / stacked (mobile):
  - **Dineout card:** Restaurant name, cuisine, area, LLM pitch, "Book a Table →"
  - **Instamart card:** Hamper name, item count, LLM description, "Get Delivered →"
  - **Food card:** "₹X to order anything", description, "Start Ordering →"
- `FadeIn` stagger on card appearance
- Expiry notice: "This gift expires in 23 days"

**shadcn/Magic UI:** `Card`, `Badge`, `FadeIn`, `Avatar`, `Separator`

---

### Screen 4 — Dineout Redemption (`/g/[giftId]/redeem?type=dineout`)

**Purpose:** Complete the table booking in as few steps as possible.

**Layout:**
- Restaurant details at top (name, image, area, cuisine)
- Date picker (next 14 days, today excluded)
- On date select → MCP call: `dineout slots` → time slot grid appears
- Guest count selector (1–6)
- Name field (pre-filled from Clerk session if sender redeems, blank for recipient)
- "Book Table" CTA
- → Swiggy OAuth redirect → callback → `dineout book` → Confirmation screen

**shadcn/Magic UI:** `Calendar`, `Button`, `Input`, `Skeleton` (while slots load)

---

### Screen 5 — Food Credit Redemption (`/g/[giftId]/redeem?type=food`)

**Purpose:** Conversational ordering — the agentic MCP showcase.

**Layout:**
- Budget indicator at top: "₹1,500 to spend" with `AnimatedNumber`
- Chat interface: messages from agent on left (Swiggy orange avatar), recipient on right
- Input field at bottom: "What are you in the mood for?"
- As agent calls MCP tools, a subtle status indicator shows: "Searching restaurants…", "Checking menu…", "Adding to cart…"
- Running cart total updates in real-time with `AnimatedNumber`
- "Place Order" button appears when recipient has confirmed they're done
- → Swiggy OAuth → `food order` → Confirmation

**shadcn/Magic UI:** Chat bubbles (custom with shadcn `Card`), `AnimatedNumber`, `Progress` bar for budget

---

### Screen 6 — Confirmation (`/g/[giftId]/confirmed`)

**Purpose:** The emotional payoff. Make it feel like something actually happened.

**Layout:**
- Full-screen `Particles` burst (confetti) on mount, 2 seconds
- Large checkmark icon, animated
- Booking/order details in a clean card:
  - Dineout: Restaurant, date, time, booking ID
  - Instamart: Items, estimated delivery time, order ID
  - Food: Restaurant, items, estimated delivery, order ID
- "Add to Calendar" button (Dineout only)
- "Share with [sender's name]" — triggers email notification to sender
- `SwiggyMCPBadge` centered at bottom

**shadcn/Magic UI:** `Particles`, `Card`, `Button`, `FadeIn`

---

### Screen 7 — Sender Dashboard (`/dashboard`)

**Purpose:** Gift management and redemption visibility.

**Layout:**
- Header: "Your Gifts" + "Send New Gift →" CTA
- Summary row: `AnimatedNumber` counters — Total Sent / Redeemed / Pending
- Gift list: each row shows recipient, occasion, budget, status chip, sent date
- Status chips: `Badge` variants — Sent (default) / Opened (blue) / Redeemed (green) / Expired (muted)
- Click a gift → expand to show: which option was chosen, order/booking ID, redemption timestamp
- "Resend" action on expired gifts

**shadcn/Magic UI:** `Badge`, `AnimatedNumber`, `Card`, `Separator`, `Progress`

---

## API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/gifts/create` | Clerk | Create gift, trigger async MCP pre-fetch, send email |
| `GET` | `/api/gifts/[id]` | Public | Get gift data for link page |
| `POST` | `/api/gifts/[id]/choose` | Public | Recipient selects option, initiate Swiggy OAuth |
| `GET` | `/api/auth/swiggy/callback` | Public | OAuth callback, trigger MCP fulfillment via FastAPI |
| `POST` | `/api/agent/chat` | Public + gift_id | LLM agent message — calls FastAPI MCP layer |
| `GET` | `/api/dashboard/gifts` | Clerk | Sender's gift list |
| `POST` | `/api/gifts/[id]/resend` | Clerk | Resend expired gift |
| `POST` | `/api/webhooks/clerk` | Clerk signature | Sync new users to Supabase |

---

## FastAPI MCP Service Endpoints

Internal service called by Next.js API routes. Not public-facing.

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/prefetch` | Given city + occasion, calls Dineout + Instamart MCP, returns options |
| `POST` | `/parse-intent` | LLM #1 — freeform text → structured gift params |
| `POST` | `/rank-options` | LLM #2 — raw MCP results → ranked with pitches |
| `POST` | `/dineout/slots` | Fetch live slots for a restaurant + date |
| `POST` | `/dineout/book` | Book table with recipient's OAuth token |
| `POST` | `/instamart/order` | Place hamper order with recipient's OAuth token |
| `POST` | `/food/chat` | LLM #3 agentic loop — processes one chat turn, may call Food MCP tools |
| `POST` | `/food/order` | Final order placement after agent confirms |

---

## Edge Cases & Handling

| Scenario | Handling |
|----------|---------|
| Dineout restaurant fully booked on chosen date | Show next available date automatically; if none within 7 days, surface second restaurant from pre-fetched list |
| Instamart item out of stock at redemption | LLM selects substitute item from same search category; shows updated list before confirming |
| Swiggy OAuth cancelled by recipient | Return to choice screen — gift remains unclaimed, no MCP calls fired |
| LLM intent parse fails | Silent fallback to standard form fields with pre-filled values where possible |
| MCP pre-fetch timeout at gift creation | Use cached popular restaurants per city (stored in Supabase); log for review |
| Recipient attempts to reuse a redeemed link | Show confirmation screen for the original redemption — do not allow second claim |
| Food agent exceeds budget in cart | Agent proactively informs recipient: "That would put you ₹120 over budget — want to swap something?" |
| Gift opened on mobile with small viewport | Single-column stacked cards; date picker uses native mobile calendar; chat agent full-screen |

---

## Build Sequence (8 Weeks)

| Week | Deliverable | MCP Tools Used |
|------|------------|----------------|
| 1 | Supabase schema + Clerk setup + FastAPI skeleton + MCP client wrapper | — |
| 2 | Gift creation form (freeform input) + LLM intent parser + Razorpay | — |
| 3 | MCP pre-fetch pipeline (Dineout search/details + Instamart search) + LLM option ranker | `dineout search`, `dineout details`, `im search` |
| 4 | Gift link page UI (recipient choice screen, 3 cards) + email delivery | — |
| 5 | Swiggy OAuth 2.1 PKCE flow + Dineout slots + booking fulfillment | `dineout slots`, `dineout book` |
| 6 | Instamart hamper order fulfillment + LLM hamper description | `im cart add`, `im order` |
| 7 | LLM #3 agentic food chat + Food MCP tool loop + order placement | `food search`, `food menu`, `food cart add`, `food order` |
| 8 | Sender dashboard + Confirmation screens (Particles) + SwiggyMCPBadge polish + QA across all paths |

---

## Demo Flow for Builders Club Reviewer (5 Minutes)

The following walkthrough is the canonical demo path submitted with the Builders Club application:

1. **Open giftstack.in** → See "Powered by Swiggy MCP" badge in header
2. **Click "Send a Gift"** → Type: *"Thank you gift for a friend in Mumbai, ₹1,000, birthday"*
3. **Watch LLM parse** → City, budget, occasion appear in real-time
4. **See gift options pre-populate** → 3 Dineout restaurants (from live Dineout MCP search), Instamart hamper, Food credit
5. **Click "Send Gift"** → Razorpay (test mode) → Gift link generated
6. **Open the gift link** → See recipient's view: sender name, message, 3 choice cards
7. **Choose Dineout** → Pick a date → See live slots (Dineout MCP) → Select time → Confirm
8. **Swiggy OAuth** → Log in → `dineout book` fires → Confirmation screen with Particles
9. **Return to dashboard** → See gift marked as "Redeemed" in real-time via Supabase subscription
10. **Try Food credit path** → Chat with agent → "I want sushi" → Agent calls `food search`, returns results, guides to checkout

Every MCP server is touched. All three LLM layers are visible. Total time: under 5 minutes.

