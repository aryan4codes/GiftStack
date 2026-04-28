export type GiftStatus =
  | "created"
  | "opened"
  | "choosing"
  | "redeemed"
  | "expired";

export type ChosenType = "dineout" | "instamart" | "food";

export interface DineoutOption {
  restaurant_id: string;
  name: string;
  cuisine?: string;
  area?: string;
  avg_cost_for_2?: number;
  image_url?: string;
  pitch: string;
  rank: number;
}

export interface InstamartOption {
  tier: string;
  description: string;
  items: Array<{
    item_id: string;
    name: string;
    qty: number;
    price_paise: number;
    /** From cached_instamart_products.image_url when available */
    image_url?: string;
  }>;
  estimated_total_paise: number;
}

export interface FoodCreditOption {
  amount_paise: number;
  description: string;
}

export interface GiftOptionsPayload {
  dineout: DineoutOption[];
  instamart: InstamartOption;
  food_credit: FoodCreditOption;
}

export interface ParsedIntent {
  recipient_type?: string;
  city: string;
  budget_paise: number;
  occasion: string;
  dineout_query?: string;
  tone?: string;
  message_draft: string;
  needs_manual?: boolean;
}
