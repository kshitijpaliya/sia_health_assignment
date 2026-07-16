# Sia Health AI-Assisted Plan Update Prototype

This is a CLI prototype for the synthetic Sia Health AI / Tech Intern assignment. It demonstrates an inspectable workflow:

`snapshot -> retrieve -> draft -> validate -> revise`

The output is internal decision support for a nutritionist. It is not clinical advice, does not diagnose, and marks all plans as requiring nutritionist approval.

## Setup

Install dependencies:

```bash
npm install
```

Create a local `.env` from the example file:

```bash
cp .env.example .env
```

Then set your Gemini key in `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.1-flash-lite
```

## Run

Run the full Gemini-backed workflow:

```bash
node index.js
```

Run deterministic fallback mode without calling Gemini:

```bash
node index.js --offline
```

Run against the second synthetic sample pack:

```powershell
$env:DATA_DIR="data/sample_case_2"
node index.js
```

The CLI runs twice:

1. Baseline assessment
2. Mandatory change test: "The client no longer wants to use protein powder."

## Architecture

- `src/snapshot.js` parses the structured profile and dated logs, prefers the latest dated record, keeps hard constraints outside retrieval, and surfaces unresolved conflicts and unknowns.
- `src/retrieval.js` performs programmatic BM25-style lexical retrieval over rules, dated progress logs, and historical plan feedback. The query is built from the current snapshot, unresolved conflicts, unknowns, hard constraints, and any runtime change. Dated logs receive a small generic recency boost.
- `src/pipeline.js` generates the draft with Gemini when available, otherwise uses a deterministic fallback so the prototype still runs. It validates, revises, and returns initial and final artifacts.
- `src/validator.js` implements all seven hard checks from the assignment rules plus separate quality and safety/uncertainty reviews.

## Retrieval Approach

The retriever chunks progress logs, older plan feedback, and rules into small source-linked passages. It tokenizes each chunk, removes common stopwords, and ranks chunks using a BM25-style lexical score plus a small recency boost for dated logs.

BM25 was chosen because the corpus is tiny and inspectability matters: every selected passage prints a source ID, score, and reason. For a larger production corpus, a hybrid lexical + embedding retriever would be more appropriate.

## Sample Output

See [SAMPLE_OUTPUT.md](SAMPLE_OUTPUT.md) for a representative successful CLI run. Model output may vary slightly between runs, but both workflows should end with:

```text
Final review findings:
- No findings.
```

For submission screenshots or a short demo video, run `node index.js` and capture the terminal output showing the snapshot, retrieval, validation/revision, and final JSON sections.

## Assumptions and Limitations

- The data is fully synthetic and must not be used for care.
- The assignment rules are simplified assessment rules, not full clinical guidance.
- The fallback draft is deterministic so reviewers can run the workflow without an API key.
- The safety checks are conservative string checks and review functions, not a substitute for human clinical review.
- A second synthetic test pack is available under `data/sample_case_2/` to check that the workflow is not only tailored to the original case.

## Time Spent

Approximately 4 hours.

## AI Coding Tools

Gemini was used to reason through the problem statement, compare implementation options and finalize one.

Codex was used to implement the CLI workflow, improve the approach by including BM25, implement a proper validation coverage, add a second synthetic test pack, and prepare submission documentation.
