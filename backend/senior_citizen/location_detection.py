import logging
import re
import time

import requests
from django.conf import settings
from django.utils import timezone

from .models import SeniorCitizenRequest


logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org"

# Nominatim's public service requires a descriptive User-Agent.
# Configure CIVICFIX_GEOCODING_USER_AGENT in settings/environment
# for your application before using this service.
DEFAULT_USER_AGENT = "CivicFix-SeniorCitizenAssistance/1.0"

# Public Nominatim usage must be kept to a low request rate.
# This delay is a basic safeguard, not a complete distributed rate limiter.
REQUEST_DELAY_SECONDS = 1.1


def normalize_location(value):
    """
    Normalize state/district names for comparison.

    Examples:
        "Kottayam" -> "kottayam"
        "Kottayam District" -> "kottayam"
    """
    if not value:
        return ""

    value = value.strip().lower()
    value = re.sub(r"\bdistrict\b", "", value)
    value = re.sub(r"\bstate\b", "", value)
    value = re.sub(r"[^a-z0-9\s]", " ", value)
    value = re.sub(r"\s+", " ", value)

    return value.strip()


def get_nominatim_headers():
    """
    Return the configured User-Agent for Nominatim requests.
    """
    user_agent = getattr(
        settings,
        "CIVICFIX_GEOCODING_USER_AGENT",
        DEFAULT_USER_AGENT,
    )

    return {
        "User-Agent": user_agent,
        "Accept": "application/json",
    }


def request_nominatim(endpoint, params):
    """
    Request location information from Nominatim.

    Network failures and geocoding errors are logged and handled
    without interrupting the citizen's assistance request.
    """
    try:
        time.sleep(REQUEST_DELAY_SECONDS)

        response = requests.get(
            f"{NOMINATIM_URL}/{endpoint}",
            params=params,
            headers=get_nominatim_headers(),
            timeout=8,
        )

        response.raise_for_status()
        return response.json()

    except (requests.RequestException, ValueError) as exc:
        logger.warning(
            "Senior Citizen location lookup failed: %s",
            exc,
        )
        return None


def extract_location_details(result):
    """
    Extract state and district from a Nominatim result.

    Administrative labels can differ between locations, so several
    possible district-related address keys are checked.
    """
    if not isinstance(result, dict):
        return None

    address = result.get("address", {})

    if not isinstance(address, dict):
        return None

    detected_state = (
        address.get("state")
        or address.get("region")
        or ""
    ).strip()

    detected_district = (
        address.get("state_district")
        or address.get("county")
        or address.get("district")
        or address.get("city_district")
        or ""
    ).strip()

    if not detected_state or not detected_district:
        return None

    return {
        "state": detected_state,
        "district": detected_district,
    }


def lookup_gps_location(assistance_request):
    """
    Reverse-geocode GPS coordinates.
    """
    if (
        assistance_request.latitude is None
        or assistance_request.longitude is None
    ):
        return None

    result = request_nominatim(
        "reverse",
        {
            "format": "jsonv2",
            "lat": str(assistance_request.latitude),
            "lon": str(assistance_request.longitude),
            "addressdetails": 1,
            "zoom": 10,
        },
    )

    return extract_location_details(result)


def lookup_manual_location(assistance_request):
    current_location = (
        assistance_request.current_location or ""
    ).strip()

    state = (assistance_request.state or "").strip()

    if not current_location:
        return None

    # Try the full address first.
    result = request_nominatim(
        "search",
        {
            "format": "jsonv2",
            "q": f"{current_location}, {state}, India",
            "addressdetails": 1,
            "limit": 1,
        },
    )

    # If the full address fails, use the final location component.
    if not isinstance(result, list) or not result:
        parts = [
            part.strip()
            for part in current_location.split(",")
            if part.strip()
        ]

        if not parts:
            return None

        result = request_nominatim(
            "search",
            {
                "format": "jsonv2",
                "q": f"{parts[-1]}, {state}, India",
                "addressdetails": 1,
                "limit": 1,
            },
        )

    if not isinstance(result, list) or not result:
        return None

    return extract_location_details(result[0])

def detect_request_location(assistance_request):
    """
    Detect the request's location and store its comparison result.

    Updates only the Phase 2 location-detection fields.
    It does not change request status, assignment, images, messages,
    or status history.
    """
    try:
        if (
            assistance_request.location_method
            == SeniorCitizenRequest.LocationMethod.LIVE
        ):
            detected = lookup_gps_location(assistance_request)

        elif (
            assistance_request.location_method
            == SeniorCitizenRequest.LocationMethod.MANUAL
        ):
            detected = lookup_manual_location(assistance_request)

        else:
            detected = None

        assistance_request.location_checked_at = timezone.now()

        if not detected:
            assistance_request.detected_state = ""
            assistance_request.detected_district = ""
            assistance_request.location_mismatch = False
            assistance_request.mismatch_status = (
                SeniorCitizenRequest.MismatchStatus.UNVERIFIED
            )

        else:
            detected_state = detected["state"]
            detected_district = detected["district"]

            assistance_request.detected_state = detected_state
            assistance_request.detected_district = detected_district

            selected_state = normalize_location(
                assistance_request.state
            )
            selected_district = normalize_location(
                assistance_request.district
            )

            actual_state = normalize_location(detected_state)
            actual_district = normalize_location(detected_district)

            if not selected_state or not selected_district:
                assistance_request.location_mismatch = False
                assistance_request.mismatch_status = (
                    SeniorCitizenRequest.MismatchStatus.UNVERIFIED
                )

            elif (
                selected_state == actual_state
                and selected_district == actual_district
            ):
                assistance_request.location_mismatch = False
                assistance_request.mismatch_status = (
                    SeniorCitizenRequest.MismatchStatus.MATCHED
                )

            else:
                assistance_request.location_mismatch = True
                assistance_request.mismatch_status = (
                    SeniorCitizenRequest.MismatchStatus.MISMATCH
                )

        assistance_request.save(
            update_fields=[
                "detected_state",
                "detected_district",
                "location_mismatch",
                "mismatch_status",
                "location_checked_at",
            ]
        )

        return {
            "detected_state": assistance_request.detected_state,
            "detected_district": assistance_request.detected_district,
            "location_mismatch": assistance_request.location_mismatch,
            "mismatch_status": assistance_request.mismatch_status,
            "location_checked_at": (
                assistance_request.location_checked_at
            ),
        }

    except Exception:
        # Detection must not break an otherwise valid request.
        logger.exception(
            "Unexpected location detection error for request %s",
            assistance_request.pk,
        )

        assistance_request.location_checked_at = timezone.now()
        assistance_request.location_mismatch = False
        assistance_request.mismatch_status = (
            SeniorCitizenRequest.MismatchStatus.UNVERIFIED
        )

        assistance_request.save(
            update_fields=[
                "location_mismatch",
                "mismatch_status",
                "location_checked_at",
            ]
        )

        return {
            "detected_state": assistance_request.detected_state,
            "detected_district": assistance_request.detected_district,
            "location_mismatch": False,
            "mismatch_status": (
                SeniorCitizenRequest.MismatchStatus.UNVERIFIED
            ),
            "location_checked_at": (
                assistance_request.location_checked_at
            ),
        }