-- Fast menu coverage counts for food picker (avoid fetching all rows client-side).

CREATE OR REPLACE FUNCTION public.food_menu_counts_by_restaurant_ids(rest_ids text[])
RETURNS TABLE (restaurant_id text, item_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT m.restaurant_id, COUNT(*)::bigint
  FROM public.cached_food_menu_items m
  WHERE rest_ids IS NOT NULL AND m.restaurant_id = ANY(rest_ids)
  GROUP BY m.restaurant_id;
$$;

GRANT EXECUTE ON FUNCTION public.food_menu_counts_by_restaurant_ids(text[]) TO anon, authenticated, service_role;
