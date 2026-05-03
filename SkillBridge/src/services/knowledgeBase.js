const fs = require("fs/promises");
const path = require("path");

const {
  upsertKnowledgeDocument,
  getAllKnowledgeDocuments
} = require("../db");

const DATA_DIR = path.join(__dirname, "..", "..", "data", "knowledge-base");
const JOB_IMPORT_DIR = path.join(__dirname, "..", "..", "data", "job-imports");

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function tokenize(value) {
  return normalizeText(value)
    .split(/[^a-z0-9.+#/-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function normalizeRole(goal) {
  const goalText = normalizeText(goal);

  if (goalText.includes("frontend")) return "frontend";
  if (goalText.includes("backend")) return "backend";
  if (goalText.includes("full stack")) return "full-stack";
  if (goalText.includes("data analyst")) return "data-analyst";
  if (goalText.includes("data scientist")) return "data-scientist";
  if (goalText.includes("machine learning")) return "machine-learning";
  if (goalText.includes("cloud")) return "cloud";
  if (goalText.includes("security")) return "cybersecurity";
  if (goalText.includes("ui/ux")) return "ui-ux";
  if (goalText.includes("product")) return "product";

  return goalText || "general";
}

function rankDocuments(documents, { goal, skills, limit, type }) {
  const goalRole = normalizeRole(goal);
  const queryTokens = new Set([
    ...tokenize(goal),
    ...skills.flatMap((skill) => tokenize(skill))
  ]);

  const ranked = documents
    .filter((document) => !type || document.doc_type === type)
    .map((document) => {
      const skillsList = JSON.parse(document.skills_json || "[]");
      const tagsList = JSON.parse(document.tags_json || "[]");
      const haystack = tokenize([
        document.title,
        document.summary,
        document.role_target,
        skillsList.join(" "),
        tagsList.join(" ")
      ].join(" "));

      const tokenSet = new Set(haystack);
      let score = 0;

      queryTokens.forEach((token) => {
        if (tokenSet.has(token)) {
          score += 3;
        }
      });

      if (normalizeRole(document.role_target || "") === goalRole) {
        score += 8;
      }

      if (type === "job_requirement") {
        score += 2;
      }

      return {
        ...document,
        parsedSkills: skillsList,
        parsedTags: tagsList,
        score
      };
    })
    .filter((document) => document.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (ranked.length) {
    return ranked;
  }

  return documents
    .filter((document) => !type || document.doc_type === type)
    .map((document) => ({
      ...document,
      parsedSkills: JSON.parse(document.skills_json || "[]"),
      parsedTags: JSON.parse(document.tags_json || "[]"),
      score: 0
    }))
    .slice(0, limit);
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function seedKnowledgeBaseFromFiles() {
  const fileNames = [
    "learning-resources.json",
    "public-datasets.json"
  ];

  for (const fileName of fileNames) {
    const items = await readJsonFile(path.join(DATA_DIR, fileName));
    for (const item of items) {
      await upsertKnowledgeDocument(item);
    }
  }
}

async function importJobDocuments() {
  try {
    const fileNames = await fs.readdir(JOB_IMPORT_DIR);
    const jsonFiles = fileNames.filter((fileName) => fileName.endsWith(".json") && !fileName.startsWith("sample-"));

    for (const fileName of jsonFiles) {
      const items = await readJsonFile(path.join(JOB_IMPORT_DIR, fileName));
      for (const item of items) {
        await upsertKnowledgeDocument({
          docType: "job_requirement",
          provider: item.provider,
          title: item.title,
          sourceUrl: item.sourceUrl,
          roleTarget: item.roleTarget,
          summary: item.summary,
          skills: item.skills || [],
          tags: item.tags || [],
          metadata: {
            location: item.location || "",
            company: item.company || "",
            sourceType: "job-board-import"
          }
        });
      }
    }
  } catch (_error) {
    return;
  }
}

async function initializeKnowledgeBase() {
  await seedKnowledgeBaseFromFiles();
  await importJobDocuments();
}

function toKnowledgeItem(document) {
  return {
    title: document.title,
    provider: document.provider,
    sourceUrl: document.source_url,
    roleTarget: document.role_target || "",
    summary: document.summary,
    skills: document.parsedSkills || JSON.parse(document.skills_json || "[]"),
    tags: document.parsedTags || JSON.parse(document.tags_json || "[]")
  };
}

async function retrieveKnowledgeContext({ goal, skills }) {
  const documents = await getAllKnowledgeDocuments();
  const normalizedSkills = Array.isArray(skills) ? skills.map((skill) => String(skill).trim()).filter(Boolean) : [];

  const jobRequirements = rankDocuments(documents, {
    goal,
    skills: normalizedSkills,
    type: "job_requirement",
    limit: 4
  }).map(toKnowledgeItem);

  const learningResources = rankDocuments(documents, {
    goal,
    skills: normalizedSkills,
    type: "learning_resource",
    limit: 6
  }).map(toKnowledgeItem);

  const datasets = rankDocuments(documents, {
    goal,
    skills: normalizedSkills,
    type: "public_dataset",
    limit: 4
  }).map(toKnowledgeItem);

  return {
    jobRequirements,
    learningResources,
    datasets
  };
}

module.exports = {
  initializeKnowledgeBase,
  retrieveKnowledgeContext
};
