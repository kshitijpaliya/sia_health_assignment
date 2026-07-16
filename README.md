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

## Assumptions

- All input data is synthetic assignment data. The system treats it as a simulated client record, not as a real medical record.
- The latest dated profile/log entry is treated as the current source of truth when older and newer information conflict.
- Hard constraints such as vegetarian preference, hostel feasibility, food access, and runtime updates are applied before and after retrieval.
- Unknowns are preserved instead of guessed. Examples include supplement status, thyroid lab values, allergy history, and clinical follow-up.
- The generated plan is intended as draft decision support for a nutritionist, not as direct advice to the client.
- The workflow assumes the available source files are small enough for transparent lexical retrieval and source-by-source inspection.
- The mandatory change test assumes the runtime update, "The client no longer wants to use protein powder," should override any older plan or recommendation mentioning protein powder.
- A second synthetic test pack is available under `data/sample_case_2/` to check that the workflow is not only tailored to the original case.

## Limitations

- This is a prototype CLI, not a production clinical system. It does not provide diagnosis, treatment, dosage guidance, or medical clearance.
- The nutrition logic is rule-based and assignment-specific. It does not calculate calories, macros, micronutrients, glycemic load, drug-nutrient interactions, or medical risk.
- Validation uses deterministic checks and structured review rules. These checks catch known constraint violations, but they are not a substitute for a qualified nutritionist or clinician.
- BM25-style lexical retrieval is inspectable and appropriate for this small corpus, but it can miss relevant context when wording differs significantly. A larger system would likely use hybrid retrieval with embeddings plus lexical search.
- Gemini output can vary between runs. The validator and revision step reduce obvious issues, but generated wording and meal choices may differ.
- The offline fallback is deterministic and useful for testing without an API key, but it is intentionally simpler than model-generated drafting.
- The system does not persist user sessions, maintain a database, authenticate users, or handle private health information.
- The sample output is representative, not a fixed golden file. Scores and final wording may change if the data, prompts, model, or retrieval parameters are changed.

## Time Spent

Approximately 4 hours.

## AI Coding Tools

Gemini was used to reason through the problem statement, compare implementation options and finalize one.

Codex was used to implement the CLI workflow, improve the approach by including BM25, implement a proper validation coverage, add a second synthetic test pack, and prepare submission documentation.
