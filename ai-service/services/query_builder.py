from sklearn.feature_extraction.text import CountVectorizer
import numpy as np
import re

def build_query_from_text(text: str, top_n: int = 15) -> str:
    text = (text or "").strip()
    if not text:
        return ""
    
    # Extract first sentence/title (often highly descriptive for academic papers)
    first_sentence = ""
    match = re.match(r'^([^.!?\n]+)[.!?\n]?', text)
    if match:
        # Keep up to first 100 chars of first sentence
        first_sentence = match.group(1).strip()[:100]

    try:
        # Use CountVectorizer to get actual term frequencies
        vec = CountVectorizer(stop_words="english", max_features=50)
        counts = vec.fit_transform([text[:10000]])
        
        # Sort words by frequency
        word_counts = np.asarray(counts.sum(axis=0)).flatten()
        words = vec.get_feature_names_out()
        
        # Get indices of top N words sorted by frequency
        top_indices = word_counts.argsort()[::-1][:top_n]
        top_words = [words[i] for i in top_indices]
        
        # Combine title snippet with top frequent words
        query_parts = []
        if first_sentence:
            query_parts.append(first_sentence)
        query_parts.append(" ".join(top_words))
        
        return " ".join(query_parts)
    except Exception:
        # Fallback to the beginning of the text
        return text[:200]