"""Document-aware retrieval augmented generation for real-estate knowledge.

The static sources cover terminology and RESO/Trestle field definitions. The
database-backed sources add the current ``california_sold`` schema and the Week
5 market summaries, so answers describe the operator's actual data when the
database is available.
"""

from __future__ import annotations

import json
import os
import sys
from collections.abc import Callable
from typing import Any

import numpy as np


Document = dict[str, Any]
Embedding = list[float]
Embedder = Callable[[str], Embedding]
DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001"

TRESTLE_PROPERTY_URL = (
    "https://api.cotality.com/trestle/Documentation/MetaData/Resource/Property"
)

PRIMER_DOCUMENT: Document = {
    "title": "Real Estate Data Analyst Primer",
    "source_url": "IDX Exchange internship handbook, Real Estate Data Analyst Primer",
    "content": """
Real-estate market terminology:

DOM means Days on Market: the number of days a listing is on the market, as
defined by the local MLS business rules. Lower average DOM generally indicates
that listings are selling more quickly, but comparisons should use the same MLS
and time period because counting rules can differ.

Comps are comparable recently sold properties used to evaluate a property's
likely market value. Useful comps are similar in location, property type, size,
condition, and sale date.

Escrow is a neutral arrangement in which money and documents are held until the
conditions of a real-estate transaction are satisfied.

Cap rate, or capitalization rate, is annual net operating income divided by the
property's value or purchase price. It is primarily an income-property metric.

The list-to-close ratio compares the final close price with the list price:
ClosePrice / ListPrice * 100. A ratio of 100% means the property closed at list
price; 98% means it closed 2% below list price; 102% means it closed 2% above
list price. Aggregate reports commonly average the per-sale ratios.
""".strip(),
}

TRESTLE_DOCUMENT: Document = {
    "title": "Trestle Property metadata (RESO Data Dictionary 2.0)",
    "source_url": TRESTLE_PROPERTY_URL,
    "content": """
Trestle exposes standardized Property metadata based on the RESO Data
Dictionary. Relevant field definitions include:

DaysOnMarket (Int32): the number of days the listing is on market, as defined
by MLS business rules.
CloseDate (DateTime): for a sale, the date the purchase agreement was fulfilled.
ClosePrice (Decimal): the amount paid by the purchaser to the seller under the
agreement.
ListPrice (Decimal): the current price determined by the seller and seller's
broker.
LivingArea (Decimal): the total livable area within the structure.
BedroomsTotal (Int32): the total number of bedrooms in the dwelling.
BathroomsTotalInteger (Int32): the simple sum of the number of bathrooms.
City (String): the city in the listing address.
StandardStatus: the standardized state of the listing contract, such as Active,
Pending, Closed, Expired, Canceled, or Withdrawn.
AssociationFee (Decimal): a homeowner fee used for common areas or other
association benefits.
PoolPrivateYN (Boolean): whether the property has a privately owned pool included
in the sale or lease.
YearBuilt (Int32): the year of initial habitability, normally represented as a
four-digit year.
""".strip(),
}

REPOSITORY_SCHEMA_DOCUMENT: Document = {
    "title": "IDX Exchange california_sold and rets_property schema reference",
    "source_url": "Repository SQL queries and internship handbook schema reference",
    "content": """
Repository-confirmed california_sold columns include ListingKey,
UnparsedAddress, City, CloseDate, ClosePrice, OriginalListPrice, ListPrice,
DaysOnMarket, BedroomsTotal, BathroomsTotalInteger, LivingArea, PropertyType,
PropertySubType, YearBuilt, ListAgentFullName, ListOfficeName, and
BuyerOfficeName. This fallback list is not claimed to be exhaustive; the live
database schema source, when available, is authoritative for the complete
current column list.

The rets_property table contains a mix of RESO names and legacy IDX names.
Important legacy mappings are L_SystemPrice = price, L_Keyword2 = bedrooms,
LM_Dec_3 = bathrooms, LM_Int2_3 = living area in square feet, L_City = city,
L_Address = address, L_Type_ = property type, and L_Status = listing status.
RESO-style fields in that table include YearBuilt, AssociationFee,
PoolPrivateYN, DaysOnMarket, and ViewYN.
""".strip(),
}


def chunk_text(text: str, chunk_size: int = 600, overlap: int = 100) -> list[str]:
    """Split text into overlapping character chunks."""
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if overlap < 0 or overlap >= chunk_size:
        raise ValueError("overlap must be non-negative and smaller than chunk_size")

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


def _default_embedder(text: str) -> Embedding:
    # Import lazily so chunking/source tests do not require credentials or a DB.
    from embedding_generation import get_embedding

    return get_embedding(
        text, model=os.getenv("RAG_EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL)
    )


def index_documents(
    docs: list[Document], embedder: Embedder | None = None
) -> list[Document]:
    """Chunk and embed documents while retaining citation metadata."""
    embed = embedder or _default_embedder
    indexed: list[Document] = []

    for doc in docs:
        title = str(doc["title"])
        content = str(doc["content"])
        # A compact schema must stay whole so an "all columns" answer cannot
        # begin mid-field or silently omit fields at an arbitrary boundary.
        chunk_size = min(int(doc.get("chunk_size", 600)), 4_000)
        for chunk in chunk_text(content, chunk_size=chunk_size):
            indexed.append(
                {
                    "source": title,
                    "source_url": doc.get("source_url"),
                    "chunk": chunk,
                    "embedding": embed(f"{title}\n{chunk}"),
                }
            )
    return indexed


def _cosine_similarity(left: Embedding, right: Embedding) -> float:
    left_array = np.asarray(left, dtype=float)
    right_array = np.asarray(right, dtype=float)
    denominator = np.linalg.norm(left_array) * np.linalg.norm(right_array)
    if denominator == 0:
        return 0.0
    return float(np.dot(left_array, right_array) / denominator)


def retrieve(
    query: str,
    index: list[Document],
    top_k: int = 4,
    embedder: Embedder | None = None,
) -> list[Document]:
    """Return the highest-scoring document chunks for a query."""
    if top_k <= 0 or not index:
        return []

    embed = embedder or _default_embedder
    query_embedding = embed(query)
    scored = [
        (doc, _cosine_similarity(query_embedding, doc["embedding"])) for doc in index
    ]
    scored.sort(key=lambda item: item[1], reverse=True)
    return [doc for doc, _score in scored[:top_k]]


def _database_documents(db_engine: Any) -> list[Document]:
    """Build authoritative schema and Week 5 summary documents from MySQL."""
    from sqlalchemy import text

    with db_engine.connect() as connection:
        schema_rows = connection.execute(text("SHOW COLUMNS FROM california_sold"))
        schema = [dict(row._mapping) for row in schema_rows]

        summary_rows = connection.execute(
            text(
                """
                SELECT
                    City,
                    COUNT(*) AS sold_count,
                    ROUND(AVG(ClosePrice), 0) AS avg_close_price,
                    ROUND(AVG(ClosePrice / NULLIF(LivingArea, 0)), 0)
                        AS avg_price_per_sqft,
                    ROUND(AVG(DaysOnMarket), 1) AS avg_dom,
                    ROUND(AVG(ClosePrice / NULLIF(ListPrice, 0)) * 100, 1)
                        AS list_to_close_pct
                FROM california_sold
                WHERE PropertyType = 'Residential'
                    AND CloseDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                    AND LivingArea > 0
                GROUP BY City
                ORDER BY sold_count DESC
                LIMIT 25
                """
            )
        )
        summaries = [dict(row._mapping) for row in summary_rows]

    schema_lines = [
        f"{row['Field']} ({row['Type']}, nullable={row['Null']})" for row in schema
    ]
    summary_lines = [
        (
            f"{row['City']}: {row['sold_count']} sales, average close price "
            f"{row['avg_close_price']}, average price/sqft "
            f"{row['avg_price_per_sqft']}, average DOM {row['avg_dom']}, "
            f"list-to-close ratio {row['list_to_close_pct']}%."
        )
        for row in summaries
    ]

    return [
        {
            "title": "Live california_sold database schema",
            "source_url": "MySQL information for california_sold",
            "content": "Current columns:\n" + "\n".join(schema_lines),
            "chunk_size": 4_000,
        },
        {
            "title": "Week 5 market summaries",
            "source_url": "Week 5 market analytics query over california_sold",
            "content": "Trailing 12-month residential summaries:\n"
            + "\n".join(summary_lines),
        },
    ]


def load_source_documents(db_engine: Any | None = None) -> list[Document]:
    """Load static authoritative sources plus live schema/market summaries."""
    documents = [
        PRIMER_DOCUMENT,
        TRESTLE_DOCUMENT,
        REPOSITORY_SCHEMA_DOCUMENT,
    ]

    try:
        if db_engine is None:
            from engine import engine as db_engine

        documents.extend(_database_documents(db_engine))
    except Exception as error:
        # Concept questions remain answerable; schema answers must disclose that
        # only the repository-confirmed fallback list was available.
        print(
            f"Warning: live schema and Week 5 summaries unavailable: {error}",
            file=sys.stderr,
        )

    return documents


def rag_answer(
    query: str,
    index: list[Document],
    *,
    embedder: Embedder | None = None,
    completion_client: Any | None = None,
) -> str:
    """Generate an answer constrained to retrieved source chunks."""
    chunks = retrieve(query, index, embedder=embedder)
    if not chunks:
        return "I don't have enough information in the indexed sources to answer that."

    context = "\n\n".join(
        f"SOURCE: {chunk['source']}\n{chunk['chunk']}" for chunk in chunks
    )
    prompt = f"""Answer using only the source context below.

Rules:
- Do not add facts that are absent from the context.
- Cite supporting source titles in square brackets, for example [Source title].
- If a source says a column list is not exhaustive, preserve that limitation.
- If the context is insufficient, say exactly: "I don't have enough information in the indexed sources to answer that."

Context:
{context}

Question: {query}
"""

    if completion_client is None:
        from engine import client as completion_client

    response = completion_client.chat.completions.create(
        model=os.getenv("RAG_CHAT_MODEL", "gemini-2.5-flash"),
        messages=[{"role": "user", "content": prompt}],
    )
    content = response.choices[0].message.content
    return content or "I don't have enough information in the indexed sources to answer that."


def main(arguments: list[str]) -> int:
    if arguments == ["--serve"]:
        documents = load_source_documents()
        index = index_documents(documents)
        for line in sys.stdin:
            try:
                request = json.loads(line)
                query = str(request.get("query", "")).strip()
                if not query:
                    raise ValueError("query is required")
                response = {"response": rag_answer(query, index)}
            except Exception as error:
                response = {"error": str(error)}
            print(json.dumps(response), flush=True)
        return 0

    if not arguments:
        print('Usage: python3 RAG.py "<question>"', file=sys.stderr)
        return 2

    query = " ".join(arguments).strip()
    documents = load_source_documents()
    index = index_documents(documents)
    print(rag_answer(query, index))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
