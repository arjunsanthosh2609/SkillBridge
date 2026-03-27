const fs = require("fs/promises");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const nlp = require("compromise");
const natural = require("natural");

const tokenizer = new natural.WordTokenizer();

/* -----------------------------
   SKILL DATABASE WITH SYNONYMS
------------------------------*/
const SKILL_MAP = {
  javascript: ["js", "javascript"],
  typescript: ["ts", "typescript"],
  react: ["react", "react.js"],
  node: ["node", "node.js"],
  express: ["express"],
  mongodb: ["mongodb"],
  sql: ["sql", "mysql", "postgresql"],
  python: ["python"],
  java: ["java"],
  aws: ["aws", "amazon web services"],
  docker: ["docker"],
  kubernetes: ["kubernetes", "k8s"],
  git: ["git", "github"],
  figma: ["figma"],
  powerbi: ["power bi"],
  ml: ["machine learning", "ml"],
  nlp: ["nlp", "natural language processing"]
};

/* -----------------------------
   TEXT NORMALIZATION
------------------------------*/
function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

/* -----------------------------
   FILE READER
------------------------------*/
async function readResumeText(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === ".pdf") {
    const pdfBuffer = await fs.readFile(filePath);
    const pdf = await pdfParse(pdfBuffer);
    return pdf.text;
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  return fs.readFile(filePath, "utf8");
}

/* -----------------------------
   SMART SKILL EXTRACTION
------------------------------*/
function extractSkills(text) {
  const lower = text.toLowerCase();
  const tokens = tokenizer.tokenize(lower);

  const foundSkills = [];

  for (const [mainSkill, variants] of Object.entries(SKILL_MAP)) {
    for (const variant of variants) {
      const regex = new RegExp(`\\b${variant}\\b`, "i");

      if (regex.test(lower)) {
        // Confidence based on frequency
        const frequency = tokens.filter(t => t === variant).length;
        const confidence = Math.min(1, 0.5 + frequency * 0.1);

        foundSkills.push({
          skill: mainSkill,
          matched: variant,
          confidence: Number(confidence.toFixed(2))
        });

        break;
      }
    }
  }

  return foundSkills;
}

/* -----------------------------
   EDUCATION EXTRACTION
------------------------------*/
function extractEducation(text) {
  const doc = nlp(text);

  const degrees = [];
  const patterns = ["bca", "btech", "mca", "msc", "bsc", "be"];

  patterns.forEach(degree => {
    if (text.toLowerCase().includes(degree)) {
      degrees.push(degree.toUpperCase());
    }
  });

  return degrees;
}

/* -----------------------------
   EXPERIENCE EXTRACTION
------------------------------*/
function extractExperience(text) {
  const regex = /(\d+)\+?\s*(years?|yrs?)/gi;
  const matches = text.match(regex);

  return matches || [];
}

/* -----------------------------
   PROJECT EXTRACTION
------------------------------*/
function extractProjects(text) {
  const sentences = nlp(text).sentences().out("array");

  return sentences.filter(sentence =>
    sentence.toLowerCase().includes("project")
  );
}

/* -----------------------------
   MAIN FUNCTION
------------------------------*/
async function extractResumeData(filePath, originalName) {
  const rawText = await readResumeText(filePath, originalName);
  const resumeText = normalizeText(rawText);

  const skills = extractSkills(resumeText);
  const education = extractEducation(resumeText);
  const experience = extractExperience(resumeText);
  const projects = extractProjects(resumeText);

  return {
    resumeText,
    skills,
    education,
    experience,
    projects
  };
}

module.exports = {
  extractResumeData
};