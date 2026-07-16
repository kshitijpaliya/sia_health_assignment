const fs = require("fs");
const path = require("path");

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "was",
  "with",
]);

function readText(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

function dataPath(fileName) {
  return path.join(process.env.DATA_DIR || "data", fileName);
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((term) => term.length > 2 && !STOPWORDS.has(term)) || [];
}

function addChunk(chunks, chunk) {
  if (chunk.text && chunk.text.trim()) {
    chunks.push({
      ...chunk,
      text: chunk.text.trim(),
      tokens: tokenize(chunk.text),
    });
  }
}

function buildCorpus() {
  const rulesRaw = readText(dataPath("sia_assignment_rules.md"));
  const historicalPlanRaw = readText(dataPath("previous_plan_sample.md"));
  const logsRaw = readJson(dataPath("progress_logs.json"));
  const chunks = [];

  rulesRaw.split(/\r?\n/).forEach((line) => {
    const match = line.match(/\*\*(RULE\.[A-Z][0-9]+)\*\*\s*(.*)/);
    if (match) {
      addChunk(chunks, {
        id: match[1],
        text: match[2],
        source_file: "sia_assignment_rules.md",
        kind: "rule",
      });
    }
  });

  const feedbackSection = historicalPlanRaw.split(
    "## Later feedback linked to this plan",
  )[1];
  if (feedbackSection) {
    feedbackSection.split(/\r?\n-\s*/).forEach((line, index) => {
      addChunk(chunks, {
        id: `PLAN.FEEDBACK.${index + 1}`,
        text: line.replace(/^-\s*/, ""),
        source_file: "previous_plan_sample.md",
        kind: "historical_feedback",
      });
    });
  }

  logsRaw.logs.forEach((log) => {
    [
      ["reported_progress", "Reported progress"],
      ["what_worked", "What worked"],
      ["what_did_not_work", "What did not work"],
      ["available_dinner_options", "Available dinner options"],
      ["unknowns", "Unknowns"],
    ].forEach(([field, label]) => {
      if (log[field]) {
        addChunk(chunks, {
          id: `${log.source_id}.${field}`,
          text: `${label}: ${log[field].join(", ")}`,
          source_file: "progress_logs.json",
          kind: "progress_log",
          date: log.date,
        });
      }
    });
  });

  return chunks;
}

function buildQuery(snapshot, dynamicConstraint = "") {
  return tokenize(
    [
      snapshot.current_state_summary,
      snapshot.unresolved_conflicts,
      snapshot.unknowns,
      snapshot.confirmed_facts.preferences_and_constraints,
      snapshot.hardConstraints,
      dynamicConstraint,
    ]
      .flat()
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .join(" "),
  );
}

function calculateDocumentFrequencies(corpus) {
  const frequencies = new Map();
  corpus.forEach((chunk) => {
    new Set(chunk.tokens).forEach((token) => {
      frequencies.set(token, (frequencies.get(token) || 0) + 1);
    });
  });
  return frequencies;
}

function bm25Score({ chunk, queryTerms, documentFrequencies, documentCount, averageLength }) {
  const k1 = 1.2;
  const b = 0.75;
  const termCounts = new Map();
  chunk.tokens.forEach((token) => {
    termCounts.set(token, (termCounts.get(token) || 0) + 1);
  });

  return [...new Set(queryTerms)].reduce((score, term) => {
    const frequency = termCounts.get(term) || 0;
    if (!frequency) return score;

    const containingDocs = documentFrequencies.get(term) || 0;
    const idf = Math.log(1 + (documentCount - containingDocs + 0.5) / (containingDocs + 0.5));
    const denominator =
      frequency + k1 * (1 - b + b * (chunk.tokens.length / averageLength));

    return score + idf * ((frequency * (k1 + 1)) / denominator);
  }, 0);
}

function recencyBoost(chunk, snapshotDate) {
  if (!chunk.date) return 0;

  const ageDays = Math.max(
    0,
    (new Date(snapshotDate) - new Date(chunk.date)) / 86400000,
  );

  return 1 / (1 + ageDays / 45);
}

function retrieveContext(snapshot, dynamicConstraint = "") {
  const corpus = buildCorpus();
  const queryTerms = buildQuery(snapshot, dynamicConstraint);
  const documentFrequencies = calculateDocumentFrequencies(corpus);
  const averageLength =
    corpus.reduce((sum, chunk) => sum + chunk.tokens.length, 0) / corpus.length || 1;

  return corpus
    .map((chunk) => {
      const matchedTerms = [...new Set(chunk.tokens)].filter((term) =>
        queryTerms.includes(term),
      );
      const lexicalScore = bm25Score({
        chunk,
        queryTerms,
        documentFrequencies,
        documentCount: corpus.length,
        averageLength,
      });
      const score = lexicalScore + recencyBoost(chunk, snapshot.as_of_date);

      return {
        ...chunk,
        matchedTerms,
        score,
      };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((chunk) => ({
      source_id: chunk.id,
      source_file: chunk.source_file,
      text: chunk.text,
      score: Number(chunk.score.toFixed(2)),
      reason_selected: `BM25 lexical match on [${chunk.matchedTerms
        .slice(0, 8)
        .join(", ")}]${chunk.date ? `; dated ${chunk.date}` : ""}`,
    }));
}

module.exports = { retrieveContext };
