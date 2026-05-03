from typing import List, Dict, Any, Tuple
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


def build_structural_runtime(corpus: List[str]) -> Tuple[List[int], List[str]]:
    """Build SimHash fingerprints once for a corpus and return reusable runtime."""
    if not corpus:
        return [], []
    corpus_hashes = [simhash_fingerprint(text) for text in corpus]
    return corpus_hashes, corpus


def structural_similarity_hashes(h1: int, h2: int, bits: int = 64) -> float:
    """Compute similarity score directly from precomputed hashes."""
    distance = _hamming_distance(h1, h2)
    return 1.0 - distance / bits


def check_structural_with_runtime(
    sentences: List[str], 
    runtime: Tuple[List[int], List[str]]
) -> List[Dict[str, Any]]:
    """Compute structural similarity using precomputed corpus hashes."""
    if not sentences:
        return []
        
    corpus_hashes, corpus = runtime
    if not corpus or not corpus_hashes:
        return [{"score": 0.0, "source_index": -1, "source_text": ""} for _ in sentences]

    results: List[Dict[str, Any]] = []
    
    for sentence in sentences:
        sent_hash = simhash_fingerprint(sentence)
        best_score = -1.0
        best_idx = -1
        
        for i, ref_hash in enumerate(corpus_hashes):
            sim = structural_similarity_hashes(sent_hash, ref_hash)
            if sim > best_score:
                best_score = sim
                best_idx = i

        results.append({
            "score": float(best_score if best_score >= 0 else 0.0),
            "source_index": best_idx,
            "source_text": corpus[best_idx] if 0 <= best_idx < len(corpus) else "",
        })
        
    return results


def check_structural(sentences: List[str], corpus: List[str]) -> List[Dict[str, Any]]:
    """Backward-compatible helper."""
    if not corpus:
        return [{"score": 0.0, "source_index": -1, "source_text": ""} for _ in sentences]
    runtime = build_structural_runtime(corpus)
    return check_structural_with_runtime(sentences, runtime)
