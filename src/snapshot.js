const fs = require("fs");
const path = require("path");

function dataPath(fileName) {
  return path.join(process.env.DATA_DIR || "data", fileName);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8"));
}

function generateSnapshot(dynamicConstraint = "") {
  const profile = readJson(dataPath("client_profile.json"));
  const progressLogs = readJson(dataPath("progress_logs.json"));
  const logs = [...progressLogs.logs].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );
  const latestLog = logs[logs.length - 1];

  const hardConstraints = {
    dietary_preference: profile.diet_and_access.dietary_preference,
    living_context: profile.diet_and_access.living_context,
    cooking_access: `Shared kitchen ${profile.diet_and_access.shared_kitchen_access_days_per_week} days/wk; meal service ${profile.diet_and_access.meal_service_evenings_per_week} evenings/wk`,
    usual_dinners: profile.diet_and_access.usual_available_dinners,
    weight_goal: "Weight maintenance; no calorie restriction or meal skipping",
  };

  if (dynamicConstraint) {
    hardConstraints.runtime_update = dynamicConstraint;
  }

  const unknowns = [
    ...profile.open_questions_for_human_confirmation,
    ...(latestLog.unknowns || []),
  ];

  const priorIssues = logs
    .flatMap((log) => log.what_did_not_work || [])
    .map((issue) => `Past issue to avoid: ${issue}`);
  const unresolvedConflicts = [
    ...priorIssues,
    "Latest dated records and current constraints should override older plan fragments when they conflict.",
  ];

  if (dynamicConstraint.toLowerCase().includes("no longer wants")) {
    unresolvedConflicts.push(
      `Runtime update overrides older plan preferences: ${dynamicConstraint}`,
    );
  }

  return {
    client_id: profile.client_id,
    as_of_date: latestLog.date,
    current_state_summary: [
      `${capitalize(profile.diet_and_access.dietary_preference)} client in ${profile.diet_and_access.living_context} setting; current weight is ${profile.demographics.current_weight_kg} kg.`,
      ...latestLog.reported_progress.slice(0, 3),
      `Current access: canteen lunch ${profile.diet_and_access.canteen_lunch_available ? "available" : "not available"}, shared kitchen ${profile.diet_and_access.shared_kitchen_access_days_per_week} days/wk, meal service ${profile.diet_and_access.meal_service_evenings_per_week} evenings/wk.`,
    ],
    confirmed_facts: {
      demographics: profile.demographics,
      reported_conditions: profile.reported_conditions,
      diet_and_access: profile.diet_and_access,
      latest_progress: latestLog.reported_progress,
      preferences_and_constraints: profile.preferences_and_constraints,
    },
    hardConstraints,
    dated_logs: logs,
    historical_labs: profile.selected_historical_labs,
    historical_supplement_record: profile.historical_supplement_record,
    unresolved_conflicts: unresolvedConflicts,
    unknowns: [...new Set(unknowns)],
  };
}

function capitalize(value) {
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

module.exports = { generateSnapshot };
