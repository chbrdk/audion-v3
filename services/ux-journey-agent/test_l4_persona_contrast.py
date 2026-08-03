"""L4 A/B soft checks (impatient vs patient lab dumps)."""

from __future__ import annotations

from persona_lab_l4 import l4_contrast_checks


def test_l4_ideal_contrast():
    checks = l4_contrast_checks(
        {
            "steps": 5,
            "impatientApplied": True,
            "abandonForced": True,
            "time_pressure": 0.9,
        },
        {
            "steps": 12,
            "impatientApplied": False,
            "abandonForced": False,
            "time_pressure": 0.2,
        },
    )
    assert all(ok for _, ok in checks)


def test_l4_fails_when_patient_also_forced():
    checks = dict(
        l4_contrast_checks(
            {
                "steps": 5,
                "impatientApplied": True,
                "abandonForced": True,
                "time_pressure": 0.9,
            },
            {
                "steps": 8,
                "impatientApplied": False,
                "abandonForced": True,
                "time_pressure": 0.2,
            },
        )
    )
    assert checks["abandon_only_impatient"] is False
    assert checks["impatient_budget_clamped"] is True
