const { GoogleGenAI } = require("@google/genai");

const client = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

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

async function requestJsonFromModel(prompt, fallbackData) {
  if (!client) {
    return fallbackData;
  }

  try {
    const response = await client.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text);
  } catch (_error) {
    return fallbackData;
  }
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

async function attachStudyMaterials(roadmap, goal, skills, skillLevel, score) {
  const phases = roadmap.phases || [];
  const personalized = await personalizeStudyMaterials({
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

function buildFallbackExam(goal, skills) {
  const anchorSkill = skills[0] || "general problem solving";

  return [
    {
      question: `Which option best describes the main purpose of ${anchorSkill} in a ${goal} workflow?`,
      options: [
        "It helps deliver or improve core work in the target role.",
        "It is used only for graphic design.",
        "It replaces collaboration entirely.",
        "It removes the need for testing."
      ],
      correctOption: 0
    },
    {
      question: `When reviewing a resume for ${goal}, what is the best way to validate claimed skill strength?`,
      options: [
        "Ask only theoretical questions.",
        "Ignore the resume and ask unrelated puzzles.",
        "Use goal-based practical questions tied to listed skills.",
        "Skip evaluation if the candidate sounds confident."
      ],
      correctOption: 2
    },
    {
      question: `What would most strongly show working knowledge beyond just listing ${anchorSkill} on a resume?`,
      options: [
        "A project, deliverable, or measurable outcome using it.",
        "Writing it in uppercase letters.",
        "Mentioning it more than five times.",
        "Leaving dates off the resume."
      ],
      correctOption: 0
    },
    {
      question: `For someone aiming to become a ${goal}, what is usually the best next step after identifying a skill gap?`,
      options: [
        "Avoid practicing until more trends appear.",
        "Create a focused learning plan with projects and milestones.",
        "Remove the goal from the profile.",
        "Learn unrelated tools first."
      ],
      correctOption: 1
    },
    {
      question: "Which answer best reflects exam evidence that matches the submitted resume skills?",
      options: [
        "Responses that connect concepts to tools and practical use cases.",
        "Very short guesses with no explanation.",
        "Answers unrelated to the selected goal.",
        "Skipping questions that mention listed skills."
      ],
      correctOption: 0
    }
  ];
}

function buildFallbackRoadmap({ goal, skills, skillLevel, score }) {
  return {
    headline: `${goal} growth roadmap for a ${skillLevel.toLowerCase()} learner`,
    summary: `Your resume shows ${skills.length ? skills.join(", ") : "emerging skills"}, and your assessment score is ${score}%. This roadmap prioritizes closing the highest-impact gaps first.`,
    phases: [
      {
        title: "Phase 1: Strengthen foundations",
        duration: "Weeks 1-3",
        actions: [
          `Revisit the core concepts required for ${goal}.`,
          "Practice your current resume skills in short daily exercises.",
          "Document one mini project to prove understanding."
        ]
      },
      {
        title: "Phase 2: Close the gap",
        duration: "Weeks 4-8",
        actions: [
          "Study two trending skills that align with your role target.",
          "Build one portfolio project that combines existing and missing skills.",
          "Review mistakes from the exam and turn them into learning checkpoints."
        ]
      },
      {
        title: "Phase 3: Become interview-ready",
        duration: "Weeks 9-12",
        actions: [
          "Refine project explanations using metrics and outcomes.",
          "Practice role-specific mock questions weekly.",
          "Update your resume and profile with the new evidence of skill growth."
        ]
      }
    ]
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
  const result = await requestJsonFromModel(prompt, { skills: fallback });
  return result.skills || fallback;
}

async function generateExam({ goal, skills }) {
  const normalizedSkills = normalizeSkills(skills);
  const fallback = buildFallbackExam(goal, normalizedSkills);
  const prompt = `
Return JSON with a "questions" array of exactly 5 multiple choice questions.
Each question must contain:
- "question"
- "options" with 4 strings
- "correctOption" as a zero-based integer
Role goal: ${goal}
Resume skills: ${normalizedSkills.join(", ")}
Make the exam test whether the learner truly understands the resume skills and role expectations.
`;
  const result = await requestJsonFromModel(prompt, { questions: fallback });
  return result.questions || fallback;
}

async function generateRoadmap({ goal, skills, skillLevel, score }) {
  const normalizedSkills = normalizeSkills(skills);
  const fallback = buildFallbackRoadmap({ goal, skills: normalizedSkills, skillLevel, score });
  const prompt = `
Return JSON with:
- "headline"
- "summary"
- "phases" array with 3 objects
Each phase object must contain:
- "title"
- "duration"
- "actions" array with 3 strings
Generate a personalized roadmap for this learner.
Goal: ${goal}
Resume skills: ${normalizedSkills.join(", ")}
Assessment level: ${skillLevel}
Assessment score: ${score}
`;
  const roadmap = await requestJsonFromModel(prompt, fallback);
  return attachStudyMaterials(roadmap, goal, normalizedSkills, skillLevel, score);
}

module.exports = {
  getTrendingSkills,
  generateExam,
  generateRoadmap
};
