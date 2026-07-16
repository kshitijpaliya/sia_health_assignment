# Sample CLI Output

This is a representative successful run of:

```powershell
node index.js
```

Model output can vary slightly between runs, but the workflow should remain inspectable and both runs should end with:

```text
Final review findings:
- No findings.
```

## Baseline Assessment

```text
============================================================
Workflow: Baseline assessment
============================================================

=== 1. Current Snapshot ===
- Vegetarian client in hostel setting; current weight is 44 kg.
- A menstrual cycle was reported in June after a long gap; causality is unknown
- Energy, digestion and sleep are currently good
- A nearby meal service is available four evenings per week
- Current access: canteen lunch available, shared kitchen 3 days/wk, meal service 4 evenings/wk.

Unresolved conflicts:
- Past issue to avoid: Dinner suggestions requiring separate salad preparation or extensive cooking
- Latest dated records and current constraints should override older plan fragments when they conflict.

Unknowns:
- Current supplement use and completion status
- Current medical follow-up for very irregular cycles
- Laboratory units, reference ranges and dates
- Current thyroid diagnosis and treatment status
- Any unrecorded allergies or intolerances
- No new laboratory report
- Current supplement status is not confirmed

=== 2. Programmatic Retrieval ===
- LOG.2026-07-05.reported_progress (progress_logs.json, score 44.66): BM25 lexical match on [reported, menstrual, cycle, june, after, long, gap, causality]; dated 2026-07-05
- LOG.2026-05-25.available_dinner_options (progress_logs.json, score 21.62): BM25 lexical match on [available, dinner, roti, sabzi, idli, sambar, dosa]; dated 2026-05-25
- RULE.P1 (sia_assignment_rules.md, score 21.26): BM25 lexical match on [use, latest, dated, client, when, records, conflict]
- LOG.2026-05-25.what_did_not_work (progress_logs.json, score 20.61): BM25 lexical match on [not, dinner, suggestions, requiring, separate, salad, preparation, extensive]; dated 2026-05-25
- LOG.2026-07-05.unknowns (progress_logs.json, score 20.35): BM25 lexical match on [new, laboratory, report, current, supplement, status, not, confirmed]; dated 2026-07-05
- PLAN.FEEDBACK.4 (previous_plan_sample.md, score 14.11): BM25 lexical match on [prepared, salad, dinners, not, hostel]
- RULE.P7 (sia_assignment_rules.md, score 14.07): BM25 lexical match on [canteen, meal, service, elaborate, daily, cooking]
- RULE.H6 (sia_assignment_rules.md, score 13.74): BM25 lexical match on [daily, elaborate, cooking, prepared, salads]

=== 3. Draft, Validation and Revision ===
Generating draft and running validations. If Gemini is enabled, this step may pause briefly while API calls complete...
   - Calling Gemini for the initial structured draft. This can take a few seconds...
   - Running deterministic hard checks plus quality and uncertainty reviews...
   - Validation findings found; asking Gemini for revision attempt 1/2...
   - Final validation pass complete.
Model used: yes

Initial review findings:
- [FAIL] RULE.H6: Detected unrealistic daily cooking or salad requirement: elaborate cooking
- [WARN] REVIEW.UNKNOWN: Human-review output should surface unresolved cycle context.
- [WARN] REVIEW.UNKNOWN: Human-review output should surface unresolved laboratory context.
- [WARN] REVIEW.UNKNOWN: Human-review output should surface unresolved allergies context.

Revision changes:
- Model revision attempt 1: Model addressed validation findings.

Final review findings:
- No findings.

=== 4. Final Draft JSON ===
{
  "draft_notice": "This is a non-clinical draft for hostel-based nutrition support. It requires nutritionist review and approval before implementation.",
  "confirmed_facts": [
    "Client is a 23-year-old vegetarian in a hostel setting.",
    "Current weight is 44 kg; goal is maintenance.",
    "Client has access to canteen lunches and a meal service 4 evenings/week.",
    "Client prefers savoury, quick-to-prepare breakfasts.",
    "Strength training is part of the client's current activity level.",
    "Protein powder is acceptable 3-4 times per week."
  ],
  "missing_information": [
    "Current status of Vitamin B12, Vitamin D, and iron supplementation.",
    "Medical status of PCOS, thyroid, and the causality of the recent menstrual cycle.",
    "Full details of laboratory reference ranges and dates.",
    "Confirmation of any unidentified food allergies."
  ],
  "day_1": {
    "breakfast": "Upma with added roasted peanuts (quick preparation, <15 min).",
    "lunch": "Balanced canteen meal with dal, a vegetable dish, and rice or roti.",
    "evening_snack": "Handful of almonds or walnuts and a piece of seasonal fruit.",
    "dinner": "Meal service option: Roti and sabzi with a small bowl of curd."
  },
  "source_citations": [
    "LOG.2026-07-05.reported_progress",
    "LOG.2026-05-25.available_dinner_options",
    "RULE.P7",
    "PLAN.FEEDBACK.4"
  ]
}
```

## Mandatory Change Test

```text
============================================================
Workflow: Mandatory change test
============================================================

=== 1. Current Snapshot ===
- Vegetarian client in hostel setting; current weight is 44 kg.
- A menstrual cycle was reported in June after a long gap; causality is unknown
- Energy, digestion and sleep are currently good
- A nearby meal service is available four evenings per week
- Current access: canteen lunch available, shared kitchen 3 days/wk, meal service 4 evenings/wk.

Unresolved conflicts:
- Past issue to avoid: Dinner suggestions requiring separate salad preparation or extensive cooking
- Latest dated records and current constraints should override older plan fragments when they conflict.
- Runtime update overrides older plan preferences: The client no longer wants to use protein powder.

=== 2. Programmatic Retrieval ===
- LOG.2026-07-05.reported_progress (progress_logs.json, score 44.66): BM25 lexical match on [reported, menstrual, cycle, june, after, long, gap, causality]; dated 2026-07-05
- LOG.2026-05-25.available_dinner_options (progress_logs.json, score 21.62): BM25 lexical match on [available, dinner, roti, sabzi, idli, sambar, dosa]; dated 2026-05-25
- PLAN.FEEDBACK.5 (previous_plan_sample.md, score 17.37): BM25 lexical match on [current, preferences, access, dated, override, older, plan]
- RULE.P7 (sia_assignment_rules.md, score 14.07): BM25 lexical match on [canteen, meal, service, elaborate, daily, cooking]
- RULE.H6 (sia_assignment_rules.md, score 13.74): BM25 lexical match on [daily, elaborate, cooking, prepared, salads]

=== 3. Draft, Validation and Revision ===
Generating draft and running validations. If Gemini is enabled, this step may pause briefly while API calls complete...
   - Calling Gemini for the initial structured draft. This can take a few seconds...
   - Running deterministic hard checks plus quality and uncertainty reviews...
   - Validation findings found; asking Gemini for revision attempt 1/2...
   - Validation findings found; asking Gemini for revision attempt 2/2...
   - Normalizing missing-information and human-review fields from the snapshot...
   - Final validation pass complete.
Model used: yes

Initial review findings:
- [FAIL] RULE.H6: Detected unrealistic daily cooking or salad requirement: salad
- [WARN] REVIEW.UNKNOWN: Human-review output should surface unresolved laboratory context.
- [WARN] REVIEW.UNKNOWN: Human-review output should surface unresolved allergies context.

Revision changes:
- Model revision attempt 1: Model output still had validation findings.
- Model revision attempt 2: Model addressed validation findings.
- REVIEW.UNKNOWN: Normalized missing information and human-review flags from snapshot unknowns.

Final review findings:
- No findings.

=== 4. Final Draft JSON ===
{
  "draft_notice": "DRAFT ONLY: This meal plan is for illustrative purposes based on client preferences and hostel access constraints. It does not constitute clinical nutrition therapy. A nutritionist must review this plan before use.",
  "confirmed_facts": [
    "Client is a 23-year-old vegetarian in a hostel setting.",
    "Current weight is 44 kg.",
    "Access includes canteen lunch, shared kitchen 3 days/week, and meal service 4 evenings/week.",
    "Client prefers savoury breakfasts requiring less than 15 minutes of prep.",
    "Protein powder is explicitly excluded per the latest runtime request.",
    "Client performs strength training and reports hunger post-dinner."
  ],
  "missing_information": [
    "Current supplement use and completion status",
    "Current medical follow-up for very irregular cycles",
    "Laboratory units, reference ranges and dates",
    "Current thyroid diagnosis and treatment status",
    "Any unrecorded allergies or intolerances",
    "No new laboratory report",
    "Current supplement status is not confirmed"
  ],
  "day_1": {
    "breakfast": "Savory vegetable upma with peanuts (quick prep in shared kitchen).",
    "lunch": "Hostel canteen vegetarian thali (dal, seasonal vegetable, roti/rice).",
    "evening_snack": "A handful of roasted chickpeas (chana) and seasonal fruit.",
    "dinner": "Meal service: Roti and sabzi (add a side of curd for additional satiety)."
  },
  "source_citations": [
    "LOG.2026-07-05 (Progress updates and preferences)",
    "LOG.2026-05-25 (Dinner access and cooking constraints)",
    "RULE.H6 (Hostel access constraints)",
    "RULE.P1 (Conflict resolution)"
  ]
}
```
