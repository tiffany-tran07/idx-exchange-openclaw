export type PropertyFilters = {
  city?: string;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  type?: string;
  pool?: string;
  hasView?: string;
};

export type ListingRow = Record<string, unknown> & {
  L_Address?: string;
  L_City?: string;
  price?: number;
};

export type MarketSummary = Record<string, unknown>;
