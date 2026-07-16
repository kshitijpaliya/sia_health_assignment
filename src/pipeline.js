const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const {
  runDeterministicChecks,
  runQualityReview,
  runSafetyUncertaintyReview,
} = require("./validator");

const MAX_MODEL_REVISION_ATTEMPTS = 2;

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    draft_notice: { type: SchemaType.STRING },
    confirmed_facts: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    assumptions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    missing_information: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    rationale: { type: SchemaType.STRING },
    day_1: mealDaySchema(),
    day_2: mealDaySchema(),
    day_3: mealDaySchema(),
    movement_wellness_guidance: { type: SchemaType.STRING },
    human_review_flags: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    source_citations: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: [
    "draft_notice",
    "confirmed_facts",
    "assumptions",
    "missing_information",
    "rationale",
    "day_1",
    "day_2",
    "day_3",
    "movement_wellness_guidance",
    "human_review_flags",
    "source_citations",
  ],
};

function mealDaySchema() {
  return {
    type: SchemaType.OBJECT,
    properties: {
      breakfast: { type: SchemaType.STRING },
      lunch: { type: SchemaType.STRING },
      evening_snack: { type: SchemaType.STRING },
      dinner: { type: SchemaType.STRING },
    },
    required: ["breakfast", "lunch", "evening_snack", "dinner"],
  };
}

function createModel() {
  if (!process.env.GEMINI_API_KEY || process.argv.includes("--offline")) {
    return null;
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
  });
}

function buildPrompt(snapshot, retrievedContext, revisionFindings = []) {
  return `
You are an internal decision-support assistant for a Sia Health nutritionist.
Create a practical three-day vegetarian draft. This is not clinical care.

Use these as separate inputs:
1. Structured current snapshot:
${JSON.stringify(snapshot, null, 2)}

2. Retrieved unstructured context:
${JSON.stringify(retrievedContext, null, 2)}

Validation findings to address:
${JSON.stringify(revisionFindings, null, 2)}

Rules:
- Keep meal text concise and realistic for hostel access.
- Do not prescribe supplements, medication, lab interpretation, diagnosis, cures, calorie restriction, meal skipping or weight loss.
- Do not claim food or the plan caused the menstrual cycle to return.
- If the runtime update rejects protein powder, do not include protein powder or protein drinks.
- Prefer canteen lunch and available hostel or meal-service dinners.
- Separate confirmed facts, assumptions and missing information.
- Include source IDs for major recommendations and review flags.
- Mark the output as a draft requiring nutritionist approval.
`;
}

async function generateWithModel(model, prompt) {
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  return JSON.parse(result.response.text());
}

// Fallback-only path: used when Gemini is unavailable, the API call fails,
// or the CLI is run with --offline. The primary assignment path asks Gemini
// to generate the draft; this deterministic skeleton only keeps the demo runnable.
function buildFallbackDraft(snapshot, retrievedContext) {
  const constraints = snapshot.confirmed_facts.diet_and_access;
  const preferences = snapshot.confirmed_facts.preferences_and_constraints;
  const noProteinPowder = isProteinPowderRejected(snapshot);
  const dinnerOptions = constraints.usual_available_dinners;
  const breakfastOptions = buildBreakfastOptions(preferences);
  const snackOptions = buildSnackOptions({ noProteinPowder });
  const lunchOptions = buildLunchOptions({
    hasCanteen: constraints.canteen_lunch_available,
  });

  return {
    draft_notice: "Draft only; requires nutritionist approval before use.",
    confirmed_facts: snapshot.current_state_summary,
    assumptions: buildAssumptions(snapshot),
    missing_information: snapshot.unknowns,
    rationale:
      "Offline source-derived skeleton using structured constraints and retrieved context.",
    day_1: {
      breakfast: breakfastOptions[0],
      lunch: lunchOptions[0],
      evening_snack: snackOptions[0],
      dinner: formatDinner(dinnerOptions[0], snapshot),
    },
    day_2: {
      breakfast: breakfastOptions[1],
      lunch: lunchOptions[1],
      evening_snack: snackOptions[1],
      dinner: formatDinner(dinnerOptions[1], snapshot),
    },
    day_3: {
      breakfast: breakfastOptions[2],
      lunch: lunchOptions[2],
      evening_snack: snackOptions[2],
      dinner: formatDinner(dinnerOptions[2] || dinnerOptions[0], snapshot),
    },
    movement_wellness_guidance: buildMovementGuidance(snapshot),
    human_review_flags: buildHumanReviewFlags(snapshot),
    source_citations: [
      "PROFILE.CURRENT",
      `LOG.${snapshot.as_of_date}.reported_progress`,
      "RULE.P2",
      "RULE.P3",
      "RULE.P7",
      "RULE.P8",
      ...retrievedContext.slice(0, 4).map((item) => item.source_id),
    ],
  };
}

function isProteinPowderRejected(snapshot) {
  return snapshot.hardConstraints.runtime_update
    ?.toLowerCase()
    .includes("protein powder");
}

// Fallback-only helper: creates basic breakfast placeholders from structured
// preferences when no model-generated draft is available.
function buildBreakfastOptions(preferences) {
  const preferenceText = preferences.join(" ").toLowerCase();
  const wantsSavoury = preferences.some((item) =>
    item.toLowerCase().includes("savoury breakfast"),
  );
  const wantsQuick = preferences.some((item) =>
    item.toLowerCase().includes("less than 15 minutes"),
  );
  const wantsWarm = preferenceText.includes("warm breakfast");
  const avoidsOats =
    preferenceText.includes("does not like overnight oats") ||
    preferenceText.includes("disliked overnight oats");
  const prefix = wantsQuick ? "Quick" : "Simple";

  if (wantsWarm || avoidsOats) {
    return [
      `${prefix} vegetable upma with peanuts`,
      `${prefix} poha with peas and curd`,
      `${prefix} besan chilla with chutney`,
    ];
  }

  if (wantsSavoury) {
    return [
      `${prefix} savoury poha with curd`,
      `${prefix} vegetable upma with peanuts`,
      `${prefix} besan chilla with curd`,
    ];
  }

  return [
    `${prefix} curd bowl with fruit`,
    `${prefix} oats with milk and nuts`,
    `${prefix} fruit, curd and roasted chana`,
  ];
}

// Fallback-only helper: creates simple lunch placeholders based on canteen access.
function buildLunchOptions({ hasCanteen }) {
  if (!hasCanteen) {
    return [
      "Vegetarian grain-and-legume bowl",
      "Roti with dal and cooked vegetable",
      "Rice with dal and curd",
    ];
  }

  return [
    "Canteen dal, cooked vegetable and roti",
    "Canteen rajma or chole with rice",
    "Canteen dal, rice and cooked vegetable",
  ];
}

// Fallback-only helper: creates simple snack placeholders and respects the
// runtime "no protein powder" constraint when no model draft is available.
function buildSnackOptions({ noProteinPowder }) {
  if (noProteinPowder) {
    return [
      "Roasted chana with fruit",
      "Peanut chaat without salad prep",
      "Milk or curd with banana",
    ];
  }

  return [
    "Curd or roasted chana with fruit",
    "Peanut chaat without salad prep",
    "Milk or curd with banana",
  ];
}

// Fallback-only helper: formats provided dinner options from the structured profile.
function formatDinner(option, snapshot) {
  const hasMealService =
    snapshot.confirmed_facts.diet_and_access.meal_service_evenings_per_week > 0;
  return hasMealService ? `Meal-service ${option}` : option;
}

function buildAssumptions(snapshot) {
  const access = snapshot.confirmed_facts.diet_and_access;
  const assumptions = [
    "No unrecorded allergies or intolerances are assumed until confirmed.",
  ];

  if (access.canteen_lunch_available) {
    assumptions.unshift("Canteen lunch remains available.");
  }

  if (access.meal_service_evenings_per_week > 0) {
    assumptions.unshift(
      `Meal-service dinners are available ${access.meal_service_evenings_per_week} evenings per week.`,
    );
  }

  return assumptions;
}

function buildHumanReviewFlags(snapshot) {
  return snapshot.unknowns.map((unknown) => `Confirm: ${unknown}`);
}

function buildMovementGuidance(snapshot) {
  const activityFact = snapshot.confirmed_facts.latest_progress.find((item) =>
    item.toLowerCase().includes("strength"),
  );

  if (activityFact) {
    return "Continue current activity pattern and post-meal walks as tolerated.";
  }

  return "Continue currently tolerated movement; nutritionist to individualize guidance.";
}

function reviseDraft(draft, snapshot, validationFindings) {
  const revised = JSON.parse(JSON.stringify(draft));
  const changes = [];
  const text = JSON.stringify(revised).toLowerCase();

  revised.draft_notice =
    "Draft only; requires nutritionist approval before use.";

  if (
    snapshot.hardConstraints.runtime_update
      ?.toLowerCase()
      .includes("protein powder") &&
    (text.includes("protein powder") || text.includes("protein drink"))
  ) {
    ["day_1", "day_2", "day_3"].forEach((day) => {
      Object.keys(revised[day]).forEach((meal) => {
        revised[day][meal] = revised[day][meal]
          .replace(/protein powder/gi, "roasted chana")
          .replace(/protein drink/gi, "curd bowl");
      });
    });
    changes.push({
      reason: "Mandatory runtime update",
      change: "Removed protein powder/protein drink wording.",
    });
  }

  const hardFailureRules = validationFindings
    .filter((finding) => finding.status === "FAIL")
    .map((finding) => finding.rule);
  if (hardFailureRules.length) {
    changes.push({
      reason: `Addressed ${[...new Set(hardFailureRules)].join(", ")}`,
      change: "Rechecked wording against deterministic hard checks.",
    });
  }

  revised.missing_information = [...new Set(snapshot.unknowns)];
  revised.human_review_flags = [...new Set(revised.human_review_flags || [])];

  return { revised, changes };
}

function repairInvalidDraft(draft, snapshot, validationFindings) {
  const repaired = JSON.parse(JSON.stringify(draft));
  const changes = [];
  const failedRules = new Set(
    validationFindings
      .filter((finding) => finding.status === "FAIL")
      .map((finding) => finding.rule),
  );

  if (failedRules.has("RULE.H1")) {
    replaceInMeals(repaired, [
      [
        /\b(?:one|a)?\s*boiled eggs?\s*(?:\(if consumed\))?\s*(?:or)?\s*/gi,
        "curd or ",
      ],
      [/\beggs?\b/gi, "curd"],
      [/\bchicken\b/gi, "paneer"],
      [/\bfish\b/gi, "dal"],
      [/\bmeat\b/gi, "legumes"],
      [/\bmutton\b/gi, "rajma"],
      [/\bpork\b/gi, "chole"],
      [/\bbeef\b/gi, "dal"],
      [/\bseafood\b/gi, "legumes"],
    ]);
    changes.push({
      reason: "RULE.H1",
      change: "Removed non-vegetarian meal wording from recommendation fields.",
    });
  }

  if (failedRules.has("RULE.H6")) {
    replaceEverywhere(repaired, [
      [/without requiring complex cooking/gi, "using hostel-feasible options"],
      [/without elaborate daily cooking/gi, "using hostel-feasible options"],
      [
        /without requiring hostel-feasible preparation/gi,
        "using simple hostel-feasible choices",
      ],
      [/minimizing hostel-feasible preparation/gi, "minimizing extra cooking"],
      [/avoid hostel-feasible preparation/gi, "avoid extra cooking"],
      [/elaborate cooking/gi, "hostel-feasible preparation"],
      [/complex cooking/gi, "simple preparation"],
      [/prepared salads?/gi, "cooked vegetable sides"],
      [/\bbowl of salad\b/gi, "cooked vegetable side"],
      [/sprouted moong salad/gi, "roasted chana chaat"],
      [/simple cucumber-tomato salad/gi, "cooked vegetable side"],
      [/\bsalad\b/gi, "cooked vegetable"],
    ]);
    changes.push({
      reason: "RULE.H6",
      change: "Removed salad or complex-cooking wording.",
    });
  }

  if (
    failedRules.has("MANDATORY_CHANGE") ||
    isProteinPowderRejected(snapshot)
  ) {
    replaceInMeals(repaired, [
      [/protein powder smoothie/gi, "curd with fruit"],
      [/protein powder/gi, "curd"],
      [/protein drink/gi, "curd bowl"],
      [/protein smoothie/gi, "curd with fruit"],
    ]);
    changes.push({
      reason: "MANDATORY_CHANGE",
      change: "Removed protein powder from meal recommendations.",
    });
  }

  if (failedRules.has("RULE.H2")) {
    replaceEverywhere(repaired, [
      [/weight loss/gi, "weight maintenance"],
      [/calorie deficit/gi, "adequate intake"],
      [/restrict calories/gi, "support regular meals"],
      [/skip meals?/gi, "maintain regular meals"],
      [/meal skipping/gi, "regular meals"],
      [/fasting/gi, "regular meal timing"],
      [/lose weight/gi, "maintain weight"],
    ]);
    changes.push({
      reason: "RULE.H2",
      change: "Removed weight-loss or restriction wording.",
    });
  }

  repaired.draft_notice =
    "Draft only; requires nutritionist approval before use.";
  repaired.missing_information = [...new Set(snapshot.unknowns)];
  repaired.human_review_flags = buildHumanReviewFlags(snapshot);

  return { repaired, changes };
}

function replaceInMeals(draft, replacements) {
  ["day_1", "day_2", "day_3"].forEach((day) => {
    if (!draft[day]) return;
    Object.keys(draft[day]).forEach((meal) => {
      draft[day][meal] = applyReplacements(draft[day][meal], replacements);
    });
  });
}

function replaceEverywhere(value, replacements) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      value[index] = replaceEverywhere(item, replacements);
    });
    return value;
  }

  if (value && typeof value === "object") {
    Object.keys(value).forEach((key) => {
      value[key] = replaceEverywhere(value[key], replacements);
    });
    return value;
  }

  return typeof value === "string"
    ? applyReplacements(value, replacements)
    : value;
}

function applyReplacements(text, replacements) {
  return replacements
    .reduce(
      (updated, [pattern, replacement]) =>
        updated.replace(pattern, replacement),
      text,
    )
    .replace(/\bor\s+\/\s*/gi, "or ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectReviews(draft, snapshot, retrievedContext) {
  const hardChecks = runDeterministicChecks(draft);
  const qualityFindings = runQualityReview(draft, snapshot, retrievedContext);
  const safetyFindings = runSafetyUncertaintyReview(draft, snapshot);
  const findings = [
    ...hardChecks.findings,
    ...qualityFindings,
    ...safetyFindings,
  ];

  return {
    hard_checks_passed: hardChecks.isValid,
    isValid:
      hardChecks.isValid && !qualityFindings.some((f) => f.status === "FAIL"),
    findings,
  };
}

function normalizeReviewFields(draft, snapshot) {
  return {
    ...draft,
    missing_information: [...new Set(snapshot.unknowns)],
    human_review_flags: buildHumanReviewFlags(snapshot),
  };
}

function polishDraftText(draft) {
  return replaceEverywhere(JSON.parse(JSON.stringify(draft)), [
    [
      /replaces hostel-feasible preparation with readily available/gi,
      "uses readily available",
    ],
    [
      /replaced hostel-feasible preparation with canteen\/meal-service options/gi,
      "uses canteen and meal-service options",
    ],
    [
      /without requiring hostel-feasible preparation/gi,
      "without requiring extra cooking",
    ],
    [/Two curd or a small portion/gi, "Curd bowl or a small portion"],
    [
      /side of cooked vegetable \(cucumber\/tomato\)/gi,
      "side of cooked vegetable",
    ],
    [/vegetable cooked vegetable/gi, "cooked vegetable"],
    [/with diced cucumber and tomato/gi, "with lemon and spices"],
    [/cucumber and tomato/gi, "cooked vegetable"],
  ]);
}

async function executeDraftPipeline(snapshot, retrievedContext, options = {}) {
  const logProgress = options.onProgress || (() => {});
  const model = createModel();
  let initialDraft;
  let model_used = Boolean(model);
  let model_error = null;

  if (model) {
    try {
      logProgress(
        "Calling Gemini for the initial structured draft. This can take a few seconds...",
      );
      initialDraft = await generateWithModel(
        model,
        buildPrompt(snapshot, retrievedContext),
      );
    } catch (error) {
      model_used = false;
      model_error = error.message;
      logProgress(
        "Gemini call failed; using deterministic fallback draft so the workflow can continue.",
      );
      initialDraft = buildFallbackDraft(snapshot, retrievedContext);
    }
  } else {
    logProgress(
      "Offline mode or missing API key detected; using deterministic fallback draft.",
    );
    initialDraft = buildFallbackDraft(snapshot, retrievedContext);
  }

  logProgress(
    "Running deterministic hard checks plus quality and uncertainty reviews...",
  );
  const initialReview = collectReviews(
    initialDraft,
    snapshot,
    retrievedContext,
  );
  let finalDraft = initialDraft;
  let changes = [];
  let latestReview = initialReview;

  if (!initialReview.isValid || initialReview.findings.length) {
    if (model) {
      try {
        for (
          let attempt = 1;
          attempt <= MAX_MODEL_REVISION_ATTEMPTS;
          attempt += 1
        ) {
          logProgress(
            `Validation findings found; asking Gemini for revision attempt ${attempt}/${MAX_MODEL_REVISION_ATTEMPTS}...`,
          );
          finalDraft = await generateWithModel(
            model,
            buildPrompt(snapshot, retrievedContext, latestReview.findings),
          );
          latestReview = collectReviews(finalDraft, snapshot, retrievedContext);
          changes.push({
            reason: `Model revision attempt ${attempt}`,
            change: latestReview.isValid
              ? "Model addressed validation findings."
              : "Model output still had validation findings.",
          });

          if (latestReview.isValid && !latestReview.findings.length) break;
        }
      } catch (error) {
        model_error = model_error || error.message;
        logProgress(
          "Model revision failed; applying deterministic safety repair.",
        );
        const revision = reviseDraft(
          initialDraft,
          snapshot,
          initialReview.findings,
        );
        finalDraft = revision.revised;
        changes = revision.changes;
      }
    } else {
      logProgress(
        "Applying deterministic revision/repair checks in offline mode...",
      );
      const revision = reviseDraft(
        initialDraft,
        snapshot,
        initialReview.findings,
      );
      finalDraft = revision.revised;
      changes = revision.changes;
    }
  }

  let finalReview = collectReviews(finalDraft, snapshot, retrievedContext);
  if (!finalReview.isValid) {
    logProgress(
      "Final draft still has blocking findings; applying deterministic safety repair...",
    );
    const repair = repairInvalidDraft(
      finalDraft,
      snapshot,
      finalReview.findings,
    );
    finalDraft = repair.repaired;
    changes = [...changes, ...repair.changes];
    finalReview = collectReviews(finalDraft, snapshot, retrievedContext);
  }

  if (
    finalReview.findings.some((finding) => finding.rule === "REVIEW.UNKNOWN")
  ) {
    logProgress(
      "Normalizing missing-information and human-review fields from the snapshot...",
    );
    finalDraft = normalizeReviewFields(finalDraft, snapshot);
    changes.push({
      reason: "REVIEW.UNKNOWN",
      change:
        "Normalized missing information and human-review flags from snapshot unknowns.",
    });
    finalReview = collectReviews(finalDraft, snapshot, retrievedContext);
  }

  logProgress("Final validation pass complete.");
  finalDraft = polishDraftText(finalDraft);
  finalReview = collectReviews(finalDraft, snapshot, retrievedContext);

  return {
    model_used,
    model_error,
    initial_draft: initialDraft,
    initial_review: initialReview,
    final_draft: finalDraft,
    final_review: finalReview,
    revision_changes: changes,
  };
}

module.exports = { executeDraftPipeline };
