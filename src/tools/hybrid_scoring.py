from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

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
    calculate_similarity_score()