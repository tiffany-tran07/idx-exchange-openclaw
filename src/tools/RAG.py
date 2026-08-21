from src.tools.embedding_generation import get_embedding, fetch_sample_listings
from sklearn.metrics.pairwise import cosine_similarity
from src.tools.engine import client

import numpy as np
import sys
import pandas as pd

def dataframe_to_docs(df: pd.DataFrame) -> list[dict]:
    docs = []

    for _, row in df.iterrows():
        content = f"""
            Type: {row['Type']}
            City: {row['City']}
            Beds: {row['Beds']}
            Baths: {row['Baths']}
            Square Feet: {row['SQFT']}
            Year Built: {row['YearBuilt']}
            Price: {row['SystemPrice']}
            Remarks: {row['Remarks']}
        """.strip()

        docs.append({
            "ListingID": str(row["ListingID"]),
            "City": row["City"],
            "SystemPrice": row["SystemPrice"],
            "Beds": row["Beds"],
            "Baths": row["Baths"],
            "SquareFeet": row["SQFT"],
            "content": content
        })

    return docs

# 1. Chunk documents

def chunk_text(
    text: str,
    chunk_size: int = 600,
    overlap: int = 100
) -> list[str]:

    chunks = []
    start = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))

        chunks.append(text[start:end])

        start += chunk_size - overlap

    return chunks


# 2. Index chunks

def index_documents(docs: list[dict]) -> list[dict]:
    indexed = []

    for doc in docs:
        for chunk in chunk_text(doc["content"]):
            indexed.append({
                "ListingID": doc["ListingID"],
                "City": doc["City"],
                "SystemPrice": doc["SystemPrice"],
                "Beds": doc["Beds"],
                "Baths": doc["Baths"],
                "SquareFeet": doc["SquareFeet"],
                "chunk": chunk,
                "embedding": get_embedding(chunk)
            })

    return indexed


# 3. Retrieve relevant chunks for a query

def retrieve(
    query: str,
    index: list[dict],
    top_k: int = 4
) -> list[dict]:

    query_embedding = np.array(
        get_embedding(query)
    ).reshape(1, -1)

    scored = []

    for doc in index:

        document_embedding = np.array(
            doc["embedding"]
        ).reshape(1, -1)

        score = cosine_similarity(
            query_embedding,
            document_embedding
        )[0][0]

        scored.append((doc, score))

    # Highest similarity first
    scored.sort(
        key=lambda x: x[1],
        reverse=True
    )

    return [
        doc
        for doc, score in scored[:top_k]
    ]


# 4. Generate grounded answer

def rag_answer(
    query: str,
    index: list[dict]
) -> str:

    chunks = retrieve(query, index)

    context = "\n\n".join(
        f"""
        Listing ID: {c['ListingID']}
        City: {c['City']}
        Price: {c['SystemPrice']}
        Baths: {c['Baths']}
        Square Feet: {c['SquareFeet']}
        Listing Information:
        {c['chunk']}
    """.strip()
        for c in chunks
    )

    prompt = f"""
        Answer the question using only the provided listing context.

        For every property you mention:
        - include the Listing ID
        - include the city
        - include the price when available
        - explain why it matches the question

        If the answer cannot be determined from the context,
        say "I don't have enough information to answer that."

        Context:
        {context}

        Question:
        {query}
        """


    response = client.chat.completions.create(
        model="gemini-2.5-flash",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response.choices[0].message.content


# if __name__ == "__main__":

#     city = sys.argv[1]
#     query = sys.argv[2]

#     df = fetch_sample_listings(city)

#     if df.empty:
#         print(f"No active listings found for {city}.")
#         raise SystemExit(0)

#     docs = dataframe_to_docs(df)

#     print(f"Indexing {len(docs)} listings...")

#     index = index_documents(docs)

#     answer = rag_answer(query, index)

#     print("\nAnswer:")
#     print(answer)