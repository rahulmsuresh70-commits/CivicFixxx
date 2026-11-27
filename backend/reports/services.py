"""Lightweight, deterministic CivicFix report triage helpers.

These helpers provide an offline fallback when no external AI provider is
configured. They never overwrite the manager's ability to review or reassign
an issue, and only auto-route when the department match is sufficiently clear.
"""


from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from datetime import timedelta
from difflib import SequenceMatcher
import json
import math
import time
import os
import re
import base64
import mimetypes
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.utils import timezone

from departments.models import Department
from .models import Report


CATEGORY_RULES = [
    ("Roads and Potholes", ("pothole", "road", "street damage", "road damage", "footpath")),
    ("Water Supply", ("water leak", "water supply", "pipe burst", "no water", "water pipeline")),
    ("Drainage and Sewage", ("drain", "sewage", "sewer", "blocked manhole", "overflowing drain")),
    ("Waste Management", ("garbage", "waste", "rubbish", "dump", "litter")),
    ("Street Lighting and Electricity", ("street light", "streetlight", "electricity", "power line", "electric pole")),
    ("Public Safety", ("open manhole", "fallen tree", "exposed wire", "dangerous", "accident risk")),
    ("Parks and Public Spaces", ("park", "playground", "public garden")),
]

HIGH_PRIORITY_TERMS = (
    "urgent", "emergency", "danger", "dangerous", "exposed wire",
    "open manhole", "fallen pole", "fire", "flood", "collapse",
    "accident", "life threatening", "overflowing sewage",
)

DEPARTMENT_HINTS = {
    "Roads and Potholes": ("road", "public works", "pothole", "engineering", "pwd"),
    "Water Supply": ("water", "water supply", "water authority", "jal"),
    "Drainage and Sewage": ("drainage", "sewage", "sewer", "sanitation", "public works"),
    "Waste Management": ("waste", "garbage", "sanitation", "health", "cleaning"),
    "Street Lighting and Electricity": ("electric", "electricity", "power", "lighting", "kseb"),
    "Public Safety": ("safety", "fire", "disaster", "emergency", "public works"),
    "Parks and Public Spaces": ("park", "garden", "recreation", "public spaces"),
}


def _normalise(value):
    return re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip()


def _classify(text):
    normalised = _normalise(text)

    for category, terms in CATEGORY_RULES:
        if any(_normalise(term) in normalised for term in terms):
            return category

    return None


def _department_score(department, category, text):
    if not category:
        return 0

    candidates = [
        department.name,
        department.code,
        department.description,
    ]

    haystack = _normalise(" ".join(candidates))
    score = 0

    if _normalise(category) in haystack:
        score += 5

    for hint in DEPARTMENT_HINTS.get(category, ()):
        if _normalise(hint) in haystack:
            score += 2

    # Small extra signal when a department's own words appear in the report.
    for word in set(_normalise(department.name).split()):
        if len(word) > 3 and word in _normalise(text):
            score += 1

    return score


def _gemini_triage(report):
    """Use Gemini when a key is configured; return None for safe fallback."""

    api_key = os.getenv("GEMINI_API_KEY")
    print("GEMINI API KEY AVAILABLE:", bool(api_key))

    if not api_key:
        return None

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    departments = list(
        Department.objects.filter(is_active=True).values(
            "name", "code", "description"
        )
    )

    prompt = {
        "task": "Classify a civic complaint and choose the best registered department.",
        "rules": [
            "Use only the supplied active departments.",
            "Never invent a department name or department code.",
            "Return JSON only with these fields: "
            "category, priority, deadline_days, department_code, "
            "department_matches_selected, department_confidence.",
            "department_matches_selected must be true when the citizen-selected "
            "department is appropriate, otherwise false.",
            "department_code must identify the best department from the supplied "
            "active departments.",
            "department_confidence must be a number between 0 and 1.",
            "Only recommend a department change when the complaint clearly belongs "
            "to another department.",
            "If the correct department is uncertain, set department_matches_selected "
            "to true and keep the citizen-selected department.",
            "priority must be normal or high.",
            "deadline_days must be an integer from 1 to 14.",
            "Use high priority for immediate public safety risks.",
        ],

        # Do not send citizen identity or exact coordinates to the provider.
        "complaint": {
            "title": report.title,
            "description": report.description,
            "citizen_selected_category": report.category,
            "citizen_selected_department_code": report.department.code,
        },

        "active_departments": departments,
    }

    request = Request(
        (
            "https://generativelanguage.googleapis.com/"
            f"v1beta/models/{model}:generateContent?key={api_key}"
        ),
        data=json.dumps({
            "contents": [
                {
                    "parts": [
                        {
                            "text": json.dumps(prompt)
                        }
                    ]
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
            },
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    max_attempts = 1

    for attempt in range(max_attempts):
        try:
            # Send the Gemini request.
            with urlopen(request, timeout=5) as response:
                payload = json.loads(response.read().decode("utf-8"))

            text = payload["candidates"][0]["content"]["parts"][0]["text"]
            result = json.loads(text)

            print("GEMINI TRIAGE RESULT:", result)

            if result.get("priority") not in {
                Report.Priority.NORMAL,
                Report.Priority.HIGH,
            }:
                print("GEMINI TRIAGE ERROR: Invalid priority")
                return None

            days = int(result.get("deadline_days", 7))

            if not 1 <= days <= 14:
                print("GEMINI TRIAGE ERROR: Invalid deadline_days")
                return None

            confidence = result.get("department_confidence", 0)

            try:
                confidence = float(confidence)
            except (TypeError, ValueError):
                confidence = 0

            if not 0 <= confidence <= 1:
                confidence = 0

            result["deadline_days"] = days
            result["department_confidence"] = confidence

            return result

        except HTTPError as exc:
            # Read the provider error without exposing the API key.
            error_body = exc.read().decode(
                "utf-8",
                errors="replace",
            )

            print("GEMINI HTTP STATUS:", exc.code)
            print("GEMINI HTTP ERROR:", error_body[:2000])

            # Retry only temporary server errors.
            if exc.code not in {500, 502, 503, 504}:
                return None

            if attempt < max_attempts - 1:
                delay = 2 * (attempt + 1)
                print(
                    f"GEMINI RETRY: Attempt {attempt + 2} "
                    f"of {max_attempts} in {delay} seconds"
                )
                time.sleep(delay)

        except (URLError, TimeoutError, OSError) as exc:
            print("GEMINI TRIAGE NETWORK ERROR:", repr(exc))

            if attempt < max_attempts - 1:
                delay = 2 * (attempt + 1)

                print(
                    f"GEMINI RETRY: Attempt {attempt + 2} "
                    f"of {max_attempts} in {delay} seconds"
                )

                time.sleep(delay)
            else:
                print(
                    "GEMINI TRIAGE UNAVAILABLE. "
                    "Using the offline complaint triage fallback."
                )

        except (
            ValueError,
            KeyError,
            TypeError,
            IndexError,
        ) as exc:
            print("GEMINI TRIAGE ERROR:", repr(exc))
            return None

    print("GEMINI TRIAGE ERROR: All retry attempts failed")
    return None


def enrich_report_before_save(report):
    """Suggest category, priority and deadline; route only to active departments."""

    text = f"{report.title} {report.description} {report.category}"

    try:
        ai_result = _gemini_triage(report)
    except Exception as exc:
        # AI triage must not prevent complaint submission.
        print(
            "GEMINI TRIAGE FAILED. "
            "Using offline fallback:",
            repr(exc),
        )
        ai_result = None

    if ai_result:
        report.category = str(
            ai_result.get("category") or report.category
        )[:100]

        report.priority = ai_result["priority"]
        suggested_days = ai_result["deadline_days"]

        department_code = str(
            ai_result.get("department_code") or ""
        ).strip()

        department_matches_selected = ai_result.get(
            "department_matches_selected"
        )

        department_confidence = ai_result.get(
            "department_confidence", 0
        )

        selected_department_id = report.department_id

        if (
            department_matches_selected is False
            and department_confidence >= 0.80
            and department_code
        ):
            suggested_department = Department.objects.filter(
                code=department_code,
                is_active=True,
            ).first()

            if (
                suggested_department
                and suggested_department.id != selected_department_id
            ):
                report.department = suggested_department

    else:
        category = _classify(text)

        if category:
            report.category = category

        normalised_text = _normalise(text)

        if any(
            _normalise(term) in normalised_text
            for term in HIGH_PRIORITY_TERMS
        ):
            report.priority = Report.Priority.HIGH
            suggested_days = 1
        else:
            report.priority = Report.Priority.NORMAL
            suggested_days = 7

        if category:
            departments = list(
                Department.objects.filter(is_active=True)
            )

            ranked = sorted(
                (
                    (
                        _department_score(department, category, text),
                        department,
                    )
                    for department in departments
                ),
                key=lambda item: item[0],
                reverse=True,
            )

            selected_department_id = report.department_id

            selected_score = next(
                (
                    score
                    for score, department in ranked
                    if department.id == selected_department_id
                ),
                0,
            )

            if ranked:
                best_score, best_department = ranked[0]

                second_score = (
                    ranked[1][0]
                    if len(ranked) > 1
                    else 0
                )

                if (
                    best_department.id != selected_department_id
                    and best_score >= 4
                    and best_score > second_score
                    and best_score > selected_score
                ):
                    report.department = best_department

    # A manager can replace this suggested deadline when assigning staff.
    report.deadline = timezone.now() + timedelta(days=suggested_days)
def detect_duplicate_report(report):
    """
    Find nearby complaints and use semantic text matching before Gemini.

    A detected duplicate is only a suggestion. Department Manager
    approval remains necessary in the existing workflow.
    """
    if report.latitude is None or report.longitude is None:
        return None

    candidates_queryset = (
        Report.objects
        .filter(
            department=report.department,
            latitude__isnull=False,
            longitude__isnull=False,
        )
        .exclude(pk=report.pk)
        .exclude(
            status__in=[
                Report.Status.REJECTED,
                Report.Status.CLOSED,
            ]
        )
        .select_related("department")
        .prefetch_related("images")
        .order_by("-created_at")[:500]
    )

    nearby_candidates = []

    lat1 = float(report.latitude)
    lon1 = float(report.longitude)

    for candidate in candidates_queryset:
        lat2 = float(candidate.latitude)
        lon2 = float(candidate.longitude)

        # Calculate distance using the Haversine formula.
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)

        a = (
            math.sin(dphi / 2) ** 2
            + math.cos(phi1)
            * math.cos(phi2)
            * math.sin(dlambda / 2) ** 2
        )

        distance = 6371000 * 2 * math.atan2(
            math.sqrt(a),
            math.sqrt(max(0, 1 - a)),
        )

        # Only compare complaints within 100 metres.
        if distance <= 100:
            nearby_candidates.append((candidate, distance))

    if not nearby_candidates:
        print(
            "DUPLICATE DETECTION:",
            report.id,
            "No nearby candidate reports found.",
        )
        return None

    # Compare the nearest three candidate complaints.
    nearby_candidates.sort(key=lambda item: item[1])
    nearby_candidates = nearby_candidates[:3]

    # Match common wording variants and simple misspellings before comparing
    # words. This helps treat "laek", "lekage", and "leakage" as "leak",
    # and "overflow"/"flowing" as "flow".
    word_aliases = {
        "laek": "leak",
        "lekage": "leak",
        "leakage": "leak",
        "leaking": "leak",
        "leaks": "leak",
        "damaged": "damage",
        "damages": "damage",
        "overflow": "flow",
        "overflowing": "flow",
        "flowing": "flow",
        "flows": "flow",
        "flowed": "flow",
    }
    ignored_words = {
        "the", "and", "for", "are", "was", "were",
        "is", "near", "from", "with", "has", "have",
        "it", "this", "that", "public",
    }

    def meaningful_words(text):
        words = _normalise(text).split()
        normalised_words = {
            word_aliases.get(word, word)
            for word in words
            if len(word) > 2 and word not in ignored_words
        }
        return normalised_words

    new_title = _normalise(report.title)
    new_description = _normalise(report.description)
    new_category = _normalise(report.category)
    new_words = meaningful_words(
        f"{report.title} {report.description}"
    )
    new_category_words = set(new_category.split())

    fallback_matches = []

    for candidate, distance in nearby_candidates:
        candidate_title = _normalise(candidate.title)
        candidate_description = _normalise(candidate.description)
        candidate_category = _normalise(candidate.category)

        candidate_words = meaningful_words(
            f"{candidate.title} {candidate.description}"
        )
        candidate_category_words = set(candidate_category.split())

        title_similarity = SequenceMatcher(
            None,
            new_title,
            candidate_title,
        ).ratio()

        description_similarity = SequenceMatcher(
            None,
            new_description,
            candidate_description,
        ).ratio()

        category_compatible = (
            new_category == candidate_category
            or bool(new_category_words & candidate_category_words)
            or any(
                min(len(word_a), len(word_b)) >= 4
                and (
                    word_a.startswith(word_b)
                    or word_b.startswith(word_a)
                )
                for word_a in new_category_words
                for word_b in candidate_category_words
            )
        )

        shared_words = new_words & candidate_words
        overlap_ratio = (
            len(shared_words) / min(len(new_words), len(candidate_words))
            if new_words and candidate_words
            else 0
        )

        strong_match = (
            new_category == candidate_category
            and title_similarity >= 0.75
            and description_similarity >= 0.70
        )

        related_match = (
            category_compatible
            and len(shared_words) >= 2
            and overlap_ratio >= 0.50
        )

        if strong_match or related_match:
            # Rank description similarity first, then semantic word overlap,
            # shared words, title similarity, and finally proximity. The
            # complaint description carries more context than a short title,
            # so a tiny title-score advantage cannot outweigh a clearer
            # description match.
            fallback_matches.append(
                (
                    candidate,
                    distance,
                    overlap_ratio,
                    len(shared_words),
                    description_similarity,
                    title_similarity,
                )
            )

    if fallback_matches:
        fallback_matches.sort(
            key=lambda item: (
                item[4],
                item[2],
                item[3],
                item[5],
                -item[1],
            ),
            reverse=True,
        )

        duplicate = fallback_matches[0][0]

        print(
            "DUPLICATE DETECTION:",
            report.id,
            "Text match found:",
            duplicate.id,
        )

        return duplicate

    # If text matching finds no reliable match, try Gemini.
    duplicate = _gemini_duplicate_match(
        report,
        nearby_candidates,
    )

    if duplicate:
        return duplicate

    print(
        "DUPLICATE DETECTION:",
        report.id,
        "No confident AI or text-based duplicate match.",
    )

    return None


def _get_report_image_part(report):
    """
    Return the first complaint image in Gemini-compatible format.
    Return None if the image cannot be accessed.
    """
    try:
        image_record = report.images.first()

        if not image_record or not image_record.image:
            return None

        image_url = image_record.image.url

        with urlopen(image_url, timeout=8) as response:
            image_data = response.read(4 * 1024 * 1024 + 1)
            content_type = response.headers.get("Content-Type", "")

        # Avoid sending excessively large image data to Gemini.
        if len(image_data) > 4 * 1024 * 1024:
            return None

        mime_type = content_type.split(";")[0].strip()

        if not mime_type.startswith("image/"):
            mime_type = (
                mimetypes.guess_type(image_url)[0]
                or "image/jpeg"
            )

        if mime_type not in {
            "image/jpeg",
            "image/png",
            "image/webp",
        }:
            return None

        return {
            "inline_data": {
                "mime_type": mime_type,
                "data": base64.b64encode(image_data).decode("utf-8"),
            }
        }

    except Exception as exc:
        print("DUPLICATE IMAGE READ ERROR:", repr(exc))
        return None


def _gemini_duplicate_match(report, candidates):
    """
    Use Gemini to identify a likely duplicate among nearby reports.

    Return the matched Report object only when confidence is >= 0.80.
    Return None when no reliable match is found.
    """
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key or not candidates:
        return None

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    allowed_ids = {candidate.id for candidate, _distance in candidates}

    prompt_data = {
        "task": "Detect duplicate civic complaints.",
        "rules": [
            "Compare whether reports describe the same physical issue.",
            "Use title, description, category, department, location label, "
            "distance, and available images.",
            "Nearby reports are not automatically duplicates.",
            "Similar categories alone are not sufficient.",
            "Different issues at the same location are not duplicates.",
            "If the evidence is insufficient, return null.",
            "Select only a candidate ID supplied in this request.",
            "Do not invent report IDs.",
            "Return JSON only with duplicate_report_id and confidence.",
            "duplicate_report_id must be an integer or null.",
            "confidence must be a number between 0 and 1.",
        ],
        "new_report": {
            "id": report.id,
            "title": report.title,
            "description": report.description,
            "category": report.category,
            "department": report.department.name,
            "location": report.location,
        },
        "candidates": [],
    }

    for candidate, distance in candidates:
        prompt_data["candidates"].append({
            "id": candidate.id,
            "title": candidate.title,
            "description": candidate.description,
            "category": candidate.category,
            "department": candidate.department.name,
            "location": candidate.location,
            "distance_meters": round(distance, 1),
        })

    parts = [
        {
            "text": json.dumps(prompt_data, ensure_ascii=False)
        }
    ]

    # Attach the new complaint image when available.
    new_image_part = _get_report_image_part(report)

    if new_image_part:
        parts.append({
            "text": "Image belonging to the new complaint:"
        })
        parts.append(new_image_part)

    # Attach images belonging to candidate complaints.
    for candidate, _distance in candidates:
        image_part = _get_report_image_part(candidate)

        if image_part:
            parts.append({
                "text": (
                    f"Image belonging to existing complaint "
                    f"#{candidate.id}:"
                )
            })
            parts.append(image_part)

    request = Request(
        (
            "https://generativelanguage.googleapis.com/"
            f"v1beta/models/{model}:generateContent?key={api_key}"
        ),
        data=json.dumps({
            "contents": [
                {
                    "parts": parts
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
            },
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=25) as response:
            payload = json.loads(response.read().decode("utf-8"))

        response_text = (
            payload["candidates"][0]["content"]["parts"][0]["text"]
        )

        result = json.loads(response_text)

        duplicate_id = result.get("duplicate_report_id")
        confidence = float(result.get("confidence", 0))

        if duplicate_id is None:
            return None

        duplicate_id = int(duplicate_id)

        if not 0 <= confidence <= 1:
            return None

        if confidence < 0.80:
            return None

        # Accept only IDs that were actually sent to Gemini.
        if duplicate_id not in allowed_ids:
            return None

        matched_report = next(
            candidate
            for candidate, _distance in candidates
            if candidate.id == duplicate_id
        )

        print(
            "GEMINI DUPLICATE MATCH:",
            report.id,
            matched_report.id,
            "CONFIDENCE:",
            confidence,
        )

        return matched_report

    except (
        HTTPError,
        URLError,
        TimeoutError,
        ValueError,
        KeyError,
        TypeError,
        IndexError,
        StopIteration,
    ) as exc:
        print("GEMINI DUPLICATE DETECTION ERROR:", repr(exc))
        return None