import { query } from "./mySQL_connector.js";
import type { MarketSummary } from "./session_memory.js";

interface MarketSummaryRow {
  city: string;
  sold_count: string | number;
  average_price: string | number;
  price_per_sqft: string | number;
  days_on_market: string | number;
  list_to_close_ratio: string | number;
}

function numeric(value: string | number): number {
  return Number(value);
}

export async function getMarketSummary(city: string): Promise<MarketSummary | undefined> {
  const sql = `
    SELECT
        City AS city,
        COUNT(*) AS sold_count,
            ROUND(AVG(ClosePrice), 0) AS average_price,
            ROUND(AVG(ClosePrice / NULLIF(LivingArea,0)),0) AS price_per_sqft,
            ROUND(AVG(DaysOnMarket), 1) AS days_on_market,
            ROUND(AVG(ClosePrice / NULLIF(ListPrice,0)) * 100, 1) AS list_to_close_ratio
        FROM california_sold
        WHERE PropertyType = 'Residential'
            AND LOWER(City) = LOWER(?)
            AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            AND LivingArea > 0
        GROUP BY City
        LIMIT 1
        ;
    `;
  const [row] = await query<MarketSummaryRow>(sql, [city]);
  if (!row) {
    return undefined;
  }
  return {
    city: row.city,
    period: "Trailing 12 months",
    soldCount: numeric(row.sold_count),
    averagePrice: numeric(row.average_price),
    pricePerSqft: numeric(row.price_per_sqft),
    daysOnMarket: numeric(row.days_on_market),
    listToCloseRatio: numeric(row.list_to_close_ratio),
  };
}
