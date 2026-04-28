-- GiftStack demo schema (Clerk sender + service-role API access)

CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gifts (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  recipient_name TEXT,
  recipient_email TEXT,
  budget_paise INTEGER NOT NULL,
  occasion TEXT NOT NULL,
  city TEXT NOT NULL,
  message TEXT,
  tone TEXT DEFAULT 'warm',
  options JSONB,
  chosen_option JSONB,
  chosen_type TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  food_cart JSONB DEFAULT '[]'::jsonb,
  redemption_meta JSONB,
  director_scene JSONB,
  swiggy_order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_gifts_sender ON public.gifts(sender_id);

CREATE TABLE IF NOT EXISTS public.cached_dineout_restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cuisine TEXT[],
  area TEXT,
  city TEXT NOT NULL,
  avg_cost_for_two INTEGER,
  rating NUMERIC,
  rating_count INTEGER,
  image_url TEXT,
  highlights TEXT[],
  latitude NUMERIC,
  longitude NUMERIC,
  raw_data JSONB
);

CREATE TABLE IF NOT EXISTS public.cached_dineout_slots (
  id SERIAL PRIMARY KEY,
  restaurant_id TEXT REFERENCES public.cached_dineout_restaurants(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  slot_group TEXT,
  display_time TEXT,
  slot_id INTEGER,
  item_id TEXT,
  reservation_time BIGINT,
  is_free BOOLEAN DEFAULT true,
  raw_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_slots_rest_date ON public.cached_dineout_slots(restaurant_id, date);

CREATE TABLE IF NOT EXISTS public.cached_food_restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cuisine TEXT[],
  area TEXT,
  city TEXT NOT NULL,
  rating NUMERIC,
  delivery_time TEXT,
  image_url TEXT,
  availability_status TEXT DEFAULT 'OPEN',
  raw_data JSONB
);

CREATE TABLE IF NOT EXISTS public.cached_food_menu_items (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT REFERENCES public.cached_food_restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  price_paise INTEGER,
  description TEXT,
  is_veg BOOLEAN,
  image_url TEXT,
  has_variants BOOLEAN DEFAULT false,
  has_addons BOOLEAN DEFAULT false,
  raw_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_menu_rest ON public.cached_food_menu_items(restaurant_id);

CREATE TABLE IF NOT EXISTS public.cached_instamart_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  price_paise INTEGER,
  image_url TEXT,
  city TEXT,
  raw_data JSONB
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_dineout_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_dineout_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_food_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_food_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_instamart_products ENABLE ROW LEVEL SECURITY;

-- Demo: anon read cached catalog — tighten in production.
CREATE POLICY "cached_dineout_read"
  ON public.cached_dineout_restaurants FOR SELECT TO anon USING (true);
CREATE POLICY "cached_slots_read"
  ON public.cached_dineout_slots FOR SELECT TO anon USING (true);
CREATE POLICY "cached_food_rest_read"
  ON public.cached_food_restaurants FOR SELECT TO anon USING (true);
CREATE POLICY "cached_menu_read"
  ON public.cached_food_menu_items FOR SELECT TO anon USING (true);
CREATE POLICY "cached_im_read"
  ON public.cached_instamart_products FOR SELECT TO anon USING (true);

-- Gifts: anon read for realtime / client — API still primary. Tighten for production.
CREATE POLICY "gifts_read_public_demo"
  ON public.gifts FOR SELECT TO anon USING (true);

-- No anon write on gifts/users in demo (writes via API + service role only).
