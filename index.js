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
    await runWorkflow("Baseline assessment");
    await runWorkflow(
      "Mandatory change test",
      "The client no longer wants to use protein powder.",
    );
  } catch (error) {
    console.error("Workflow failed:", error.message);
    process.exitCode = 1;
  }
}

start();
