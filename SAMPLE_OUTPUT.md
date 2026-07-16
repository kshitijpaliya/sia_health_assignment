# Sample CLI Output

This is a representative successful CLI run for submission review.

Model-generated wording may vary slightly between runs, especially when Gemini is enabled. The important expected behavior is that both workflows complete, validation is shown, and the mandatory protein-powder change is compared explicitly.

Command:

```powershell
node index.js
```

## Baseline Workflow

```text
========================================
Sia Health AI Tech Intern Assignment
========================================

Data directory: data
Mode: Gemini enabled when GEMINI_API_KEY is set; deterministic offline fallback otherwise.

=== Workflow: Baseline assessment ===

=== 1. Current Snapshot ===
Snapshot ID: SNAPSHOT.PROFILE.CURRENT
As of date: 2026-07-05

Current state summary:
- 26-year-old vegetarian female student living in a hostel.
- Goals include sustainable fat loss, better protein intake and PCOS-friendly eating.
- Canteen lunch is available and meal-service dinner is available on selected evenings.
- Recent progress includes improved steps, yoga and beginner strength training.

Hard constraints:
- Vegetarian meals only.
- Hostel-feasible preparation.
- Prefer quick meals and minimal cooking.
- Draft only; nutritionist approval required before use.

Unknowns:
- Current supplement status.
- Current thyroid lab values and units.
- Full allergy or intolerance history.
- Clinical follow-up status for historically infrequent cycles.

=== 2. Programmatic Retrieval ===
Search query:
vegetarian hostel feasible PCOS fat loss protein quick meals canteen dinner progress

Top retrieved context:
1. LOG.2026-07-05.reported_progress
2. LOG.2026-05-25.available_dinner_options
3. RULE.P1
4. LOG.2026-05-25.what_did_not_work
5. LOG.2026-07-05.unknowns

Retrieval notes:
- Lexical retrieval ranks source chunks by weighted token overlap.
- Dated facts and hard constraints receive additional priority.
- Retrieved source IDs are carried into final citations for inspectability.

=== 3. Draft, Validation and Revision ===
Drafting plan with available model/fallback. This can take a little time; validation and the final reviewed output will appear next.

Initial validation findings:
- No findings.

No revision required.

Final review findings:
- No findings.

=== 4. Final Draft JSON ===
{
  "draft_notice": "Draft only; requires nutritionist approval before use.",
  "confirmed_facts": [
    "26-year-old vegetarian female student living in a hostel.",
    "Canteen lunch remains available.",
    "Meal-service dinners are available four evenings per week."
  ],
  "assumptions": [
    "Canteen lunch remains available.",
    "Meal-service dinners are available four evenings per week.",
    "No unrecorded allergies or intolerances are assumed until confirmed."
  ],
  "missing_information": [
    "Current supplement status.",
    "Current thyroid lab values and units.",
    "Full allergy or intolerance history.",
    "Clinical follow-up status for historically infrequent cycles."
  ],
  "day_1": {
    "breakfast": "Savoury poha with curd",
    "lunch": "Canteen dal, cooked vegetable and roti",
    "evening_snack": "Curd or roasted chana with fruit",
    "dinner": "Meal-service roti, sabzi and dal"
  },
  "day_2": {
    "breakfast": "Vegetable upma with peanuts",
    "lunch": "Canteen rajma or chole with rice",
    "evening_snack": "Peanut chaat without salad prep",
    "dinner": "Idli with sambar"
  },
  "day_3": {
    "breakfast": "Besan chilla with curd",
    "lunch": "Canteen dal, rice and cooked vegetable",
    "evening_snack": "Milk or curd with banana",
    "dinner": "Vegetarian grain-and-legume bowl"
  },
  "movement_wellness_guidance": "Continue steps, yoga, beginner strength training and post-meal walks as tolerated.",
  "human_review_flags": [
    "Confirm current supplement status.",
    "Confirm clinical follow-up for historically infrequent cycles.",
    "Confirm thyroid status, lab units, ranges and dates.",
    "Confirm allergies or intolerances."
  ],
  "source_citations": [
    "PROFILE.CURRENT",
    "LOG.2026-07-05.reported_progress",
    "RULE.P2",
    "RULE.P3",
    "RULE.P7",
    "RULE.P8"
  ]
}
```

## Mandatory Change Test

The assignment requires running the workflow a second time after adding:

```text
The client no longer wants to use protein powder.
```

The CLI now prints this as a separate workflow and then summarizes what changed.

```text
=== Workflow: Mandatory change test ===

Runtime update:
The client no longer wants to use protein powder.

=== 1. Current Snapshot ===
Snapshot ID: SNAPSHOT.PROFILE.CURRENT
As of date: 2026-07-05

Hard constraints:
- Vegetarian meals only.
- Hostel-feasible preparation.
- Prefer quick meals and minimal cooking.
- The client no longer wants to use protein powder.
- Draft only; nutritionist approval required before use.

=== 2. Programmatic Retrieval ===
Search query:
vegetarian hostel feasible PCOS fat loss protein quick meals canteen dinner progress no protein powder

Top retrieved context:
1. LOG.2026-07-05.reported_progress
2. LOG.2026-05-25.available_dinner_options
3. RULE.P1
4. LOG.2026-05-25.what_did_not_work
5. LOG.2026-07-05.unknowns

=== 3. Draft, Validation and Revision ===
Drafting plan with available model/fallback. This can take a little time; validation and the final reviewed output will appear next.

Initial validation findings:
- No findings.

No revision required.

Final review findings:
- No findings.

=== 4. Final Draft JSON ===
{
  "draft_notice": "Draft only; requires nutritionist approval before use.",
  "confirmed_facts": [
    "26-year-old vegetarian female student living in a hostel.",
    "The client no longer wants to use protein powder.",
    "Canteen lunch remains available.",
    "Meal-service dinners are available four evenings per week."
  ],
  "day_1": {
    "breakfast": "Savoury poha with curd",
    "lunch": "Canteen dal, cooked vegetable and roti",
    "evening_snack": "Roasted chana with fruit",
    "dinner": "Meal-service roti, sabzi and dal"
  },
  "day_2": {
    "breakfast": "Vegetable upma with peanuts",
    "lunch": "Canteen rajma or chole with rice",
    "evening_snack": "Peanut chaat without salad prep",
    "dinner": "Idli with sambar"
  },
  "day_3": {
    "breakfast": "Besan chilla with curd",
    "lunch": "Canteen dal, rice and cooked vegetable",
    "evening_snack": "Milk or curd with banana",
    "dinner": "Vegetarian grain-and-legume bowl"
  },
  "human_review_flags": [
    "Confirm current supplement status.",
    "Confirm clinical follow-up for historically infrequent cycles.",
    "Confirm thyroid status, lab units, ranges and dates.",
    "Confirm allergies or intolerances."
  ]
}
```

## Mandatory Change Impact Summary

```text
=== 5. Mandatory Change Impact Summary ===
Runtime change tested: The client no longer wants to use protein powder.

Retrieval impact:
- Baseline top retrieved sources: 1. LOG.2026-07-05.reported_progress (44.66); 2. LOG.2026-05-25.available_dinner_options (21.62); 3. RULE.P1 (21.26); 4. LOG.2026-05-25.what_did_not_work (20.61); 5. LOG.2026-07-05.unknowns (20.35)
- Mandatory top retrieved sources: 1. LOG.2026-07-05.reported_progress (44.66); 2. LOG.2026-05-25.available_dinner_options (21.62); 3. RULE.P1 (21.26); 4. LOG.2026-05-25.what_did_not_work (20.61); 5. LOG.2026-07-05.unknowns (20.35)
- Retrieved source set stayed the same; scores/order may still change because the runtime update is included in the query.

Draft impact:
- Baseline final recommendations mention protein powder: no
- Mandatory final recommendations mention protein powder: no
- Mandatory run includes the runtime update in the snapshot hard constraints and final confirmed facts/recommendations.
- day_1.evening_snack changed from "Curd or roasted chana with fruit" to "Roasted chana with fruit"

Validation impact:
- Baseline initial findings: none
- Mandatory initial findings: none
- Mandatory final findings: none

Revision/final-plan impact:
- No revision was required after validation.
- Final mandatory plan uses non-powder food options and passes all final checks.
```

## Expected Completion Signal

Both the baseline workflow and the mandatory change workflow should end with:

```text
Final review findings:
- No findings.
```
