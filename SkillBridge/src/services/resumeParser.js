const fs = require("fs/promises");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const natural = require("natural");
const Tesseract = require("tesseract.js");

const tokenizer = new natural.WordTokenizer();

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
  powerbi: ["power bi", "powerbi"],
  ml: ["machine learning", "ml"],
  nlp: ["nlp", "natural language processing"]
};

const SECTION_ALIASES = {
  summary: "summary",
  profile: "summary",
  objective: "summary",
  "career objective": "summary",
  "professional summary": "summary",
  skills: "skills",
  "technical skills": "skills",
  "core skills": "skills",
  experience: "experience",
  "work experience": "experience",
  "professional experience": "experience",
  employment: "experience",
  education: "education",
  "educational qualification": "education",
  projects: "projects",
  "project experience": "projects",
  certifications: "certifications",
  certification: "certifications",
  certificates: "certifications",
  courses: "courses",
  coursework: "courses",
  achievements: "achievements",
  accomplishment: "achievements",
  accomplishments: "achievements",
  awards: "achievements"
};

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

  if ([".png", ".jpg", ".jpeg", ".webp", ".bmp"].includes(ext)) {
    const {
      data: { text }
    } = await Tesseract.recognize(filePath, "eng");
    return text;
  }

  return fs.readFile(filePath, "utf8");
}

function normalizeResumeText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\t/g, " ").replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function flattenText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function normalizeSectionHeading(line) {
  return String(line || "")
    .toLowerCase()
    .replace(/[^a-z/& ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyHeading(line) {
  const clean = String(line || "").trim();
  if (!clean) return false;

  const normalized = normalizeSectionHeading(clean.replace(/:$/, ""));
  if (SECTION_ALIASES[normalized]) return true;

  const shortLine = clean.length <= 40;
  const mostlyUppercase = clean === clean.toUpperCase() && /[A-Z]/.test(clean);
  return shortLine && mostlyUppercase && !!SECTION_ALIASES[normalized];
}

function parseResumeSections(text) {
  const lines = String(text || "")
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sections = {
    summary: [],
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    courses: [],
    achievements: []
  };

  let currentSection = "summary";

  for (const line of lines) {
    const normalized = normalizeSectionHeading(line.replace(/:$/, ""));
    if (isLikelyHeading(line)) {
      currentSection = SECTION_ALIASES[normalized] || currentSection;
      continue;
    }

    sections[currentSection].push(line);
  }

  return sections;
}

function normalizeList(lines) {
  return Array.from(new Set(
    (Array.isArray(lines) ? lines : [])
      .flatMap((line) => String(line || "").split(/[•\u2022]/))
      .flatMap((line) => line.split(/\s{2,}|(?<=,)\s*/))
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean)
  ));
}

function extractSkills(text, sectionLines = []) {
  const searchableText = `${flattenText(text)} ${sectionLines.join(" ")}`.toLowerCase();
  const tokens = tokenizer.tokenize(searchableText);
  const foundSkills = [];

  for (const [mainSkill, variants] of Object.entries(SKILL_MAP)) {
    for (const variant of variants) {
      const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");

      if (regex.test(searchableText)) {
        const frequency = tokens.filter((token) => token === variant).length;
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

  const sectionSkills = normalizeList(sectionLines)
    .flatMap((item) => item.split(/[|,/]/))
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((item) => ({ skill: item, matched: item, confidence: 0.7 }));

  const merged = new Map();
  [...foundSkills, ...sectionSkills].forEach((item) => {
    if (!merged.has(item.skill)) {
      merged.set(item.skill, item);
    }
  });

  return Array.from(merged.values());
}

function extractEducation(text, sectionLines = []) {
  const lines = normalizeList(sectionLines);
  if (lines.length) return lines;

  const matches = flattenText(text).match(/\b(BCA|B\.Tech|BTech|MCA|M\.Sc|MSc|B\.Sc|BSc|BE|B\.E|MBA|M\.Tech|MTech)\b/gi) || [];
  return Array.from(new Set(matches.map((item) => item.toUpperCase())));
}

function extractExperience(text, sectionLines = []) {
  const lines = normalizeList(sectionLines);
  if (lines.length) return lines;

  const matches = flattenText(text).match(/(\d+)\+?\s*(years?|yrs?)[^.,;]*/gi) || [];
  return Array.from(new Set(matches));
}

function extractProjects(sectionLines = []) {
  return normalizeList(sectionLines);
}

function extractNamedItems(sectionLines = []) {
  return normalizeList(sectionLines);
}

function extractResumeInsightsFromText(rawText, skillOverrides = []) {
  const resumeText = normalizeResumeText(rawText);
  const sections = parseResumeSections(resumeText);
  const skills = extractSkills(resumeText, sections.skills);
  const normalizedOverrideSkills = (Array.isArray(skillOverrides) ? skillOverrides : [])
    .map((skill) => String(skill || "").trim())
    .filter(Boolean);

  const mergedSkills = new Map(skills.map((item) => [item.skill, item]));
  normalizedOverrideSkills.forEach((skill) => {
    const key = skill.toLowerCase();
    if (!mergedSkills.has(key)) {
      mergedSkills.set(key, {
        skill: key,
        matched: skill,
        confidence: 0.85
      });
    }
  });

  return {
    text: resumeText,
    resumeText,
    skills: Array.from(mergedSkills.values()),
    education: extractEducation(resumeText, sections.education),
    experience: extractExperience(resumeText, sections.experience),
    projects: extractProjects(sections.projects),
    certifications: extractNamedItems(sections.certifications),
    courses: extractNamedItems(sections.courses),
    achievements: extractNamedItems(sections.achievements),
    sections
  };
}

async function extractResumeData(filePath, originalName) {
  const rawText = await readResumeText(filePath, originalName);
  return extractResumeInsightsFromText(rawText);
}

module.exports = {
  extractResumeData,
  extractResumeInsightsFromText
};
