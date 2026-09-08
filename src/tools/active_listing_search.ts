import { query } from "./mySQL_connector.js";
import type { PropertyCriteria } from "./session_memory.js";

interface ActiveListingRow {
  id: string | number;
  address: string;
  price: string | number;
  beds: string | number;
  baths: string | number;
  sqft: string | number;
}

type ListingFilters = PropertyCriteria & { hasView?: boolean };

export async function searchActiveListings(filters: ListingFilters, page = 1, limit = 5) {
  const offset = (page - 1) * limit;
  let sql = `
     SELECT
        L_ListingID AS id, L_Address AS address,
        L_SystemPrice AS price, L_Keyword2 AS beds,
        LM_Dec_3 AS baths, LM_Int2_3 AS sqft
        FROM rets_property WHERE L_Status = "Active"
    `;
  const params: Array<string | number> = [];
  if (filters.city) {
    sql += " AND LOWER(L_City) = LOWER(?)";
    params.push(filters.city);
  }
  if (filters.maxPrice) {
    sql += " AND L_SystemPrice <= ?";
    params.push(filters.maxPrice);
  }
  if (filters.beds) {
    sql += " AND L_Keyword2 >= ?";
    params.push(filters.beds);
  }
  if (filters.baths) {
    sql += " AND LM_Dec_3 >= ?";
    params.push(filters.baths);
  }
  if (filters.sqft) {
    sql += " AND LM_Int2_3 >= ?";
    params.push(filters.sqft);
  }
  if (filters.type) {
    sql += " AND L_Type_ = ?";
    params.push(filters.type);
  }
  if (filters.pool) {
    sql += " AND PoolPrivateYN = ?";
    params.push("1");
  }
  if (filters.hasView) {
    sql += " AND ViewYN = ?";
    params.push("1");
  }
  sql += " ORDER BY L_SystemPrice ASC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  // console.log("Executing SQL:", sql, "with params:", params);
  return query<ActiveListingRow>(sql, params);
}
// if (process.argv[1] === new URL(import.meta.url).pathname) {
//   const user_query = process.argv[2];
//   try {
//     const activeListings = await searchActiveListings(JSON.parse(user_query));
//     console.log(JSON.stringify(activeListings));
//   } catch (err) {
//     console.error("Failed to search active listings");
//   } finally {
//     process.exit(0);
//   }
// }
