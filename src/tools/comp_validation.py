# Check if recommended price is supported by recent comps
import sys
def validate_with_comps(city: str, sqft: int, price: int) -> dict:
    sql = """
        SELECT
            AVG(ClosePrice / NULLIF(LivingArea,0)) AS avg_ppsf,
            COUNT(*) AS comp_count
        FROM california_sold
        WHERE City = %s AND PropertyType = 'Residential'
        AND LivingArea BETWEEN %s AND %s
        AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    """
    result = query(sql, [city, sqft * 0.8, sqft * 1.2])
    avg_ppsf = result[0]["avg_ppsf"] or 0
    comp_price = avg_ppsf * sqft
    return {
        "comp_price": round(comp_price),
        "list_price": price,
        "comp_count": result[0]["comp_count"],
        "delta_pct": (
            round((price - comp_price) / comp_price * 100, 1)
            if comp_price > 0
            else None
        )
    }

if __name__ == "__main__":
    city = sys.argv[1]
    sqft = int(sys.argv[2])
    price = int(sys.argv[3])
    comps = validate_with_comps(city, sqft, price)
    print(comps)