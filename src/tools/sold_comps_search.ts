import { query } from "./mySQL_connector.js";

interface SoldComparableRow {
  ListingKey: string;
  UnparsedAddress: string;
  City: string;
  CloseDate: Date | string;
  ClosePrice: number;
  OriginalListPrice: number;
  ListPrice: number;
  DaysOnMarket: number;
  BedroomsTotal: number;
  BathroomsTotalInteger: number;
  LivingArea: number;
  PropertyType: string;
  PropertySubType: string;
  YearBuilt: number;
  ListAgentFullName: string;
  ListOfficeName: string;
  BuyerOfficeName: string;
}

export async function getSoldComps(city: string, months = 12) {
  const sql = `
 SELECT
    ListingKey, UnparsedAddress, City, CloseDate, ClosePrice,
    OriginalListPrice, ListPrice, DaysOnMarket,
    BedroomsTotal, BathroomsTotalInteger, LivingArea,
    PropertyType, PropertySubType, YearBuilt,
    ListAgentFullName, ListOfficeName, BuyerOfficeName
    FROM california_sold
    WHERE LOWER(City) = LOWER(?)
    AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    AND PropertyType = "Residential"
    ORDER BY CloseDate DESC
    LIMIT 50
`;
  return query<SoldComparableRow>(sql, [city, months]);
}

// const city = process.argv[2];
// try {
//   const soldComps = await getSoldComps(city, 12);
//   console.log(JSON.stringify(soldComps));
// } catch (err) {
//   console.error("Failed to retrieve sold comps");
// } finally {
//   process.exit(0);
// }
