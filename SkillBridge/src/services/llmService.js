const { GoogleGenAI } = require("@google/genai");

const client = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;
const MODEL_CACHE = new Map();
const DEFAULT_MODEL_TIMEOUT_MS = 8000;

function stableSerialize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
  }

  return JSON.stringify(value);
}

function readCachedValue(cacheKey) {
  if (!cacheKey) {
    return null;
  }

  const cached = MODEL_CACHE.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    MODEL_CACHE.delete(cacheKey);
    return null;
  }

  return cached.value;
}

function writeCachedValue(cacheKey, value, ttlMs) {
  if (!cacheKey || !ttlMs) {
    return value;
  }

  MODEL_CACHE.set(cacheKey, {
    value,
    expiresAt: Date.now() + ttlMs
  });

  return value;
}

function normalizeSkills(skills) {
  if (!Array.isArray(skills)) {
    return [];
  }

  return skills
    .map((skill) => {
      if (typeof skill === "string") {
        return skill.trim();
      }

      if (skill == null) {
        return "";
      }

      return String(skill).trim();
    })
    .filter(Boolean);
}

async function requestJsonFromModel(prompt, fallbackData, options = {}) {
  const { cacheKey, ttlMs = 0, timeoutMs = DEFAULT_MODEL_TIMEOUT_MS, forceRefresh = false } = options;
  if (!forceRefresh) {
    const cached = readCachedValue(cacheKey);
    if (cached) {
      return cached;
    }
  }

  if (!client) {
    return fallbackData;
  }

  try {
    const response = await Promise.race([
      client.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Model request timed out")), timeoutMs))
    ]);

    return writeCachedValue(cacheKey, JSON.parse(response.text), ttlMs);
  } catch (_error) {
    return fallbackData;
  }
}

function normalizeKnowledgeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    title: String(item.title || "").trim(),
    provider: String(item.provider || "").trim(),
    sourceUrl: String(item.sourceUrl || item.url || "").trim(),
    roleTarget: String(item.roleTarget || "").trim(),
    summary: String(item.summary || "").trim(),
    skills: normalizeSkills(item.skills || []),
    tags: normalizeSkills(item.tags || [])
  })).filter((item) => item.title && item.sourceUrl);
}

const RESOURCE_LIBRARY = {
  frontend: [
    {
      title: "MDN Learn Web Development",
      provider: "MDN",
      type: "Documentation",
      url: "https://developer.mozilla.org/en-US/docs/Learn_web_development"
    },
    {
      title: "React Quick Start",
      provider: "React",
      type: "Documentation",
      url: "https://react.dev/learn"
    },
    {
      title: "Frontend full-course videos on YouTube",
      provider: "YouTube",
      type: "Video",
      url: "https://www.youtube.com/results?search_query=frontend+developer+full+course+freecodecamp"
    },
    {
      title: "React tutorial videos on YouTube",
      provider: "YouTube",
      type: "Video",
      url: "https://www.youtube.com/results?search_query=react+tutorial+freecodecamp"
    }
  ],
  backend: [
    {
      title: "Node.js Learn",
      provider: "Node.js",
      type: "Documentation",
      url: "https://nodejs.org/en/learn"
    },
    {
      title: "Installing Express",
      provider: "Express",
      type: "Documentation",
      url: "https://expressjs.com/en/starter/installing.html"
    },
    {
      title: "Backend development videos on YouTube",
      provider: "YouTube",
      type: "Video",
      url: "https://www.youtube.com/results?search_query=nodejs+express+backend+course"
    },
    {
      title: "REST API tutorials on YouTube",
      provider: "YouTube",
      type: "Video",
      url: "https://www.youtube.com/results?search_query=rest+api+nodejs+express+tutorial"
    }
  ],
  data: [
    {
      title: "The Python Tutorial",
      provider: "Python",
      type: "Documentation",
      url: "https://docs.python.org/3/tutorial/"
    },
    {
      title: "Pandas Getting Started Tutorials",
      provider: "pandas",
      type: "Documentation",
      url: "https://pandas.pydata.org/docs/getting_started/intro_tutorials/"
    },
    {
      title: "Data analysis videos on YouTube",
      provider: "YouTube",
      type: "Video",
      url: "https://www.youtube.com/results?search_query=data+analysis+python+pandas+course"
    },
    {
      title: "Power BI learning videos on YouTube",
      provider: "YouTube",
      type: "Video",
      url: "https://www.youtube.com/results?search_query=power+bi+full+course"
    }
  ],
  ml: [
    {
      title: "NumPy Quickstart",
      provider: "NumPy",
      type: "Documentation",
      url: "https://numpy.org/doc/1.26/user/quickstart.html"
    },
    {
      title: "Scikit-learn Getting Started",
      provider: "scikit-learn",
      type: "Documentation",
      url: "https://scikit-learn.org/stable/getting_started.html"
    },
    {
      title: "Machine learning videos on YouTube",
      provider: "YouTube",
      type: "Video",
      url: "https://www.youtube.com/results?search_query=machine+learning+course+python"
    },
    {
      title: "Scikit-learn tutorial videos on YouTube",
      provider: "YouTube",
      type: "Video",
      url: "https://www.youtube.com/results?search_query=scikit-learn+tutorial+python"
    }
  ],
  cloud: [
    {
      title: "AWS Documentation",
      provider: "AWS",
      type: "Documentation",
      url: "https://docs.aws.amazon.com/"
    },
    {
      title: "Azure Fundamentals documentation",
      provider: "Microsoft Learn",
      type: "Documentation",
      url: "https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/"
    },
    {
      title: "Cloud engineering videos on YouTube",
      provider: "YouTube",
      type: "Video",
      url: "https://www.youtube.com/results?search_query=cloud+engineering+full+course"
    },
    {
      title: "Docker and Kubernetes videos on YouTube",
      provider: "YouTube",
      type: "Video",
      url: "https://www.youtube.com/results?search_query=docker+kubernetes+tutorial"
    }
  ],
  security: [
    {
      title: "OWASP Top 10",
      provider: "OWASP",
      type: "Documentation",
      url: "https://owasp.org/www-project-top-ten/"
    },
    {
      title: "PortSwigger Web Security Academy",
      provider: "PortSwigger",
      type: "Documentation",
      url: "https://portswigger.net/web-security"
    },
    {
      title: "Cybersecurity videos on YouTube",
      provider: "YouTube",
      type: "Video",
      url: "https://www.youtube.com/results?search_query=cybersecurity+full+course"
    },
    {
      title: "OWASP Top 10 explanation videos on YouTube",
      provider: "YouTube",
      type: "Video",
      url: "https://www.youtube.com/results?search_query=owasp+top+10+tutorial"
    }
  ],
  design: [
    {
      title: "Figma help center",
      provider: "Figma",
      type: "Documentation",
      url: "https://help.figma.com/hc/en-us"
    },
    {
      title: "Material Design",
      provider: "Google",
      type: "Documentation",
      url: "https://m3.material.io/"
    },
    {
      title: "UI/UX design videos on YouTube",
      provider: "YouTube",
      type: "Video",
      url: "https://www.youtube.com/results?search_query=ui+ux+design+course"
    },
    {
      title: "Figma tutorial videos on YouTube",
      provider: "YouTube",
      type: "Video",
      url: "https://www.youtube.com/results?search_query=figma+tutorial+for+beginners"
    }
  ],
  product: [
    {
      title: "Atlassian Product Management guide",
      provider: "Atlassian",
      type: "Documentation",
      url: "https://www.atlassian.com/agile/product-management"
    },
    {
      title: "Google UX design resources",
      provider: "Google",
      type: "Documentation",
      url: "https://design.google/library"
    },
    {
      title: "Product management videos on YouTube",
      provider: "YouTube",
      type: "Video",
      url: "https://www.youtube.com/results?search_query=product+management+course"
    },
    {
      title: "Agile and product strategy videos on YouTube",
      provider: "YouTube",
      type: "Video",
      url: "https://www.youtube.com/results?search_query=agile+product+management+tutorial"
    }
  ]
};

function getResourceBucket(goal, skills) {
  const normalizedSkills = normalizeSkills(skills);
  const goalText = `${goal} ${normalizedSkills.join(" ")}`.toLowerCase();

  if (goalText.includes("frontend") || goalText.includes("react") || goalText.includes("html") || goalText.includes("css")) {
    return RESOURCE_LIBRARY.frontend;
  }
  if (goalText.includes("backend") || goalText.includes("full stack") || goalText.includes("node") || goalText.includes("express")) {
    return RESOURCE_LIBRARY.backend;
  }
  if (goalText.includes("data analyst") || goalText.includes("power bi") || goalText.includes("tableau")) {
    return RESOURCE_LIBRARY.data;
  }
  if (goalText.includes("machine learning") || goalText.includes("data scientist") || goalText.includes("python") || goalText.includes("scikit")) {
    return RESOURCE_LIBRARY.ml;
  }
  if (goalText.includes("cloud") || goalText.includes("aws") || goalText.includes("azure") || goalText.includes("docker")) {
    return RESOURCE_LIBRARY.cloud;
  }
  if (goalText.includes("cyber") || goalText.includes("security")) {
    return RESOURCE_LIBRARY.security;
  }
  if (goalText.includes("ui/ux") || goalText.includes("design") || goalText.includes("figma")) {
    return RESOURCE_LIBRARY.design;
  }
  if (goalText.includes("product")) {
    return RESOURCE_LIBRARY.product;
  }

  return RESOURCE_LIBRARY.frontend;
}

function buildFallbackPersonalizedResources({ phases, resources, goal, skills, skillLevel, score }) {
  return phases.map((phase, index) => {
    const start = (index * 2) % resources.length;
    const picks = [resources[start], resources[(start + 1) % resources.length]].filter(Boolean);

    return {
      phaseIndex: index,
      resources: picks.map((resource) => ({
        ...resource,
        why:
          score < 60
            ? `Chosen to strengthen your ${goal} fundamentals before moving into harder projects.`
            : `Chosen to deepen your ${goal} skills and build on ${skills.slice(0, 3).join(", ") || "your current profile"}.`,
        focus: skillLevel === "Beginner" ? "Foundations first" : "Targeted depth"
      }))
    };
  });
}

async function personalizeStudyMaterials({ phases, goal, skills, skillLevel, score }) {
  const resources = getResourceBucket(goal, skills);
  const fallback = buildFallbackPersonalizedResources({
    phases,
    resources,
    goal,
    skills,
    skillLevel,
    score
  });

  if (!client) {
    return fallback;
  }

  const prompt = `
You are selecting personalized study materials for a learner.
Return JSON with a "phaseResources" array.
Each item must contain:
- "phaseIndex" as an integer
- "resources" as an array of exactly 2 objects
Each resource object must contain:
- "title"
- "provider"
- "type"
- "url"
- "why"
- "focus"

Only choose resources from this catalog and preserve the URLs exactly:
${JSON.stringify(resources, null, 2)}

Learner goal: ${goal}
Learner resume skills: ${skills.join(", ")}
Assessment level: ${skillLevel}
Assessment score: ${score}
Roadmap phases:
${JSON.stringify(phases, null, 2)}

Personalize the choices based on the learner's likely gaps, current level, and each phase objective.
The "why" text should be specific to the learner.
The "focus" should be a short phrase like "React foundations" or "API practice".
`;

  const result = await requestJsonFromModel(prompt, { phaseResources: fallback });
  return result.phaseResources || fallback;
}

async function attachStudyMaterials(roadmap, goal, skills, skillLevel, score, knowledgeContext) {
  const phases = roadmap.phases || [];
  const learningResources = normalizeKnowledgeItems(knowledgeContext.learningResources);
  const sourceCatalog = learningResources.length ? learningResources.map((resource) => ({
    title: resource.title,
    provider: resource.provider,
    type: "Learning Resource",
    url: resource.sourceUrl,
    summary: resource.summary,
    skills: resource.skills,
    tags: resource.tags
  })) : null;

  const personalized = sourceCatalog && sourceCatalog.length
    ? await personalizeRetrievedResources({
      phases,
      goal,
      skills,
      skillLevel,
      score,
      resources: sourceCatalog
    })
    : await personalizeStudyMaterials({
      phases,
      goal,
      skills,
      skillLevel,
      score
    });

  const personalizedMap = new Map(personalized.map((entry) => [entry.phaseIndex, entry.resources]));
  const mergedPhases = phases.map((phase, index) => ({
    ...phase,
    resources: personalizedMap.get(index) || []
  }));

  return {
    ...roadmap,
    phases: mergedPhases
  };
}

function buildFallbackRetrievedResources({ phases, resources, goal, skills, skillLevel }) {
  return phases.map((phase, index) => {
    const start = (index * 2) % resources.length;
    const picks = [resources[start], resources[(start + 1) % resources.length]].filter(Boolean);

    return {
      phaseIndex: index,
      resources: picks.map((resource) => ({
        title: resource.title,
        provider: resource.provider,
        type: resource.type,
        url: resource.url,
        focus: skillLevel === "Beginner" ? "Close foundations gap" : "Build applied depth",
        why: `Chosen for ${goal} because it reinforces ${skills.slice(0, 3).join(", ") || "your current profile"} and fits the phase goal.`,
        summary: resource.summary || ""
      }))
    };
  });
}

async function personalizeRetrievedResources({ phases, goal, skills, skillLevel, score, resources }) {
  const fallback = buildFallbackRetrievedResources({
    phases,
    resources,
    goal,
    skills,
    skillLevel
  });

  if (!client) {
    return fallback;
  }

  const prompt = `
You are selecting personalized learning resources from a retrieved RAG context.
Return JSON with a "phaseResources" array.
Each item must contain:
- "phaseIndex" as an integer
- "resources" as an array of exactly 2 objects
Each resource object must contain:
- "title"
- "provider"
- "type"
- "url"
- "why"
- "focus"
- "summary"

Only choose from this retrieved catalog and preserve URLs exactly:
${JSON.stringify(resources, null, 2)}

Learner goal: ${goal}
Learner resume skills: ${skills.join(", ")}
Assessment level: ${skillLevel}
Assessment score: ${score}
Roadmap phases:
${JSON.stringify(phases, null, 2)}

Personalize based on the learner's likely gaps and each phase outcome.
`;

  const result = await requestJsonFromModel(prompt, { phaseResources: fallback });
  return result.phaseResources || fallback;
}

function buildFallbackTrends(goal, skills) {
  const normalizedSkills = normalizeSkills(skills);
  const skillSet = new Set(normalizedSkills.map((skill) => skill.toLowerCase()));
  const common = [
    {
      name: "AI-assisted productivity",
      reason: "Teams increasingly expect professionals to work with copilots, automation, and prompt-based workflows."
    },
    {
      name: "Cloud-native delivery",
      reason: "Modern products continue to move toward scalable, managed, and deployment-friendly platforms."
    },
    {
      name: "Data storytelling",
      reason: "Decision-making roles increasingly value people who can convert technical outputs into business insight."
    }
  ];

  if (/developer|engineer/i.test(goal)) {
    common.unshift(
      {
        name: skillSet.has("typescript") ? "System design for scale" : "TypeScript ecosystems",
        reason: "Engineering hiring is leaning toward maintainable apps, typed workflows, and architecture fundamentals."
      },
      {
        name: "AI feature integration",
        reason: "Products are adding search, recommendations, assistants, and workflow automation into core experiences."
      }
    );
  }

  if (/data|machine learning/i.test(goal)) {
    common.unshift(
      {
        name: "LLM evaluation",
        reason: "Data roles increasingly need to measure model quality, reliability, and business impact."
      },
      {
        name: "MLOps foundations",
        reason: "Production analytics and ML roles now benefit from deployment, monitoring, and reproducibility skills."
      }
    );
  }

  return common.slice(0, 5);
}

function getGoalExamProfile(goal) {
  const goalText = String(goal || "").toLowerCase();

  if (goalText.includes("frontend")) {
    return [
      {
        question: "In React, when rendering a dynamic list, why is a stable `key` prop important?",
        options: [
          "It helps React track item identity and update the DOM efficiently.",
          "It forces the component to render only once.",
          "It automatically optimizes every API call.",
          "It encrypts props before rendering."
        ],
        correctOption: 0
      },
      {
        question: "Which CSS layout system is usually the best choice for arranging cards across both rows and columns in a dashboard?",
        options: [
          "CSS Grid",
          "Float-based layout",
          "Table tags for page layout",
          "Absolute positioning for every block"
        ],
        correctOption: 0
      },
      {
        question: "Why is debouncing useful for a search box that queries an API as the user types?",
        options: [
          "It reduces unnecessary requests by waiting briefly for typing to pause.",
          "It guarantees every request succeeds.",
          "It caches data permanently in the browser.",
          "It converts the API into a static file."
        ],
        correctOption: 0
      }
    ];
  }

  if (goalText.includes("backend") || goalText.includes("full stack")) {
    return [
      {
        question: "Why should request payloads be validated before business logic runs in an API?",
        options: [
          "To stop invalid or unsafe input from propagating through the application.",
          "To remove the need for a database schema.",
          "To make every endpoint idempotent automatically.",
          "To avoid sending HTTP status codes."
        ],
        correctOption: 0
      },
      {
        question: "Which HTTP status code is the most appropriate after successfully creating a new resource?",
        options: [
          "201 Created",
          "204 No Content",
          "301 Moved Permanently",
          "500 Internal Server Error"
        ],
        correctOption: 0
      },
      {
        question: "Why are password hashes stored instead of plain passwords?",
        options: [
          "Hashes reduce risk if the database is exposed and support safer password checks.",
          "Hashes make HTTPS unnecessary.",
          "Hashes allow admins to recover passwords directly.",
          "Hashes prevent users from resetting passwords."
        ],
        correctOption: 0
      }
    ];
  }

  if (goalText.includes("data analyst")) {
    return [
      {
        question: "In SQL, which clause is used to filter grouped results after aggregation?",
        options: [
          "HAVING",
          "WHERE",
          "ORDER BY",
          "VALUES"
        ],
        correctOption: 0
      },
      {
        question: "Why is correlation not enough to prove causation in an analysis report?",
        options: [
          "Because variables can move together without one directly causing the other.",
          "Because correlation works only in spreadsheets.",
          "Because causation is measured only with bar charts.",
          "Because SQL cannot calculate correlation."
        ],
        correctOption: 0
      },
      {
        question: "Which comparison is usually more meaningful than raw total sales when evaluating regions of different sizes?",
        options: [
          "A normalized metric such as growth rate or sales per customer",
          "The region with the shortest name",
          "The dashboard with the most colors",
          "The number of queries written"
        ],
        correctOption: 0
      }
    ];
  }

  if (goalText.includes("data scientist") || goalText.includes("machine learning")) {
    return [
      {
        question: "Why do we evaluate a model on validation or test data instead of only on training data?",
        options: [
          "To estimate how well the model generalizes to unseen data.",
          "To automatically balance the dataset.",
          "To eliminate the need for feature engineering.",
          "To force the model to be unbiased."
        ],
        correctOption: 0
      },
      {
        question: "What problem is regularization mainly used to reduce?",
        options: [
          "Overfitting",
          "Data loading",
          "Column naming differences",
          "Network latency"
        ],
        correctOption: 0
      },
      {
        question: "Why can accuracy be misleading on an imbalanced classification dataset?",
        options: [
          "A model can score high accuracy while still performing poorly on the minority class.",
          "Accuracy is only valid for regression.",
          "Accuracy always decreases after data cleaning.",
          "Accuracy depends only on training speed."
        ],
        correctOption: 0
      }
    ];
  }

  if (goalText.includes("cloud")) {
    return [
      {
        question: "What is the main benefit of infrastructure as code in cloud engineering?",
        options: [
          "It makes infrastructure reproducible, reviewable, and version controlled.",
          "It removes the need for IAM permissions.",
          "It guarantees no deployment failures.",
          "It replaces monitoring tools."
        ],
        correctOption: 0
      },
      {
        question: "Why are containers useful in deployment workflows?",
        options: [
          "They package the application and dependencies consistently across environments.",
          "They remove the need for any CI/CD system.",
          "They replace every managed cloud service.",
          "They permanently store all runtime logs."
        ],
        correctOption: 0
      },
      {
        question: "Which security principle most improves cloud access control?",
        options: [
          "Least privilege",
          "Shared admin credentials",
          "Open inbound ports by default",
          "Disabling audit trails"
        ],
        correctOption: 0
      }
    ];
  }

  if (goalText.includes("security")) {
    return [
      {
        question: "Why is input sanitization important in secure application design?",
        options: [
          "It helps reduce attack vectors such as injection vulnerabilities.",
          "It increases browser refresh speed.",
          "It removes the need for authentication.",
          "It eliminates all logging requirements."
        ],
        correctOption: 0
      },
      {
        question: "What is the purpose of multi-factor authentication?",
        options: [
          "To require more than one type of verification before granting access.",
          "To encrypt all application source code.",
          "To replace authorization logic completely.",
          "To store passwords in plaintext temporarily."
        ],
        correctOption: 0
      },
      {
        question: "Which action best supports investigation after a suspicious login attempt?",
        options: [
          "Reviewing centralized logs with timestamps, IPs, and account context",
          "Deleting the affected user record",
          "Turning off monitoring temporarily",
          "Changing the frontend theme"
        ],
        correctOption: 0
      }
    ];
  }

  if (goalText.includes("ui/ux") || goalText.includes("design")) {
    return [
      {
        question: "Why is visual hierarchy important in a product interface?",
        options: [
          "It guides users toward the most important information and actions.",
          "It removes the need for usability testing.",
          "It guarantees accessibility compliance automatically.",
          "It makes every layout symmetrical."
        ],
        correctOption: 0
      },
      {
        question: "What is the main value of a reusable component system in design work?",
        options: [
          "It improves consistency and speeds up iteration across screens.",
          "It eliminates the need for research.",
          "It replaces product requirements.",
          "It prevents design updates later."
        ],
        correctOption: 0
      },
      {
        question: "Which practice most directly supports accessible color usage?",
        options: [
          "Checking contrast between foreground and background elements",
          "Using more gradients",
          "Avoiding text labels when icons exist",
          "Choosing colors only by personal taste"
        ],
        correctOption: 0
      }
    ];
  }

  return [
    {
      question: "Which answer best demonstrates practical ownership of a technical skill?",
      options: [
        "Explaining how it was used in a real task, project, or measurable outcome",
        "Repeating the keyword without context",
        "Listing it multiple times in the resume",
        "Avoiding implementation details entirely"
      ],
      correctOption: 0
    },
    {
      question: "Why is breaking a technical learning goal into milestones useful?",
      options: [
        "It makes progress measurable and helps target specific gaps.",
        "It removes the need for practice.",
        "It guarantees success in every interview.",
        "It replaces feedback from peers and users."
      ],
      correctOption: 0
    }
  ];
}

const SKILL_EXAM_BANK = {
  javascript: {
    question: "What is the main difference between `==` and `===` in JavaScript?",
    options: [
      "`===` checks both value and type, while `==` can coerce types.",
      "`==` is always safer for APIs.",
      "`===` works only for strings.",
      "`==` is used only for objects."
    ],
    correctOption: 0
  },
  typescript: {
    question: "What is a major benefit of TypeScript in a growing codebase?",
    options: [
      "Static typing helps catch interface and data-shape issues earlier.",
      "It removes the need for runtime testing.",
      "It runs without any compilation in all browsers.",
      "It guarantees zero production bugs."
    ],
    correctOption: 0
  },
  react: {
    question: "Why should state updates in React usually be immutable?",
    options: [
      "Immutable updates make changes easier to detect and rerender predictably.",
      "React only supports string state values.",
      "Mutable state is required for hooks to work.",
      "It prevents JSX compilation errors."
    ],
    correctOption: 0
  },
  node: {
    question: "Why is non-blocking I/O important in Node.js applications?",
    options: [
      "It allows the server to continue handling other work while waiting on slower operations.",
      "It forces all code to run synchronously.",
      "It removes the need for databases.",
      "It stores all requests permanently in memory."
    ],
    correctOption: 0
  },
  express: {
    question: "What is Express middleware primarily used for?",
    options: [
      "Running request pipeline logic such as auth, validation, logging, or error handling",
      "Rendering database tables in the browser",
      "Replacing all route handlers",
      "Compiling frontend assets automatically"
    ],
    correctOption: 0
  },
  sql: {
    question: "Which SQL operation is best for combining rows from related tables?",
    options: [
      "JOIN",
      "DROP",
      "TRUNCATE",
      "CAST"
    ],
    correctOption: 0
  },
  python: {
    question: "Why are virtual environments commonly used in Python projects?",
    options: [
      "They isolate project dependencies and reduce version conflicts.",
      "They compile Python into SQL.",
      "They make code run only on Linux.",
      "They replace package managers entirely."
    ],
    correctOption: 0
  },
  java: {
    question: "What is one core benefit of object-oriented design in Java?",
    options: [
      "It supports encapsulation and reusable abstractions around behavior and data.",
      "It removes the need for compilation.",
      "It guarantees lower memory usage than all other languages.",
      "It makes exception handling unnecessary."
    ],
    correctOption: 0
  },
  aws: {
    question: "Why might a team serve a static frontend from object storage plus a CDN on AWS?",
    options: [
      "To deliver content reliably and efficiently with caching near users.",
      "To replace the need for DNS.",
      "To turn every request into a database query.",
      "To avoid writing HTML and CSS."
    ],
    correctOption: 0
  },
  docker: {
    question: "What is the practical value of a Docker image?",
    options: [
      "It packages the app and runtime dependencies into a portable artifact.",
      "It permanently stores application logs.",
      "It replaces all CI pipelines.",
      "It is identical to a virtual machine."
    ],
    correctOption: 0
  },
  kubernetes: {
    question: "What problem does Kubernetes primarily solve?",
    options: [
      "Managing, scaling, and orchestrating containerized workloads",
      "Writing CSS layouts",
      "Replacing version control branching",
      "Parsing PDF resumes"
    ],
    correctOption: 0
  },
  git: {
    question: "Why are small, focused Git commits usually better than large mixed commits?",
    options: [
      "They are easier to review, understand, and revert safely.",
      "They remove merge conflicts completely.",
      "They make version control optional.",
      "They prevent teammates from reading code."
    ],
    correctOption: 0
  },
  figma: {
    question: "Why are reusable components useful in Figma workflows?",
    options: [
      "They improve consistency and make iterative updates easier.",
      "They generate backend endpoints.",
      "They replace typography systems.",
      "They prevent layout changes."
    ],
    correctOption: 0
  },
  powerbi: {
    question: "Why are table relationships important in a Power BI data model?",
    options: [
      "They allow filters and measures to work correctly across related data.",
      "They only affect dashboard colors.",
      "They remove the need for data cleaning.",
      "They matter only when exporting to PDF."
    ],
    correctOption: 0
  },
  ml: {
    question: "What is feature engineering in machine learning?",
    options: [
      "Transforming raw data into inputs that help models learn useful patterns",
      "Deleting low-value rows permanently",
      "Deploying the model to production",
      "Writing frontend code for experiments"
    ],
    correctOption: 0
  },
  nlp: {
    question: "In NLP, what is tokenization?",
    options: [
      "Breaking text into smaller units such as words or subwords for processing",
      "Encrypting all text before analysis",
      "Turning text directly into charts",
      "Converting text into image pixels"
    ],
    correctOption: 0
  }
};

function buildFallbackExam(goal, skills) {
  const normalizedSkills = normalizeSkills(skills);
  const anchorSkill = normalizedSkills[0] || "your strongest listed skill";
  const goalQuestions = getGoalExamProfile(goal);
  const skillQuestions = normalizedSkills
    .map((skill) => SKILL_EXAM_BANK[String(skill).toLowerCase()])
    .filter(Boolean);

  const genericQuestions = [
    {
      question: `When claiming ${anchorSkill} on a resume for a ${goal} role, what is the strongest proof of real working knowledge?`,
      options: [
        "Describing a real implementation, tradeoff, debugging step, or measurable result using that skill",
        "Mentioning the tool repeatedly in the summary",
        "Avoiding implementation details to stay brief",
        "Listing it without any project context"
      ],
      correctOption: 0
    },
    {
      question: `For a ${goal} candidate, what is the best response after an assessment exposes a skill gap?`,
      options: [
        "Create a focused practice plan with targeted projects and milestones for that gap.",
        "Delete the skill from the resume and ignore it.",
        "Study only buzzwords related to the role.",
        "Switch to unrelated tools immediately."
      ],
      correctOption: 0
    }
  ];

  const seen = new Set();
  return [...goalQuestions, ...skillQuestions, ...genericQuestions].filter((question) => {
    if (seen.has(question.question)) {
      return false;
    }
    seen.add(question.question);
    return true;
  }).slice(0, 8);
}

function buildFallbackRoadmap({ goal, skills, skillLevel, score }) {
  const studyPlan = buildStudyTopicPlan({ goal, skills, skillLevel });
  const firstTopics = studyPlan[0] || [];
  const nextTopics = studyPlan[1] || [];
  const highlightedTopics = [...firstTopics.slice(0, 3), ...nextTopics.slice(0, 2)]
    .map((topic) => topic.topic)
    .filter(Boolean);
  const topicSentence = highlightedTopics.length
    ? highlightedTopics.join(", ")
    : `the core concepts expected for ${goal}`;

  return {
    headline: `${goal} growth roadmap for a ${skillLevel.toLowerCase()} learner`,
    summary: `Your resume shows ${skills.length ? skills.join(", ") : "emerging skills"}, and your assessment score is ${score}%. This roadmap prioritizes closing the highest-impact gaps first.`,
    answers: {
      whereAmINow: `You are currently at a ${skillLevel.toLowerCase()} level for ${goal}. Your current profile shows ${skills.length ? skills.join(", ") : "early-stage skills"}, and your assessment score is ${score}%.`,
      whatAmIMissing: `You are missing stronger proof of applied ability, deeper role-specific fundamentals, and clearer project evidence for ${goal}.`,
      whatShouldILearnNext: `You should next study ${topicSentence}. Focus on these topics first before moving to bigger projects.`,
      whyShouldILearnIt: `You should learn these areas because they close the gap between what your resume claims and what employers expect you to demonstrate in real work.`,
      howShouldILearnIt: "Learn through a mix of short focused study, hands-on exercises, one guided project, resume improvement, and mock interview practice.",
      whenAmIJobReady: "You are job-ready when you can explain your core skills confidently, complete a role-aligned project independently, show evidence in your resume, and answer common technical questions with real examples."
    },
    phases: [
      {
        title: "Phase 1: Assess and strengthen foundations",
        duration: "Weeks 1-2",
        objective: `Build a reliable base in the core concepts expected from a ${goal}.`,
        studyTopics: studyPlan[0],
        actions: [
          `Review the most important concepts required for ${goal} and compare them with your current resume skills.`,
          "Create a short list of weak topics based on your exam mistakes and resume gaps.",
          "Practice one small exercise every day on your weakest fundamentals."
        ],
        steps: [
          "Step 1: List the tools, concepts, and workflows already present in your resume.",
          "Step 2: Compare those with the skills expected for your target role.",
          "Step 3: Pick 2-3 weak areas and study them with short daily sessions.",
          "Step 4: Build one mini exercise or toy example to prove each topic is understood.",
          "Step 5: Write short notes on what you learned and what still feels unclear."
        ],
        deliverables: [
          "A list of priority gaps",
          "Mini practice exercises",
          "Short revision notes"
        ],
        practiceAssignments: [
          "Complete 3 short exercises on your weakest fundamentals.",
          "Write one-page notes for each weak concept you review.",
          "Solve one debugging or implementation task using your current core skills."
        ],
        projectRecommendations: [
          "Build a tiny proof-of-concept that demonstrates one core skill from your target role.",
          "Create a mini practice project focused on a single weak topic."
        ]
      },
      {
        title: "Phase 2: Build practical capability",
        duration: "Weeks 3-5",
        objective: "Turn weak or theoretical skills into hands-on experience through guided practice.",
        studyTopics: studyPlan[1],
        actions: [
          "Study the missing concepts that most directly affect your target role.",
          "Build one focused project that combines your current strengths with one or two missing skills.",
          "Use each project task as a checkpoint to validate real understanding."
        ],
        steps: [
          "Step 1: Choose one project idea that matches your career goal and current level.",
          "Step 2: Break the project into small tasks such as setup, core feature, testing, and polishing.",
          "Step 3: Apply one missing skill in each task instead of trying to learn everything at once.",
          "Step 4: Track blockers, debugging decisions, and lessons learned while building.",
          "Step 5: Finish the project with a working demo, screenshots, or code repository."
        ],
        deliverables: [
          "One role-aligned practice project",
          "Documented implementation notes",
          "Proof of applied skill usage"
        ],
        practiceAssignments: [
          "Break the chosen project into 5-7 small implementation tasks and complete them one by one.",
          "Write a short daily log of blockers, fixes, and lessons learned.",
          "Rebuild one feature twice: once simply, and once with an improvement."
        ],
        projectRecommendations: [
          `Build one portfolio-ready ${goal} project that uses both your current strengths and one missing skill.`,
          "Choose a project that solves a real problem and can be demonstrated clearly."
        ]
      },
      {
        title: "Phase 3: Strengthen profile and portfolio",
        duration: "Weeks 6-8",
        objective: "Improve how your work is presented so your profile clearly reflects real capability.",
        studyTopics: studyPlan[2],
        actions: [
          "Refine your project descriptions using outcomes, responsibilities, and concrete tools.",
          "Update your resume with better evidence for skills, projects, and achievements.",
          "Add missing certifications, coursework, or achievements that support your goal."
        ],
        steps: [
          "Step 1: Rewrite project bullet points using action + tool + result structure.",
          "Step 2: Add the strongest work from Phase 2 into your resume and profile.",
          "Step 3: Organize certifications, courses, and achievements so they support your target role.",
          "Step 4: Remove weak or repetitive resume points that do not help your goal.",
          "Step 5: Ask whether each section gives proof, not just claims."
        ],
        deliverables: [
          "Updated resume",
          "Stronger project descriptions",
          "Cleaner supporting profile details"
        ],
        practiceAssignments: [
          "Rewrite at least 5 resume bullet points using action + tool + outcome format.",
          "Create a portfolio summary for your strongest project.",
          "Review whether each listed skill has matching project evidence."
        ],
        projectRecommendations: [
          "Polish your strongest project with better documentation, visuals, and outcomes.",
          "Add one small extension feature to an existing project to show growth."
        ]
      },
      {
        title: "Phase 4: Prepare for interviews and next steps",
        duration: "Weeks 9-10",
        objective: "Convert your improved skills and projects into interview readiness and a repeatable growth plan.",
        studyTopics: studyPlan[3],
        actions: [
          "Practice technical questions tied to your goal and resume skills.",
          "Review common role-specific scenarios, tradeoffs, and debugging questions.",
          "Create a next-step plan for continued growth after the roadmap."
        ],
        steps: [
          "Step 1: Practice answering technical questions using examples from your own projects.",
          "Step 2: Review weak areas from the exam again and retest yourself.",
          "Step 3: Prepare concise explanations for your tools, architecture decisions, and learning progress.",
          "Step 4: Identify the next 1-2 advanced skills to learn after this roadmap.",
          "Step 5: Set a weekly practice schedule you can continue beyond the current plan."
        ],
        deliverables: [
          "Mock interview answers",
          "Role-specific revision checklist",
          "Post-roadmap learning plan"
        ],
        practiceAssignments: [
          "Answer 10 role-specific interview questions using examples from your own work.",
          "Do one timed mock session each week covering concepts and project walkthroughs.",
          "Create a final checklist of concepts, projects, and examples you can explain confidently."
        ],
        projectRecommendations: [
          "Prepare one showcase project to discuss deeply in interviews.",
          "Identify one next-level project idea to continue after you become job-ready."
        ]
      }
    ]
  };
}

const ROLE_TOPIC_LIBRARY = [
  {
    match: ["frontend"],
    phases: [
      ["HTML semantic structure", "CSS box model and specificity", "Flexbox and CSS Grid", "JavaScript ES6 syntax", "DOM events and form handling"],
      ["Async JavaScript with fetch", "React components and props", "React state and hooks", "Client-side routing", "API integration and error handling"],
      ["Performance optimization", "Responsive design", "Accessibility basics", "State management patterns", "Component reuse and folder structure"],
      ["Frontend debugging", "Browser dev tools", "Testing UI flows", "Deploying a frontend app", "Explaining project architecture"]
    ]
  },
  {
    match: ["backend", "full stack"],
    phases: [
      ["HTTP methods and status codes", "REST API structure", "Node.js runtime basics", "Express routing and middleware", "Request validation"],
      ["CRUD API design", "Authentication and authorization", "SQL joins and queries", "Database schema design", "Error handling and logging"],
      ["API testing with Postman", "File uploads and parsing", "Caching and performance basics", "Security basics like hashing and input sanitization", "Connecting frontend and backend"],
      ["System design basics", "Deployment flow", "Environment variables and configuration", "Debugging server issues", "Explaining backend project decisions"]
    ]
  },
  {
    match: ["data analyst"],
    phases: [
      ["Excel formulas and cleaning", "SQL SELECT, WHERE, GROUP BY", "JOIN operations", "Data cleaning basics", "Descriptive statistics"],
      ["Power BI or dashboard basics", "Data visualization principles", "Trend and variance analysis", "KPIs and business metrics", "Storytelling with data"],
      ["Advanced SQL aggregations", "Case statements", "Working with messy datasets", "Building end-to-end dashboards", "Insight writing"],
      ["Case study presentation", "Explaining dashboards clearly", "Interview SQL practice", "Choosing the right chart", "Business problem framing"]
    ]
  },
  {
    match: ["data scientist", "machine learning"],
    phases: [
      ["Python for data work", "NumPy and pandas basics", "Data cleaning", "Exploratory data analysis", "Statistics and probability basics"],
      ["Feature engineering", "Train-test split", "Regression and classification basics", "Model evaluation metrics", "Overfitting and regularization"],
      ["Scikit-learn pipelines", "Hyperparameter tuning", "Model comparison", "NLP or deep learning basics if relevant", "Project documentation"],
      ["Explaining model decisions", "End-to-end ML project workflow", "Interview ML questions", "Deployment basics", "Tradeoffs between models"]
    ]
  },
  {
    match: ["cloud"],
    phases: [
      ["Linux command line", "Networking basics", "Cloud service categories", "Virtual machines and storage", "IAM and least privilege"],
      ["Containers and Docker", "CI/CD basics", "Infrastructure as code", "Monitoring and logging", "Load balancing basics"],
      ["AWS deployment workflow", "Scaling and availability", "Kubernetes basics", "Cost awareness", "Secure configuration"],
      ["Cloud troubleshooting", "Architecture explanation", "Disaster recovery basics", "Interview scenarios", "Production best practices"]
    ]
  },
  {
    match: ["security", "cybersecurity"],
    phases: [
      ["Networking basics", "Common vulnerabilities", "Authentication and authorization", "Input sanitization", "Security principles"],
      ["OWASP concepts", "Log analysis", "Secure coding basics", "Threat modeling", "Incident response basics"],
      ["Vulnerability assessment workflow", "Cloud security basics", "Identity and access control", "Practical labs", "Security reporting"],
      ["Interview threat scenarios", "Security project explanation", "Defense-in-depth", "Security monitoring", "Risk prioritization"]
    ]
  },
  {
    match: ["ui/ux", "design"],
    phases: [
      ["Design principles", "Typography hierarchy", "Color and contrast", "Wireframing basics", "User flow mapping"],
      ["Figma components", "Design systems", "Responsive layouts", "Accessibility in interfaces", "Prototype creation"],
      ["Usability testing", "Design critique", "Portfolio case study writing", "Interaction design basics", "Problem framing"],
      ["Presenting design decisions", "Interview portfolio walkthrough", "Design tradeoffs", "Collaboration with developers", "Iteration based on feedback"]
    ]
  }
];

const SKILL_TOPIC_LIBRARY = {
  javascript: ["JavaScript variables and scope", "Array methods", "Promises and async/await", "Error handling", "DOM manipulation"],
  typescript: ["Type annotations", "Interfaces and types", "Generics basics", "Type-safe API responses"],
  react: ["JSX and components", "Props vs state", "useEffect and lifecycle thinking", "Form handling in React"],
  node: ["Event loop basics", "Modules and package structure", "Async I/O", "Building APIs with Node"],
  express: ["Routing", "Middleware chain", "Request validation", "Error middleware"],
  sql: ["SELECT and filtering", "JOINs", "GROUP BY and HAVING", "Subqueries"],
  python: ["Functions and modules", "Lists and dictionaries", "File handling", "Working with libraries"],
  java: ["OOP basics", "Classes and objects", "Collections", "Exception handling"],
  aws: ["EC2 and S3 basics", "IAM", "Cloud deployment basics", "Monitoring services"],
  docker: ["Images vs containers", "Dockerfile basics", "Volume and port mapping", "Container debugging"],
  kubernetes: ["Pods and deployments", "Services", "ConfigMaps and secrets", "Scaling basics"],
  git: ["Commit flow", "Branches and merges", "Resolving conflicts", "Pull request basics"],
  figma: ["Components", "Auto layout", "Prototype links", "Design handoff"],
  powerbi: ["Data model relationships", "Measures and DAX basics", "Dashboard filters", "Report storytelling"],
  ml: ["Feature engineering", "Model evaluation", "Bias-variance tradeoff", "Pipeline thinking"],
  nlp: ["Tokenization", "Text cleaning", "Vectorization basics", "Text classification flow"]
};

function describeStudyTopic(topic) {
  const detailsByTopic = {
    "HTML semantic structure": "Study semantic tags, accessible page structure, headings, forms, and how to organize content correctly.",
    "CSS box model and specificity": "Study margin, padding, border, width calculation, selector priority, and how style conflicts are resolved.",
    "Flexbox and CSS Grid": "Study row and column layouts, alignment, spacing, responsive positioning, and when to use each layout system.",
    "JavaScript ES6 syntax": "Study variables, arrow functions, template literals, destructuring, spread operators, and modules.",
    "DOM events and form handling": "Study event listeners, input handling, validation, event bubbling, and updating UI from user actions.",
    "Async JavaScript with fetch": "Study promises, async/await, API requests, loading states, and handling request failures.",
    "React components and props": "Study how to split UI into components, pass data with props, and keep components reusable.",
    "React state and hooks": "Study useState, useEffect, state updates, side effects, and how component data changes over time.",
    "Client-side routing": "Study page navigation, route parameters, protected routes, and organizing multi-page frontend flows.",
    "API integration and error handling": "Study how to call APIs, handle loading and error states, and map responses into the interface.",
    "HTTP methods and status codes": "Study GET, POST, PUT, DELETE, request-response flow, and the meaning of common status codes.",
    "REST API structure": "Study resource-based routing, endpoint naming, request payloads, and predictable response shapes.",
    "Node.js runtime basics": "Study modules, asynchronous execution, package structure, and how Node handles server-side code.",
    "Express routing and middleware": "Study route handlers, middleware flow, request processing, and reusable backend logic.",
    "Request validation": "Study checking request data, required fields, invalid input handling, and preventing bad data from entering the system.",
    "CRUD API design": "Study create, read, update, delete operations and how they map to routes and database changes.",
    "Authentication and authorization": "Study login flow, session or token handling, password protection, and access control decisions.",
    "SQL joins and queries": "Study SELECT, WHERE, JOIN, GROUP BY, sorting, and combining related tables correctly.",
    "Database schema design": "Study tables, columns, relationships, keys, normalization, and how data should be stored.",
    "Error handling and logging": "Study try/catch flow, consistent error responses, server logging, and debugging backend issues.",
    "Python for data work": "Study Python syntax, functions, lists, dictionaries, and writing clean data-processing code.",
    "NumPy and pandas basics": "Study arrays, dataframes, filtering, grouping, and basic transformations on structured data.",
    "Data cleaning": "Study missing values, duplicates, type conversion, outliers, and making raw data usable.",
    "Exploratory data analysis": "Study distributions, correlations, summary statistics, and how to inspect data before modeling.",
    "Statistics and probability basics": "Study averages, variance, probability, distributions, and hypothesis thinking.",
    "Feature engineering": "Study how to create useful input variables from raw data so models can learn better patterns.",
    "Train-test split": "Study how to separate training and evaluation data and why model testing must use unseen data.",
    "Regression and classification basics": "Study supervised learning problem types, common algorithms, and when to use each one.",
    "Model evaluation metrics": "Study accuracy, precision, recall, F1 score, RMSE, and choosing the right metric.",
    "Overfitting and regularization": "Study why models memorize training data, how to detect it, and how to reduce it.",
    "Linux command line": "Study file navigation, permissions, common shell commands, and basic system operations.",
    "Networking basics": "Study IPs, ports, DNS, HTTP/HTTPS, and how systems communicate over networks.",
    "Cloud service categories": "Study compute, storage, networking, database, and identity services in cloud platforms.",
    "Virtual machines and storage": "Study instance setup, disks, object storage, and where application data lives.",
    "IAM and least privilege": "Study user roles, permissions, access policies, and giving only the access that is needed.",
    "Containers and Docker": "Study images, containers, Dockerfiles, environment setup, and packaging apps consistently.",
    "CI/CD basics": "Study automated build, test, and deployment pipelines and how code moves to production.",
    "Infrastructure as code": "Study defining infrastructure in code, repeatable deployments, and configuration management.",
    "Monitoring and logging": "Study health checks, logs, metrics, alerts, and how to observe application behavior.",
    "Load balancing basics": "Study traffic distribution, scaling, availability, and handling multiple service instances.",
    "Design principles": "Study alignment, contrast, hierarchy, spacing, consistency, and how they improve usability.",
    "Typography hierarchy": "Study heading structure, readable text scales, font pairing, and scannable layout.",
    "Color and contrast": "Study accessible contrast, color meaning, emphasis, and using color intentionally in interfaces.",
    "Wireframing basics": "Study low-fidelity screens, layout planning, user task flow, and quick interface exploration.",
    "User flow mapping": "Study how users move through a product, decision points, and reducing friction in tasks."
  };

  return detailsByTopic[topic] || `Study the core ideas, practical usage, common mistakes, and how ${topic.toLowerCase()} is applied in real projects.`;
}

function buildStudyTopicPlan({ goal, skills, skillLevel }) {
  const goalText = String(goal || "").toLowerCase();
  const matchedRole = ROLE_TOPIC_LIBRARY.find((entry) => entry.match.some((keyword) => goalText.includes(keyword)));
  const basePlan = matchedRole ? matchedRole.phases.map((phase) => [...phase]) : [
    ["Role fundamentals", "Core tools used in the role", "Problem-solving basics", "Debugging workflow", "Basic project structure"],
    ["Applied practice on weak skills", "One role-aligned workflow", "Tool usage in real tasks", "Testing your understanding", "Project planning basics"],
    ["Portfolio-quality implementation", "Resume evidence building", "Project documentation", "Communication of work", "Refining weak areas"],
    ["Interview preparation", "Project explanation", "Advanced next topics", "Real-world scenarios", "Continued learning plan"]
  ];

  const normalizedSkills = normalizeSkills(skills);
  const skillTopics = normalizedSkills
    .flatMap((skill) => SKILL_TOPIC_LIBRARY[String(skill).toLowerCase()] || [])
    .filter(Boolean);

  if (skillTopics.length) {
    skillTopics.forEach((topic, index) => {
      const phaseIndex = Math.min(index % 2, basePlan.length - 1);
      if (!basePlan[phaseIndex].includes(topic)) {
        basePlan[phaseIndex].push(topic);
      }
    });
  }

  if (String(skillLevel || "").toLowerCase() === "advanced") {
    if (!basePlan[2].includes("Architecture tradeoffs")) {
      basePlan[2].push("Architecture tradeoffs");
    }
    if (!basePlan[3].includes("Advanced interview scenarios")) {
      basePlan[3].push("Advanced interview scenarios");
    }
  }

  return basePlan.map((phase) =>
    Array.from(new Set(phase)).slice(0, 6).map((topic) => ({
      topic,
      details: describeStudyTopic(topic)
    }))
  );
}

function normalizeRoadmapPhase(phase, index) {
  const actions = Array.isArray(phase.actions) ? phase.actions.filter(Boolean) : [];
  const steps = Array.isArray(phase.steps) ? phase.steps.filter(Boolean) : actions.map((action, actionIndex) => `Step ${actionIndex + 1}: ${action}`);
  const deliverables = Array.isArray(phase.deliverables) ? phase.deliverables.filter(Boolean) : [];
  const studyTopics = Array.isArray(phase.studyTopics)
    ? phase.studyTopics
        .map((topic) => {
          if (!topic) return null;
          if (typeof topic === "string") {
            return {
              topic,
              details: describeStudyTopic(topic)
            };
          }

          const topicName = String(topic.topic || topic.name || "").trim();
          if (!topicName) return null;

          return {
            topic: topicName,
            details: String(topic.details || topic.description || describeStudyTopic(topicName)).trim()
          };
        })
        .filter(Boolean)
    : [];
  const practiceAssignments = Array.isArray(phase.practiceAssignments) ? phase.practiceAssignments.filter(Boolean) : [];
  const projectRecommendations = Array.isArray(phase.projectRecommendations) ? phase.projectRecommendations.filter(Boolean) : [];

  return {
    title: String(phase.title || `Phase ${index + 1}`).trim(),
    duration: String(phase.duration || "").trim(),
    objective: String(phase.objective || "").trim(),
    actions,
    steps,
    deliverables,
    studyTopics,
    practiceAssignments,
    projectRecommendations,
    resources: Array.isArray(phase.resources) ? phase.resources : []
  };
}

function normalizeRoadmapShape(roadmap) {
  return {
    headline: String(roadmap.headline || "Personalized roadmap").trim(),
    summary: String(roadmap.summary || "").trim(),
    answers: {
      whereAmINow: String(roadmap.answers?.whereAmINow || "").trim(),
      whatAmIMissing: String(roadmap.answers?.whatAmIMissing || "").trim(),
      whatShouldILearnNext: String(roadmap.answers?.whatShouldILearnNext || "").trim(),
      whyShouldILearnIt: String(roadmap.answers?.whyShouldILearnIt || "").trim(),
      howShouldILearnIt: String(roadmap.answers?.howShouldILearnIt || "").trim(),
      whenAmIJobReady: String(roadmap.answers?.whenAmIJobReady || "").trim()
    },
    phases: Array.isArray(roadmap.phases) ? roadmap.phases.map(normalizeRoadmapPhase) : []
  };
}

function ensureRoadmapStudyTopics(roadmap, { goal, skills, skillLevel }) {
  const fallbackStudyPlan = buildStudyTopicPlan({ goal, skills, skillLevel });

  return {
    ...roadmap,
    phases: roadmap.phases.map((phase, index) => ({
      ...phase,
      studyTopics: phase.studyTopics && phase.studyTopics.length
        ? phase.studyTopics
        : (fallbackStudyPlan[index] || [])
    }))
  };
}

function buildFallbackKnowledgeContext(knowledgeContext) {
  const normalized = {
    userProfile: {
      skills: normalizeSkills(knowledgeContext.userProfile?.skills || []),
      projects: normalizeSkills(knowledgeContext.userProfile?.projects || []),
      experience: normalizeSkills(knowledgeContext.userProfile?.experience || []),
      education: normalizeSkills(knowledgeContext.userProfile?.education || []),
      certifications: normalizeSkills(knowledgeContext.userProfile?.certifications || []),
      courses: normalizeSkills(knowledgeContext.userProfile?.courses || []),
      achievements: normalizeSkills(knowledgeContext.userProfile?.achievements || [])
    }
  };

  return {
    userProfile: normalized.userProfile
  };
}

async function getTrendingSkills({ goal, skills }) {
  const normalizedSkills = normalizeSkills(skills);
  const fallback = buildFallbackTrends(goal, normalizedSkills);
  const prompt = `
Return JSON with a "skills" array of 5 objects.
Each object must have "name" and "reason".
Role goal: ${goal}
Current user skills: ${normalizedSkills.join(", ")}
Focus on future trending skills that are timely for the role and complement the current skills.
`;
  const result = await requestJsonFromModel(prompt, { skills: fallback }, {
    cacheKey: `trending:${stableSerialize({ goal, skills: normalizedSkills })}`,
    ttlMs: 1000 * 60 * 60 * 6
  });
  return result.skills || fallback;
}

async function generateExam({ goal, skills }) {
  const normalizedSkills = normalizeSkills(skills);
  const fallback = buildFallbackExam(goal, normalizedSkills);
  const prompt = `
Return JSON with a "questions" array of exactly ${fallback.length} multiple choice questions.
Each question must contain:
- "question"
- "options" with 4 strings
- "correctOption" as a zero-based integer
Role goal: ${goal}
Resume skills: ${normalizedSkills.join(", ")}
Make the exam technical and role-aware.
Rules:
- At least half of the questions must directly test one or more listed resume skills.
- The remaining questions should test practical concepts, debugging, tradeoffs, architecture, or best practices for the target role.
- Avoid generic motivation or career-advice questions.
- Keep the difficulty suitable for a serious beginner-to-intermediate candidate.
`;
  const result = await requestJsonFromModel(prompt, { questions: fallback }, {
    cacheKey: `exam:${stableSerialize({ goal, skills: normalizedSkills })}`,
    ttlMs: 1000 * 60 * 30
  });
  return result.questions || fallback;
}

async function generateRoadmap({ goal, skills, skillLevel, score, knowledgeContext = {}, forceRefresh = false }) {
  const normalizedSkills = normalizeSkills(skills);
  const fallback = buildFallbackRoadmap({ goal, skills: normalizedSkills, skillLevel, score });
  const fallbackContext = buildFallbackKnowledgeContext(knowledgeContext);
  const prompt = `
Return JSON with:
- "headline"
- "summary"
- "answers" object with exactly these keys:
  - "whereAmINow"
  - "whatAmIMissing"
  - "whatShouldILearnNext"
  - "whyShouldILearnIt"
  - "howShouldILearnIt"
  - "whenAmIJobReady"
- "phases" array with 4 objects
Each phase object must contain:
- "title"
- "duration"
- "objective"
- "studyTopics" array with 4 to 6 objects
  - each object must contain:
    - "topic"
    - "details"
- "actions" array with 3 strings
- "steps" array with 4 to 6 strings written as a clear step-by-step plan
- "deliverables" array with 2 to 4 strings
- "practiceAssignments" array with 2 to 4 concrete assignments
- "projectRecommendations" array with 1 to 3 concrete project ideas
Also return:
- "datasetSuggestions" array of up to 3 objects with "title", "provider", "summary", "sourceUrl"
Generate a personalized roadmap for this learner.
Goal: ${goal}
Resume skills: ${normalizedSkills.join(", ")}
Assessment level: ${skillLevel}
Assessment score: ${score}
Retrieved user knowledge profile:
${JSON.stringify(fallbackContext.userProfile, null, 2)}
Rules:
- Make the roadmap detailed, clear, and practical.
- The "answers" object must directly answer the user's current position, gaps, next learning priorities, rationale, learning method, and estimated job-readiness state.
- Each phase should feel sequential and build on the previous phase.
- The "studyTopics" must name exact concepts, tools, frameworks, workflows, or problem areas to study. Do not say vague phrases like "learn fundamentals" or "improve basics" without naming what those basics are.
- The "details" field must define what the user should cover inside that topic in one practical sentence.
- The "steps" should be concrete actions, not vague advice.
- The "whatShouldILearnNext" answer must explicitly list the most important topics to study next.
- The "practiceAssignments" should feel like tasks the user can complete this week.
- The "projectRecommendations" should be role-aligned and realistic for the user's level.
- Use the user's existing skills, projects, education, certifications, courses, and achievements when shaping the plan.
`;
  const roadmap = await requestJsonFromModel(prompt, fallback, {
    cacheKey: `roadmap:${stableSerialize({ goal, skills: normalizedSkills, skillLevel, score, userProfile: fallbackContext.userProfile })}`,
    ttlMs: 1000 * 60 * 15,
    forceRefresh
  });
  const normalizedRoadmap = ensureRoadmapStudyTopics(normalizeRoadmapShape(roadmap), {
    goal,
    skills: normalizedSkills,
    skillLevel
  });
  const enrichedRoadmap = await attachStudyMaterials(normalizedRoadmap, goal, normalizedSkills, skillLevel, score, fallbackContext);
  return {
    ...enrichedRoadmap,
    datasetSuggestions: Array.isArray(roadmap.datasetSuggestions) ? roadmap.datasetSuggestions : [],
    knowledgeBase: fallbackContext
  };
}

function extractJSON(text) {
  try {
    if (!text) return null;

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    return JSON.parse(match[0]);
  } catch (e) {
    console.log("JSON Parse Failed:", e.message);
    return null;
  }
}
async function generateSuggestions(resumeText = "", targetRole = "") {
  if (!client) {
    return {
      missingKeywords: [],
      rewrittenPoints: [],
      formattedResume: resumeText
    };
  }

  const prompt = `
  You are an ATS resume optimizer.

  Target Role: ${targetRole}

  Return ONLY JSON:
  {
    "missingKeywords": [],
    "rewrittenPoints": [],
    "formattedResume": ""
  }

  Resume:
  ${resumeText}
  `;

  const models = ["gemini-2.5-flash"];

  for (const modelName of models) {
    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents: prompt
      });

      const text =
        response.text ||
        response.candidates?.[0]?.content?.parts?.[0]?.text;

      const result = extractJSON(text);

      if (result) return result;

    } catch (error) {
      console.log(`Model ${modelName} failed →`, error.message);
    }
  }

  // FINAL FALLBACK
  return {
    missingKeywords: [
      "Node.js",
      "REST API",
      "MongoDB",
      "Git",
      "System Design"
    ],
    rewrittenPoints: [
      "Developed scalable web applications using modern technologies",
      "Implemented responsive UI with improved performance",
      "Collaborated on real-world projects using Agile practices"
    ],
    formattedResume: resumeText
  };
}

module.exports = {
  getTrendingSkills,
  generateExam,
  generateRoadmap,
  generateSuggestions 
};
