"""Persona Lab L4 — soft A/B checks (impatient vs patient)."""

from __future__ import annotations


def l4_contrast_checks(impatient: dict, patient: dict) -> list[tuple[str, bool]]:
    """Return named soft-pass checks for Persona Lab L4."""
    return [
        (
            "patient_more_or_equal_steps",
            int(patient.get("steps") or 0) >= int(impatient.get("steps") or 0),
        ),
        (
            "impatient_budget_clamped",
            bool(impatient.get("impatientApplied")) and not bool(patient.get("impatientApplied")),
        ),
        (
            "abandon_only_impatient",
            bool(impatient.get("abandonForced")) and not bool(patient.get("abandonForced")),
        ),
        (
            "time_pressure_delta",
            float(impatient.get("time_pressure") or 0) >= 0.75
            and float(patient.get("time_pressure") or 1) <= 0.34,
        ),
    ]
