import os
import faiss
import numpy as np
import json
import re
from typing import List, Dict, Any, Tuple
from sentence_transformers import SentenceTransformer
from config import SBERT_MODEL

KB_DIR = "data/kb"
INDEX_PATH = os.path.join(KB_DIR, "knowledge_base.index")
METADATA_PATH = os.path.join(KB_DIR, "metadata.json")

_model = SentenceTransformer(SBERT_MODEL)

# Ensure data directory exists
os.makedirs(KB_DIR, exist_ok=True)

class KnowledgeBase:
    def __init__(self):
        self.index = None
        self.metadata: List[Dict[str, Any]] = []
        self.load()

    def load(self):
        """Load FAISS index and metadata from disk."""
        if os.path.exists(INDEX_PATH) and os.path.exists(METADATA_PATH):
            try:
                self.index = faiss.read_index(INDEX_PATH)
                with open(METADATA_PATH, "r") as f:
                    self.metadata = json.load(f)
                print(f"KB: Loaded {self.index.ntotal} sentences from disk.")
            except Exception as e:
                print(f"KB: Error loading index: {e}")
                self.index = None
        else:
            print("KB: No existing knowledge base found on disk.")

    def save(self):
        """Save FAISS index and metadata to disk."""
        if self.index:
            faiss.write_index(self.index, INDEX_PATH)
            with open(METADATA_PATH, "w") as f:
                json.dump(self.metadata, f)

    def ingest_paper(self, title: str, text: str, url: str = ""):
        """Split paper into sentences and add to index."""
        # Simple sentence splitting
        sentences = re.split(r'(?<=[.!?])\s+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 30]
        
        if not sentences:
            return 0

        embeddings = _model.encode(sentences, normalize_embeddings=True)
        dim = embeddings.shape[1]

        if self.index is None:
            self.index = faiss.IndexFlatIP(dim)
        
        self.index.add(embeddings.astype(np.float32))
        
        # Store metadata for each sentence added
        for s in sentences:
            self.metadata.append({
                "text": s,
                "title": title,
                "url": url,
                "source": "Local Library"
            })
        
        self.save()
        return len(sentences)

    def search(self, queries: List[str], top_k: int = 1) -> List[Dict[str, Any]]:
        """Search for matches in the local knowledge base."""
        if self.index is None or not queries:
            return [{"score": 0.0, "text": "", "title": "", "url": ""} for _ in queries]

        query_embeddings = _model.encode(queries, normalize_embeddings=True)
        scores, indices = self.index.search(query_embeddings.astype(np.float32), top_k)

        results = []
        for i in range(len(queries)):
            idx = indices[i][0]
            score = float(scores[i][0])
            
            if idx != -1 and idx < len(self.metadata):
                meta = self.metadata[idx]
                results.append({
                    "score": score,
                    "text": meta["text"],
                    "title": meta["title"],
                    "url": meta["url"],
                    "source": "Local Library"
                })
            else:
                results.append({"score": 0.0, "text": "", "title": "", "url": ""})
        
        return results

# Singleton instance
kb = KnowledgeBase()
