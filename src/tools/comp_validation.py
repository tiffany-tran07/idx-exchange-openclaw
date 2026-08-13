# Check if recommended price is supported by recent comps
import sys
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
# print("MYSQL_USER:", os.environ.get("MYSQL_USER"))
# print("MYSQL_HOST:", os.environ.get("MYSQL_HOST"))
# print("MYSQL_DATABASE:", os.environ.get("MYSQL_DATABASE"))

engine = create_engine(
    f"mysql+mysqlconnector://{os.environ['MYSQL_USER']}:{os.environ['MYSQL_PASSWORD']}"
    f"@{os.environ['MYSQL_HOST']}/{os.environ['MYSQL_DATABASE']}"
)

def query(sql, params):
    with engine.connect() as conn:
        result = conn.execute(text(sql), params)
        return [dict(row._mapping) for row in result]
    
def validate_with_comps(city: str, sqft: int, price: int) -> dict:
    sql = """
    SELECT
        AVG(ClosePrice / NULLIF(LivingArea, 0)) AS avg_ppsf,
        COUNT(*) AS comp_count
    FROM california_sold
    WHERE City = :city
      AND PropertyType = 'Residential'
      AND LivingArea BETWEEN :min_sqft AND :max_sqft
      AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    """

    result = query(
        sql,
        {
            "city": city,
            "min_sqft": sqft * 0.8,
            "max_sqft": sqft * 1.2,
        }
    )
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