const STACK_CANDIDATES = [
  {
    id: "react-next-typescript",
    name: "React + Next.js + TypeScript",
    category: "frontend",
    tags: ["web", "ui", "dashboard", "accessibility", "fast-iteration"],
    pros: [
      "Strong component ecosystem for dashboard-style interfaces.",
      "Good accessibility tooling for WCAG-focused UI.",
      "Type safety helps maintain state-heavy training flows.",
    ],
  },
  {
    id: "node-express-typescript",
    name: "Node.js + Express + TypeScript",
    category: "backend",
    tags: ["api", "rapid-prototype", "simple-architecture", "integration"],
    pros: [
      "Simple API layer and low setup overhead.",
      "Works well for integrating ASR/LLM services.",
      "Easy to evolve into modular services later.",
    ],
  },
  {
    id: "python-fastapi",
    name: "Python + FastAPI",
    category: "backend",
    tags: ["ml", "asr", "llm", "inference", "ai-heavy"],
    pros: [
      "Great fit for AI model orchestration and experimentation.",
      "Fast API development with typed request/response models.",
      "Rich speech and NLP ecosystem in Python.",
    ],
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    category: "database",
    tags: ["relational", "analytics", "structured-data", "reliability"],
    pros: [
      "Reliable for structured patient/training progress data.",
      "Supports analytics queries for progress tracking.",
      "Mature ecosystem and strong consistency guarantees.",
    ],
  },
  {
    id: "redis",
    name: "Redis",
    category: "cache",
    tags: ["low-latency", "session", "queue", "realtime"],
    pros: [
      "Useful for low-latency session/cache requirements.",
      "Can buffer short-lived training state and counters.",
      "Helps reduce response time under burst traffic.",
    ],
  },
  {
    id: "docker",
    name: "Docker",
    category: "devops",
    tags: ["deployment", "consistency", "environment", "scaling"],
    pros: [
      "Reproducible local and deployment environments.",
      "Simplifies collaboration across frontend/backend teams.",
      "Portable base for cloud deployment.",
    ],
  },
];

const KEYWORD_RULES = [
  { regex: /(ai|llm|asr|speech|nlp|model)/i, boosts: ["python-fastapi", "node-express-typescript"] },
  { regex: /(web|dashboard|ui|frontend|react|accessibility)/i, boosts: ["react-next-typescript"] },
  { regex: /(realtime|low[\s-]?latency|fast|200ms|audio)/i, boosts: ["redis", "node-express-typescript"] },
  { regex: /(health|medical|rehab|patient|caregiver|tracking|progress)/i, boosts: ["postgresql"] },
  { regex: /(deploy|production|cloud|container|devops)/i, boosts: ["docker"] },
  { regex: /(prototype|mvp|quick|simple)/i, boosts: ["node-express-typescript", "react-next-typescript"] },
];

function buildBaseScores() {
  return STACK_CANDIDATES.reduce((acc, item) => {
    acc[item.id] = 1;
    return acc;
  }, {});
}

function scoreByGoal(goalText) {
  const scores = buildBaseScores();
  const matchedRules = [];

  for (const rule of KEYWORD_RULES) {
    if (rule.regex.test(goalText)) {
      matchedRules.push(rule.regex.toString());
      for (const id of rule.boosts) {
        scores[id] += 2;
      }
    }
  }

  return { scores, matchedRules };
}

function rankStacks(scores) {
  return [...STACK_CANDIDATES]
    .map((item) => ({ ...item, score: scores[item.id] || 0 }))
    .sort((a, b) => b.score - a.score);
}

function buildRecommendation(goal, ranked, matchedRules) {
  const picks = ranked.slice(0, 5);

  const grouped = {
    frontend: picks.find((p) => p.category === "frontend") || null,
    backend: picks.find((p) => p.category === "backend") || null,
    database: picks.find((p) => p.category === "database") || null,
    cache: picks.find((p) => p.category === "cache") || null,
    devops: picks.find((p) => p.category === "devops") || null,
  };

  return {
    goal,
    recommendedStack: {
      frontend: grouped.frontend?.name || "React + Next.js + TypeScript",
      backend: grouped.backend?.name || "Node.js + Express + TypeScript",
      database: grouped.database?.name || "PostgreSQL",
      cache: grouped.cache?.name || "Redis",
      devops: grouped.devops?.name || "Docker",
    },
    reasons: picks.map((p) => ({
      technology: p.name,
      score: p.score,
      why: p.pros[0],
    })),
    notes: [
      "For this project's rehab + dialogue training workflow, prioritize low-latency audio handling and a state-machine-driven frontend.",
      "Keep caregiver override and patient-friendly interaction logic in clear API contracts.",
    ],
    aiSignals: {
      matchedRuleCount: matchedRules.length,
      matchedRules,
    },
  };
}

function recommendStack(goal) {
  const { scores, matchedRules } = scoreByGoal(goal);
  const ranked = rankStacks(scores);
  return buildRecommendation(goal, ranked, matchedRules);
}

module.exports = {
  recommendStack,
};
