"""Persona Lab L4 — soft A/B checks (impatient vs patient), incl. perception metrics."""

from __future__ import annotations


def l4_contrast_checks(impatient: dict, patient: dict) -> list[tuple[str, bool]]:
    """Return named soft-pass checks for Persona Lab L4."""
    imp_noticed = impatient.get("meanNoticed")
    pat_noticed = patient.get("meanNoticed")
    noticed_ok = True
    if isinstance(imp_noticed, (int, float)) and isinstance(pat_noticed, (int, float)):
        noticed_ok = float(pat_noticed) + 0.01 >= float(imp_noticed)

    imp_abandon = impatient.get("abandonStep")
    pat_abandon = patient.get("abandonStep")
    abandon_timing_ok = True
    if isinstance(imp_abandon, int) and isinstance(pat_abandon, int):
        abandon_timing_ok = imp_abandon <= pat_abandon
    elif isinstance(imp_abandon, int) and pat_abandon is None:
        abandon_timing_ok = True
    elif imp_abandon is None and isinstance(pat_abandon, int):
        abandon_timing_ok = False

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
        (
            "patient_notices_more_or_equal",
            noticed_ok,
        ),
        (
            "impatient_abandons_earlier_or_only",
            abandon_timing_ok,
        ),
    ]
