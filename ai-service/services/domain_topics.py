DOMAIN_TOPICS = [
    "computer science", "electronics", "cybersecurity", "artificial intelligence",
    "machine learning", "deep learning", "robotics", "internet of things", "iot",
    "cryptography", "blockchain", "mathematics", "embedded systems",
    "computer vision", "diffusion models", "generative ai", "cloud computing",
    "computer architecture", "operating systems"
]

NEGATIVE_HINTS = [
    "medicine","medical","healthcare","clinical","patient","disease",
    "biology","chemistry","geology","genomics","pharma"
]

def build_domain_query(base_query: str) -> str:
    base_query = (base_query or "").strip()
    if not base_query:
        return "OR ".join(DOMAIN_TOPICS)
    
    # Don't FORCE the domain, just return the base query. 
    # The domain filtering can happen later if needed, but for plagiarism, 
    # we want to find THE paper, regardless of domain.
    return base_query

def is_domain_relevant(text: str) -> bool:
    t = (text or "").lower()
    if any(n in t for n in NEGATIVE_HINTS):
        return False
    return any(k in t for k in DOMAIN_TOPICS)