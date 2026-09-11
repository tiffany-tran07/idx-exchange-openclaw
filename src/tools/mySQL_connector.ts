import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

// The source file, compiled tool chunks, and bundled Gateway chunks live at
// different depths. Try the repository root from each supported layout so the
// Gateway does not silently fall back to root/default credentials.
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
for (const envPath of [
  path.resolve(moduleDir, "../../.env"),
  path.resolve(moduleDir, "../.env"),
  path.resolve(process.cwd(), ".env"),
]) {
  const result = dotenv.config({ path: envPath, quiet: true });
  if (!result.error) {
    break;
  }
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || "idx_exchange",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
type QueryParameter = string | number | bigint | boolean | Date | null | undefined;

export async function query<T>(sql: string, params: QueryParameter[] = []): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  // const [tester] = await pool.query(
  //   "SELECT City,COUNT(*) AS sold_count, ROUND(AVG(ClosePrice), 0) AS avg_close_price, ROUND(AVG(ClosePrice / NULLIF(LivingArea,0)),0) AS avg_price_per_sqft, ROUND(AVG(DaysOnMarket), 1) AS avg_dom, ROUND(AVG(ClosePrice / NULLIF(ListPrice,0)) * 100, 1) AS list_to_close_pct FROM california_sold WHERE PropertyType = 'Residential' AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) AND LivingArea > 0 GROUP BY City ORDER BY sold_count DESC LIMIT 25;",
  // );
  // console.log("MySQL connection test result:", tester);
  return rows as T[];
}
