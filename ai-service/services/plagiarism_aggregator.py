from typing import List, Dict, Any

W_LEX, W_SEM, W_STRUCT = 0.3, 0.5, 0.2

SECTION_THRESHOLDS = {
    "abstract": 0.45,
    "introduction": 0.50,
    "related work": 0.55,
    "methodology": 0.60,
    "results": 0.62,
    "discussion": 0.58,
    "conclusion": 0.52,
    "document": 0.55,
}

MIN_MATCH_SCORE = 0.35


def _get_threshold(section_title: str) -> float:
    t = (section_title or "document").strip().lower()
    return SECTION_THRESHOLDS.get(t, SECTION_THRESHOLDS["document"])


def _severity(score: float) -> str:
    if score < 0.15:
        return "low"
    if score < 0.25:
        return "moderate"
    if score < 0.40:
        return "high"
    return "critical"


def _heat_band(score: float):
    # score in [0..1]
    if score < 0.25:
        return "low", "#dcfce7", "#22c55e"      # bg, text-accent
    elif score < 0.40:
        return "moderate", "#fef9c3", "#eab308"
    elif score < 0.60:
        return "high", "#ffedd5", "#f97316"
    return "critical", "#fee2e2", "#ef4444"


def build_section_result(
    section_title: str,
    sentences: List[str],
    lex: List[Dict[str, Any]],
    sem: List[Dict[str, Any]],
    struct: List[Dict[str, Any]],
) -> Dict[str, Any]:
    threshold = _get_threshold(section_title)
    matches: List[Dict[str, Any]] = []
    sentence_scores: List[float] = []

    for i, sent in enumerate(sentences):
        lx = float(lex[i].get("score", 0.0)) if i < len(lex) else 0.0
        sm = float(sem[i].get("score", 0.0)) if i < len(sem) else 0.0
        st = float(struct[i].get("score", 0.0)) if i < len(struct) else 0.0

        score = W_LEX * lx + W_SEM * sm + W_STRUCT * st
        sentence_scores.append(score)

        if score >= max(threshold * 0.5, MIN_MATCH_SCORE):
            band, bg_color, _accent = _heat_band(score)

            sem_idx = sem[i].get("source_index", -1) if i < len(sem) else -1
            sem_text = sem[i].get("source_text", "") if i < len(sem) else ""

            matches.append({
                "matched_text": sent,
                "source": "corpus",
                "similarity": round(score, 4),
                "start_index": i,
                "end_index": i,
                "source_index": sem_idx,
                "source_text": sem_text,
                "source_layer": "hybrid",

                # heatmap fields
                "risk_band": band,
                "heatmap_color": bg_color,
            })

    overall = sum(sentence_scores) / len(sentence_scores) if sentence_scores else 0.0

    return {
        "section_title": section_title,
        "overall_score": round(overall, 4),
        "severity": _severity(overall),
        "matches": matches,
    }