from typing import List, Dict, Any
from simhash import Simhash


def _hamming_distance(h1: int, h2: int) -> int:
    x = h1 ^ h2
    count = 0
    while x:
        count += x & 1
        x >>= 1
    return count


def simhash_fingerprint(text: str) -> int:
    return Simhash(text).value


def structural_similarity(text1: str, text2: str, bits: int = 64) -> float:
    """Layer 3: SimHash + Hamming distance → similarity score."""
    h1 = simhash_fingerprint(text1)
    h2 = simhash_fingerprint(text2)
    distance = _hamming_distance(h1, h2)
    return 1.0 - distance / bits


def check_structural(sentences: List[str], corpus: List[str]) -> List[Dict[str, Any]]:
    """Compute structural similarity with source index."""
    results: List[Dict[str, Any]] = []
    for sentence in sentences:
        if not corpus:
            results.append({"score": 0.0, "source_index": -1, "source_text": ""})
            continue

        best_score = -1.0
        best_idx = -1
        best_text = ""
        for i, ref in enumerate(corpus):
            sim = structural_similarity(sentence, ref)
            if sim > best_score:
                best_score = sim
                best_idx = i
                best_text = ref

        results.append({
            "score": float(best_score if best_score >= 0 else 0.0),
            "source_index": best_idx,
            "source_text": best_text,
        })
    return results
