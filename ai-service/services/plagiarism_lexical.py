from typing import List, Dict, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def build_lexical_runtime(corpus: List[str]) -> Tuple[Any, Any, List[str]]:
    """Build TF-IDF matrix once for a corpus and return reusable runtime."""
    if not corpus:
        return None, None, []
        
    vectorizer = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 5),
        min_df=1,
    )
    corpus_matrix = vectorizer.fit_transform(corpus)
    return vectorizer, corpus_matrix, corpus

def check_lexical_with_runtime(
    sentences: List[str], 
    runtime: Tuple[Any, Any, List[str]]
) -> List[Dict[str, Any]]:
    if not sentences:
        return []
        
    vectorizer, corpus_matrix, corpus = runtime
    if not corpus or vectorizer is None:
        return [{"score": 0.0, "source_index": -1, "source_text": ""} for _ in sentences]

    # Transform all sentences at once
    try:
        sentences_matrix = vectorizer.transform(sentences)
        # Compute similarity between all sentences and all corpus documents
        sim_matrix = cosine_similarity(sentences_matrix, corpus_matrix)
    except Exception:
        return [{"score": 0.0, "source_index": -1, "source_text": ""} for _ in sentences]

    results: List[Dict[str, Any]] = []
    
    # sim_matrix is of shape (num_sentences, num_corpus)
    for i in range(len(sentences)):
        scores = sim_matrix[i]
        best_idx = int(scores.argmax())
        best_score = float(scores[best_idx])
        
        results.append({
            "score": float(best_score if best_score >= 0 else 0.0),
            "source_index": best_idx,
            "source_text": corpus[best_idx] if 0 <= best_idx < len(corpus) else "",
        })

    return results

def check_lexical(sentences: List[str], corpus: List[str]) -> List[Dict[str, Any]]:
    """Backward-compatible helper."""
    if not corpus:
        return [{"score": 0.0, "source_index": -1, "source_text": ""} for _ in sentences]
    runtime = build_lexical_runtime(corpus)
    return check_lexical_with_runtime(sentences, runtime)
