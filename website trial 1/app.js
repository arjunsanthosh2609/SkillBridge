const roleProfiles = {
  "data-analyst": {
    label: "Data Analyst",
    required: [
      "Python",
      "SQL",
      "Excel",
      "Power BI",
      "Statistics",
      "Tableau",
      "Data Visualization",
      "Critical Thinking"
    ],
    roadmap: [
      {
        title: "Phase 1: Strengthen analytics presentation",
        text: "Focus on Data Visualization and dashboard storytelling using Tableau or Power BI case studies."
      },
      {
        title: "Phase 2: Build a portfolio project",
        text: "Create an end-to-end sales or HR analytics dashboard with cleaned datasets and executive insights."
      },
      {
        title: "Phase 3: Interview readiness",
        text: "Practice SQL scenarios, metric definitions, and explaining decisions with business context."
      }
    ],
    trends: [
      {
        title: "Analytics Engineering is rising",
        text: "Teams increasingly expect analysts to work with pipelines, metrics layers, and dbt-style workflows."
      },
      {
        title: "AI-assisted BI is becoming standard",
        text: "Natural-language querying and automated insight generation are growing across dashboard tools."
      }
    ]
  },
  "frontend-developer": {
    label: "Frontend Developer",
    required: [
      "HTML",
      "CSS",
      "JavaScript",
      "React",
      "Git",
      "Responsive Design",
      "API Integration",
      "UI Debugging"
    ],
    roadmap: [
      {
        title: "Phase 1: Core interface skills",
        text: "Master semantic HTML, advanced CSS layouts, and JavaScript DOM logic through mini interface builds."
      },
      {
        title: "Phase 2: React project delivery",
        text: "Develop a responsive dashboard with reusable components, form validation, and API-driven content."
      },
      {
        title: "Phase 3: Production polish",
        text: "Practice Git workflows, debugging browser issues, and performance/accessibility checks."
      }
    ],
    trends: [
      {
        title: "Design systems remain high value",
        text: "Companies want developers who can turn reusable components into consistent product experiences."
      },
      {
        title: "AI-enhanced UX workflows are expanding",
        text: "Frontend roles increasingly overlap with prompt-driven prototyping and personalized interfaces."
      }
    ]
  },
  "ml-engineer": {
    label: "ML Engineer",
    required: [
      "Python",
      "Machine Learning",
      "TensorFlow",
      "PyTorch",
      "Feature Engineering",
      "MLOps",
      "Model Deployment",
      "Statistics"
    ],
    roadmap: [
      {
        title: "Phase 1: ML foundations",
        text: "Cover supervised learning, feature engineering, and model evaluation using hands-on notebooks."
      },
      {
        title: "Phase 2: Framework depth",
        text: "Train and compare projects with TensorFlow or PyTorch, then document reproducible experiments."
      },
      {
        title: "Phase 3: Deployment and MLOps",
        text: "Package a model API, add monitoring basics, and learn workflow tools used in production ML teams."
      }
    ],
    trends: [
      {
        title: "Applied GenAI engineering is accelerating",
        text: "Retrieval pipelines, evaluation, and safe deployment are becoming core hiring themes."
      },
      {
        title: "MLOps is now expected earlier",
        text: "Even entry-level ML roles often prefer candidates who can version, ship, and monitor models."
      }
    ]
  }
};

const form = document.getElementById("analyzerForm");
const candidateNameInput = document.getElementById("candidateName");
const jobRoleSelect = document.getElementById("jobRole");
const resumeTextInput = document.getElementById("resumeText");
const trendToggle = document.getElementById("trendToggle");

const candidateDisplay = document.getElementById("candidateDisplay");
const matchScore = document.getElementById("matchScore");
const skillCount = document.getElementById("skillCount");
const gapLevel = document.getElementById("gapLevel");
const heroMatch = document.getElementById("heroMatch");
const detectedSkills = document.getElementById("detectedSkills");
const missingSkills = document.getElementById("missingSkills");
const roadmapList = document.getElementById("roadmapList");
const trendList = document.getElementById("trendList");
const trendCard = document.getElementById("trendCard");
const architectureText = document.getElementById("architectureText");

function normalizeSkills(rawText) {
  return rawText
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/\s+/g, " "));
}

function renderTags(container, values) {
  container.innerHTML = "";
  values.forEach((value) => {
    const tag = document.createElement("span");
    tag.textContent = value;
    container.appendChild(tag);
  });
}

function renderRoadmap(items) {
  roadmapList.innerHTML = "";
  items.forEach((item) => {
    const article = document.createElement("article");
    article.className = "roadmap-item";
    article.innerHTML = `<strong>${item.title}</strong><p>${item.text}</p>`;
    roadmapList.appendChild(article);
  });
}

function renderTrends(items) {
  trendList.innerHTML = "";
  items.forEach((item) => {
    const article = document.createElement("article");
    article.className = "trend-item";
    article.innerHTML = `<strong>${item.title}</strong><p>${item.text}</p>`;
    trendList.appendChild(article);
  });
}

function updateArchitectureText(roleName, missing, includeTrends) {
  const roadmapStep =
    missing.length > 0
      ? "Skill Gap Analysis -> Personalized Roadmap Generator"
      : "Skill Gap Analysis -> Improvement Suggestions";

  const trendStep = includeTrends
    ? "Skill Gap Analysis -> Optional Trend Prediction Module"
    : "Trend Prediction Module skipped by user";

  architectureText.textContent = [
    "User Interface -> Resume Processing -> Skill Extraction",
    "User Interface -> Job Role Selection -> Job Requirement Database",
    "Skill Extraction + Job Requirement Database -> Skill Gap Analysis Engine",
    roadmapStep,
    trendStep,
    `Current role profile -> ${roleName}`,
    "Roadmap/Insights + Gap Report -> Output and Visualization Layer"
  ].join("\n");
}

function analyze() {
  const profile = roleProfiles[jobRoleSelect.value];
  const candidate = candidateNameInput.value.trim() || "Candidate";
  const extracted = normalizeSkills(resumeTextInput.value);
  const extractedSet = new Set(extracted.map((skill) => skill.toLowerCase()));
  const matched = profile.required.filter((skill) =>
    extractedSet.has(skill.toLowerCase())
  );
  const missing = profile.required.filter(
    (skill) => !extractedSet.has(skill.toLowerCase())
  );
  const score = Math.max(
    12,
    Math.round((matched.length / profile.required.length) * 100)
  );

  candidateDisplay.textContent = `${candidate} | ${profile.label}`;
  matchScore.textContent = `${score}%`;
  heroMatch.textContent = `${score}%`;
  skillCount.textContent = `${extracted.length} skills`;
  gapLevel.textContent =
    missing.length <= 2 ? "Priority Low" : missing.length <= 4 ? "Priority Medium" : "Priority High";

  renderTags(detectedSkills, extracted);
  renderTags(missingSkills, missing.length ? missing : ["No major skill gaps detected"]);
  renderRoadmap(profile.roadmap);

  if (trendToggle.checked) {
    trendCard.hidden = false;
    renderTrends(profile.trends);
  } else {
    trendCard.hidden = true;
  }

  updateArchitectureText(profile.label, missing, trendToggle.checked);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  analyze();
});

jobRoleSelect.addEventListener("change", analyze);
trendToggle.addEventListener("change", analyze);

analyze();
