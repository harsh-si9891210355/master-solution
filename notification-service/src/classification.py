"""Map a use-case to an alert {severity, category}.

Table-driven so a security admin can retune without code changes. The eventmanager
payload identifies the use-case via ``usecase_slug``; unknown slugs fall back to a
sensible default.
"""

from __future__ import annotations

# slug -> (severity, category)
_CLASSIFICATION: dict[str, tuple[str, str]] = {
    "walking-in-no-walking-zone": ("HIGH", "SAFETY_VIOLATION"),
    "intrusion": ("CRITICAL", "INTRUSION"),
    "intrusion-detection": ("CRITICAL", "INTRUSION"),
    "ppe": ("MEDIUM", "PPE"),
    "ppe-violation": ("MEDIUM", "PPE"),
    "crowd": ("MEDIUM", "CROWD"),
    "crowd-detection": ("MEDIUM", "CROWD"),
    "loitering": ("MEDIUM", "SECURITY"),
    "line-crossing": ("HIGH", "SECURITY"),
}

_DEFAULT = ("MEDIUM", "OTHER")

# Human-friendly titles per category for the alert headline.
_TITLE_BY_SLUG: dict[str, str] = {
    "walking-in-no-walking-zone": "No Walking Zone Detected",
    "intrusion": "Intrusion Detected",
    "intrusion-detection": "Intrusion Detected",
    "ppe": "PPE Violation",
    "ppe-violation": "PPE Violation",
    "crowd": "Crowd Detected",
    "crowd-detection": "Crowd Detected",
    "loitering": "Loitering Detected",
    "line-crossing": "Line Crossing Detected",
}


def classify(usecase_slug: str | None) -> tuple[str, str]:
    if not usecase_slug:
        return _DEFAULT
    return _CLASSIFICATION.get(usecase_slug.lower(), _DEFAULT)


def title_for(usecase_slug: str | None, usecase_name: str | None) -> str:
    if usecase_slug and usecase_slug.lower() in _TITLE_BY_SLUG:
        return _TITLE_BY_SLUG[usecase_slug.lower()]
    if usecase_name:
        return usecase_name
    return "Security Alert"


_SEVERITY_RANK = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}


def severity_rank(severity: str) -> int:
    return _SEVERITY_RANK.get(severity.upper(), 0)
