from src.tools.embedding_generation import get_embedding, cosine_similarity
from numpy import np
import os
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()

client = OpenAI(
    api_key=os.environ["GEMINI_API_KEY_1"],
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/")

# 1. Chunk documents
def chunk_text(text: str, chunk_size=600, overlap=100) -> list[str]:
    chunks, start = [], 0
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
                "source": doc["title"],
                "chunk": chunk,
                "embedding": get_embedding(chunk)
        })
    return indexed
# 3. Retrieve relevant chunks for a query
def retrieve(query: str, index: list[dict], top_k=4) -> list[dict]:
    q_emb = np.array(get_embedding(query)).reshape(1,-1)
    scored = [
        (doc, cosine_similarity(q_emb, np.array(doc["embedding"]).reshape(1,-
        1))[0][0])
        for doc in index
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [doc for doc, _ in scored[:top_k]]
# 4. Generate grounded answer
def rag_answer(query: str, index: list[dict]) -> str:
    chunks = retrieve(query, index)
    context = "\n\n".join(c["chunk"] for c in chunks)
    prompt = f"Answer using only the context below:\n\n{context}\n\nQuestion:{query}"
    resp = client.chat.completions.create(
        model="gemini-3.1-flash",
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    return resp.choices[0].message.content