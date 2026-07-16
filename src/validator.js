function runDeterministicChecks(draftText) {
  const serialized =
    typeof draftText === "string"
      ? draftText.toLowerCase()
      : JSON.stringify(draftText).toLowerCase();
  const findings = [];

  const checks = [
    {
      rule: "RULE.H1",
      terms: ["chicken", "fish", "meat", "egg", "mutton", "pork", "beef", "seafood"],
      detail: "Detected non-vegetarian element",
    },
    {
      rule: "RULE.H2",
      terms: [
        "weight loss",
        "calorie deficit",
        "restrict calories",
        "skip meal",
        "meal skipping",
        "fasting",
        "lose weight",
      ],
      detail: "Detected prohibited weight-loss or restriction language",
    },
    {
      rule: "RULE.H3",
      terms: [
        "start vitamin",
        "take vitamin",
        "dose",
        "dosage",
        "prescribe",
        "tablet",
        "capsule",
        "supplement course",
      ],
      detail: "Detected supplement or medication prescribing language",
    },
    {
      rule: "RULE.H4",
      terms: [
        "caused the menstrual cycle",
        "made the cycle return",
        "restored her cycle",
        "cycle returned because",
        "plan caused",
      ],
      detail: "Detected unsupported causality claim about menstrual cycle",
    },
    {
      rule: "RULE.H5",
      terms: [
        "testosterone is high",
        "b12 is low",
        "vitamin d is low",
        "tsh is normal",
        "tsh is high",
        "lab confirms",
      ],
      detail: "Detected confident lab interpretation without units/ranges",
    },
    {
      rule: "RULE.H6",
      terms: [
        "salad",
        "prepared salad",
        "daily salad",
        "elaborate cooking",
        "complex cooking",
        "cook daily from scratch",
      ],
      detail: "Detected unrealistic daily cooking or salad requirement",
    },
    {
      rule: "RULE.H7",
      terms: ["cured", "resolved pcos", "deficiency fixed", "thyroid cured"],
      detail: "Detected cure/resolution claim",
    },
  ];

  checks.forEach((check) => {
    const found = check.terms.filter((term) => {
      if (check.rule === "RULE.H1") {
        return new RegExp(`\\b${escapeRegExp(term)}s?\\b`).test(serialized);
      }

      if (check.rule === "RULE.H2" && term === "weight loss") {
        return (
          serialized.includes(term) &&
          !serialized.includes("weight loss is not a goal") &&
          !serialized.includes("weight loss is not recommended")
        );
      }

      if (
        check.rule === "RULE.H6" &&
        isNegatedContext(serialized, term, ["without", "avoid", "avoids", "not"])
      ) {
        return false;
      }

      return serialized.includes(term);
    });
    if (found.length) {
      findings.push({
        rule: check.rule,
        status: "FAIL",
        detail: `${check.detail}: ${found.join(", ")}`,
      });
    }
  });

  return {
    isValid: findings.length === 0,
    findings,
  };
}

function escapeRegExp(term) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isNegatedContext(text, term, negators) {
  const index = text.indexOf(term);
  if (index === -1) return false;

  const prefix = text.slice(Math.max(0, index - 40), index);
  return negators.some((negator) => prefix.includes(negator));
}

function runQualityReview(draft, snapshot, retrievedContext) {
  const serialized = JSON.stringify(draft).toLowerCase();
  const findings = [];
  const breakfasts = [draft.day_1, draft.day_2, draft.day_3]
    .map((day) => day && day.breakfast && day.breakfast.toLowerCase().trim())
    .filter(Boolean);

  if (new Set(breakfasts).size < breakfasts.length) {
    findings.push({
      rule: "RULE.P4",
      status: "WARN",
      detail: "Breakfasts are not sufficiently varied across all three days.",
    });
  }

  if (!serialized.includes("canteen") && !serialized.includes("meal service")) {
    findings.push({
      rule: "RULE.P7",
      status: "WARN",
      detail: "Plan does not clearly prefer canteen or meal-service options.",
    });
  }

  if (!draft.source_citations || draft.source_citations.length < 3) {
    findings.push({
      rule: "RULE.P5",
      status: "WARN",
      detail: "Major recommendations need clearer source IDs.",
    });
  }

  if (!draft.confirmed_facts || !draft.assumptions || !draft.missing_information) {
    findings.push({
      rule: "RULE.P6",
      status: "WARN",
      detail: "Draft must separate confirmed facts, assumptions and missing information.",
    });
  }

  if (!retrievedContext.some((item) => item.source_id.includes(snapshot.as_of_date))) {
    findings.push({
      rule: "RULE.P1",
      status: "WARN",
      detail: "Retrieved context did not include the latest dated log.",
    });
  }

  if (snapshot.hardConstraints.runtime_update?.toLowerCase().includes("protein powder")) {
    const recommendationText = JSON.stringify({
      day_1: draft.day_1,
      day_2: draft.day_2,
      day_3: draft.day_3,
    }).toLowerCase();
    if (
      recommendationText.includes("protein powder") ||
      recommendationText.includes("protein drink") ||
      recommendationText.includes("protein smoothie")
    ) {
      findings.push({
        rule: "MANDATORY_CHANGE",
        status: "FAIL",
        detail: "Runtime update says the client no longer wants protein powder.",
      });
    }
  }

  return findings;
}

function runSafetyUncertaintyReview(draft, snapshot) {
  const findings = [];
  const serialized = JSON.stringify(draft).toLowerCase();

  ["supplement", "cycle", "thyroid", "laboratory", "allergies"].forEach((topic) => {
    const hasUnknown = snapshot.unknowns.some((unknown) =>
      unknown.toLowerCase().includes(topic === "laboratory" ? "laborator" : topic),
    );
    if (hasUnknown && !serialized.includes(topic)) {
      findings.push({
        rule: "REVIEW.UNKNOWN",
        status: "WARN",
        detail: `Human-review output should surface unresolved ${topic} context.`,
      });
    }
  });

  return findings;
}

module.exports = {
  runDeterministicChecks,
  runQualityReview,
  runSafetyUncertaintyReview,
};
