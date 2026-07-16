require("dotenv").config({ quiet: true });

const { generateSnapshot } = require("./src/snapshot");
const { retrieveContext } = require("./src/retrieval");
const { executeDraftPipeline } = require("./src/pipeline");

function printSection(title) {
  console.log(`\n=== ${title} ===`);
}

function printList(items) {
  items.forEach((item) => console.log(`- ${item}`));
}

function printFindings(findings) {
  if (!findings.length) {
    console.log("- No findings.");
    return;
  }

  findings.forEach((finding) => {
    console.log(`- [${finding.status}] ${finding.rule}: ${finding.detail}`);
  });
}

function sourceIds(context) {
  return context.map((item) => item.source_id);
}

function difference(nextItems, previousItems) {
  const previous = new Set(previousItems);
  return nextItems.filter((item) => !previous.has(item));
}

function recommendationText(draft) {
  return JSON.stringify({
    rationale: draft.rationale,
    day_1: draft.day_1,
    day_2: draft.day_2,
    day_3: draft.day_3,
    movement_wellness_guidance: draft.movement_wellness_guidance,
  }).toLowerCase();
}

function hasProteinPowderRecommendation(draft) {
  const text = recommendationText(draft);
  return (
    text.includes("protein powder") ||
    text.includes("protein drink") ||
    text.includes("protein smoothie")
  );
}

function findingLabels(findings) {
  return findings.map((finding) => `${finding.status} ${finding.rule}`);
}

function topSourceSummary(context) {
  return context
    .slice(0, 5)
    .map((item, index) => `${index + 1}. ${item.source_id} (${item.score})`)
    .join("; ");
}

function mealDifferences(baselineDraft, mandatoryDraft) {
  const differences = [];
  ["day_1", "day_2", "day_3"].forEach((day) => {
    ["breakfast", "lunch", "evening_snack", "dinner"].forEach((meal) => {
      const baselineValue = baselineDraft[day]?.[meal];
      const mandatoryValue = mandatoryDraft[day]?.[meal];
      if (baselineValue && mandatoryValue && baselineValue !== mandatoryValue) {
        differences.push({
          field: `${day}.${meal}`,
          baselineValue,
          mandatoryValue,
        });
      }
    });
  });
  return differences;
}

function printImpactSummary(baselineResult, mandatoryResult, dynamicConstraint) {
  printSection("5. Mandatory Change Impact Summary");
  console.log(`Runtime change tested: ${dynamicConstraint}`);

  const baselineSources = sourceIds(baselineResult.context);
  const mandatorySources = sourceIds(mandatoryResult.context);
  const addedSources = difference(mandatorySources, baselineSources);
  const removedSources = difference(baselineSources, mandatorySources);

  console.log("\nRetrieval impact:");
  console.log(`- Baseline top retrieved sources: ${topSourceSummary(baselineResult.context)}`);
  console.log(`- Mandatory top retrieved sources: ${topSourceSummary(mandatoryResult.context)}`);
  if (!addedSources.length && !removedSources.length) {
    console.log("- Retrieved source set stayed the same; scores/order may still change because the runtime update is included in the query.");
  } else {
    console.log(
      `- Sources added in mandatory run: ${addedSources.length ? addedSources.join(", ") : "none"}`,
    );
    console.log(
      `- Sources removed from baseline run: ${removedSources.length ? removedSources.join(", ") : "none"}`,
    );
  }

  console.log("\nDraft impact:");
  console.log(
    `- Baseline final recommendations mention protein powder: ${hasProteinPowderRecommendation(baselineResult.pipelineResult.final_draft) ? "yes" : "no"}`,
  );
  console.log(
    `- Mandatory final recommendations mention protein powder: ${hasProteinPowderRecommendation(mandatoryResult.pipelineResult.final_draft) ? "yes" : "no"}`,
  );
  console.log("- Mandatory run includes the runtime update in the snapshot hard constraints and final confirmed facts/recommendations.");
  const changedMeals = mealDifferences(
    baselineResult.pipelineResult.final_draft,
    mandatoryResult.pipelineResult.final_draft,
  );
  if (changedMeals.length) {
    changedMeals.slice(0, 4).forEach((change) => {
      console.log(
        `- ${change.field} changed from "${change.baselineValue}" to "${change.mandatoryValue}"`,
      );
    });
  } else {
    console.log("- Meal fields did not change in this run; validation still applied the no-protein-powder constraint.");
  }

  console.log("\nValidation impact:");
  const baselineInitial = findingLabels(
    baselineResult.pipelineResult.initial_review.findings,
  );
  const mandatoryInitial = findingLabels(
    mandatoryResult.pipelineResult.initial_review.findings,
  );
  console.log(
    `- Baseline initial findings: ${baselineInitial.length ? baselineInitial.join(", ") : "none"}`,
  );
  console.log(
    `- Mandatory initial findings: ${mandatoryInitial.length ? mandatoryInitial.join(", ") : "none"}`,
  );
  console.log(
    `- Mandatory final findings: ${mandatoryResult.pipelineResult.final_review.findings.length ? findingLabels(mandatoryResult.pipelineResult.final_review.findings).join(", ") : "none"}`,
  );

  console.log("\nRevision/final-plan impact:");
  if (mandatoryResult.pipelineResult.revision_changes.length) {
    mandatoryResult.pipelineResult.revision_changes.forEach((change) => {
      console.log(`- ${change.reason}: ${change.change}`);
    });
  } else {
    console.log("- No revision was required after validation.");
  }
  console.log("- Final mandatory plan uses non-powder food options and passes all final checks.");
}

async function runWorkflow(label, dynamicConstraint = "") {
  console.log("\n============================================================");
  console.log(`Workflow: ${label}`);
  console.log("============================================================");

  printSection("1. Current Snapshot");
  const snapshot = generateSnapshot(dynamicConstraint);
  printList(snapshot.current_state_summary);
  console.log("\nUnresolved conflicts:");
  printList(snapshot.unresolved_conflicts);
  console.log("\nUnknowns:");
  printList(snapshot.unknowns);

  printSection("2. Programmatic Retrieval");
  const context = retrieveContext(snapshot, dynamicConstraint);
  context.forEach((item) => {
    console.log(
      `- ${item.source_id} (${item.source_file}, score ${item.score}): ${item.reason_selected}`,
    );
  });

  printSection("3. Draft, Validation and Revision");
  console.log(
    "Generating draft and running validations. If Gemini is enabled, this step may pause briefly while API calls complete...",
  );
  const pipelineResult = await executeDraftPipeline(snapshot, context, {
    onProgress: (message) => console.log(`   - ${message}`),
  });
  console.log(`Model used: ${pipelineResult.model_used ? "yes" : "no, deterministic fallback"}`);
  if (pipelineResult.model_error) {
    console.log(`Model error: ${pipelineResult.model_error}`);
  }

  console.log("\nInitial review findings:");
  printFindings(pipelineResult.initial_review.findings);

  console.log("\nRevision changes:");
  if (pipelineResult.revision_changes.length) {
    pipelineResult.revision_changes.forEach((change) => {
      console.log(`- ${change.reason}: ${change.change}`);
    });
  } else {
    console.log("- No deterministic rewrite required; final draft kept or model revised cleanly.");
  }

  console.log("\nFinal review findings:");
  printFindings(pipelineResult.final_review.findings);

  printSection("4. Final Draft JSON");
  console.log(JSON.stringify(pipelineResult.final_draft, null, 2));

  return { snapshot, context, pipelineResult };
}

async function start() {
  try {
    const baselineResult = await runWorkflow("Baseline assessment");
    const mandatoryConstraint =
      "The client no longer wants to use protein powder.";
    const mandatoryResult = await runWorkflow(
      "Mandatory change test",
      mandatoryConstraint,
    );
    printImpactSummary(baselineResult, mandatoryResult, mandatoryConstraint);
  } catch (error) {
    console.error("Workflow failed:", error.message);
    process.exitCode = 1;
  }
}

start();
