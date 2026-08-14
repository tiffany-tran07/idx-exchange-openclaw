# src/tools/database.py

import pandas as pd

# import your existing engine
from src.tools.engine import engine


def fetch_listing_by_id(listing_id: str) -> pd.DataFrame:
    query = """
        SELECT
            L_ListingID,
            L_Type_,
            L_City,
            L_Keyword2,
            LM_Dec_3,
            LM_Int2_3,
            YearBuilt,
            L_SystemPrice,
            L_Remarks
        FROM rets_property
        WHERE L_ListingID = %s
    """

    return pd.read_sql(
        query,
        engine,
        params=(listing_id,)
    )