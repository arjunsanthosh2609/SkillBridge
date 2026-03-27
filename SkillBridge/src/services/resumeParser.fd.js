const fs = require("fs/promises");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const SKILL_KEYWORDS = [
  "html",
  "css",
  "javascript",
  "typescript",
  "react",
  "next.js",
  "node.js",
  "express",
  "mongodb",
  "mysql",
  "postgresql",
  "sql",
  "python",
  "java",
  "c++",
  "c#",
  "aws",
  "azure",
  "docker",
  "kubernetes",
  "git",
  "github",
  "tailwind",
  "figma",
  "power bi",
  "excel",
  "tableau",
  "pandas",
  "numpy",
  "scikit-learn",
  "tensorflow",
  "pytorch",
  "nlp",
  "data analysis",
  "machine learning",
  "api",
  "rest",
  "graphql",
  "linux",
  "firebase",
  "testing",
  "problem solving",
  "communication",
  "leadership"
];

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function extractSkillsFromText(text) {
  const normalizedText = text.toLowerCase();
  return SKILL_KEYWORDS.filter((skill) => normalizedText.includes(skill.toLowerCase()));
}

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

async function extractResumeData(filePath, originalName) {
  const rawText = await readResumeText(filePath, originalName);
  const resumeText = normalizeText(rawText);
  const skills = extractSkillsFromText(resumeText);

  return {
    resumeText,
    skills
  };
}

module.exports = {
  extractResumeData
};
