# Sia Assignment Rules

These are simplified, synthetic rules created only for this assessment. They are **not Sia Health's complete internal SOP** and are not an independent clinical guideline.

## Plan standards
- **RULE.P1** Use the latest dated client information when records conflict.
- **RULE.P2** The draft must be vegetarian and realistic for the client's food access.
- **RULE.P3** Aggressive weight loss, calorie-deficit language and meal skipping are inappropriate for this case.
- **RULE.P4** Avoid repeating the same breakfast on all three days.
- **RULE.P5** Cite a source ID for each major recommendation or decision.
- **RULE.P6** Separate confirmed facts, assumptions and missing information.
- **RULE.P7** Prefer canteen, home meals and meal-service options over elaborate daily cooking.
- **RULE.P8** Label the output as a draft requiring nutritionist approval.

## Hard checks to implement in code
- **RULE.H1** Fail if a non-vegetarian food is recommended.
- **RULE.H2** Fail if the draft recommends aggressive weight loss, calorie restriction or meal skipping.
- **RULE.H3** Fail if it starts, extends or doses a supplement or medication.
- **RULE.H4** Fail if it claims that a food, supplement or plan cured reflux, migraine or blood-sugar risk.
- **RULE.H5** Fail if it confidently interprets a laboratory value without units/reference ranges.
- **RULE.H6** Fail if daily elaborate cooking or packed salads are required.
- **RULE.H7** Fail if a condition or deficiency is described as cured.

## Human-review triggers
- **RULE.R1** Current iron supplement status is unknown.
- **RULE.R2** Reflux symptoms and medication status require appropriate clinical follow-up if persistent.
- **RULE.R3** Laboratory context is incomplete.
- **RULE.R4** Migraine triggers and medication use are not confirmed.
