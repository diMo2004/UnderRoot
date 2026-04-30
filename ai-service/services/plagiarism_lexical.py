from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def compute_lexical_similarity(source: str, target: str) -> float:
    """Layer 1: TF-IDF with char_wb n-grams (3,5) + cosine similarity."""
    try:
        vectorizer = TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(3, 5),
            min_df=1,
        )
        matrix = vectorizer.fit_transform([source, target])
        sim = cosine_similarity(matrix[0:1], matrix[1:2])
        return float(sim[0][0])
    except Exception:
        return 0.0


def check_lexical(sentences: List[str], reference_corpus: List[str]) -> List[Dict[str, Any]]:
    """
    For each sentence, return:
    {
      "score": float,
      "source_index": int,
      "source_text": str
    }
    """
    results: List[Dict[str, Any]] = []

    for sentence in sentences:
        if not reference_corpus:
            results.append({"score": 0.0, "source_index": -1, "source_text": ""})
            continue

        best_score = -1.0
        best_idx = -1
        best_text = ""

        for i, ref in enumerate(reference_corpus):
            sim = compute_lexical_similarity(sentence, ref)
            if sim > best_score:
                best_score = sim
                best_idx = i
                best_text = ref

        results.append(
            {
                "score": float(best_score if best_score >= 0 else 0.0),
                "source_index": best_idx,
                "source_text": best_text,
            }
        )

    return results
