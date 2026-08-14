from sklearn.metrics.pairwise import cosine_similarity
from src.tools.embedding_generation import get_embedding
from src.tools.database import fetch_listing_by_id
import numpy as np
import sys
import pandas as pd

def calculate_similarity_score(
    target: dict,
    candidate: dict,
    target_emb: list[float],
    candidate_emb: list[float]
) -> float:
    score = 0.0
    # Structured similarity (60% of total score)
    price_diff = abs(target["L_SystemPrice"] - candidate["L_SystemPrice"])
    if price_diff < 50_000: score += 20
    elif price_diff < 150_000: score += 12
    elif price_diff < 300_000: score += 5

    if target["L_Keyword2"] == candidate["L_Keyword2"]: score += 15
    if target["L_City"] == candidate["L_City"]: score += 15

    sqft_diff = abs(target["LM_Int2_3"] - candidate["LM_Int2_3"])
    if sqft_diff < 300: score += 10
    elif sqft_diff < 700: score += 5
    # Semantic similarity (40% of total score)

    sem_sim = cosine_similarity(
        np.array(target_emb).reshape(1,-1),
        np.array(candidate_emb).reshape(1,-1)
    )[0][0]
    score += sem_sim * 40
    return round(score, 2)

if __name__ == "__main__":
    target_id = sys.argv[1]
    candidate_id = sys.argv[2]

    target_df = fetch_listing_by_id(target_id)
    candidate_df = fetch_listing_by_id(candidate_id)

    if target_df.empty or candidate_df.empty:
        print("One or both listings were not found.")
        raise SystemExit(1)

    # Convert DataFrame rows to dictionaries
    target = target_df.iloc[0].to_dict()
    candidate = candidate_df.iloc[0].to_dict()

    # Extract remarks
    target_remarks = (
        "" if pd.isna(target["L_Remarks"])
        else str(target["L_Remarks"])
    )

    candidate_remarks = (
        "" if pd.isna(candidate["L_Remarks"])
        else str(candidate["L_Remarks"])
    )

    # Generate embeddings
    target_emb = get_embedding(target_remarks)
    candidate_emb = get_embedding(candidate_remarks)

    # Calculate similarity
    score = calculate_similarity_score(
        target,
        candidate,
        target_emb,
        candidate_emb
    )

    print(
        f"Similarity Score of {target_id} and {candidate_id}: {score}/100"
    )