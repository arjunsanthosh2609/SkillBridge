const {
  upsertKnowledgeDocument,
  deleteKnowledgeDocumentsByUserId,
  getKnowledgeDocumentsByUserId
} = require("../db");

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
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

async function initializeKnowledgeBase() {
  return;
}

function buildUserKnowledgeDocuments({ userId, userName, goal, resumeData }) {
  const roleTarget = normalizeRole(goal);
  const skills = Array.isArray(resumeData.skills)
    ? resumeData.skills.map((skill) => typeof skill === "string" ? skill : skill.skill || skill.matched || "").filter(Boolean)
    : [];

  const sections = [
    {
      docType: "user_profile",
      title: `${userName || "User"} skill profile`,
      summary: skills.length ? `Current resume skills: ${skills.join(", ")}.` : "Resume skill profile extracted from the user's resume.",
      tags: ["user-profile", "resume", "skills"],
      sectionItems: skills
    },
    {
      docType: "user_projects",
      title: `${userName || "User"} projects`,
      summary: resumeData.projects && resumeData.projects.length
        ? `Projects extracted from the resume: ${resumeData.projects.slice(0, 4).join("; ")}.`
        : "Projects extracted from the user's resume.",
      tags: ["user-profile", "resume", "projects"],
      sectionItems: resumeData.projects || []
    },
    {
      docType: "user_experience",
      title: `${userName || "User"} work experience`,
      summary: resumeData.experience && resumeData.experience.length
        ? `Work experience extracted from the resume: ${resumeData.experience.slice(0, 4).join("; ")}.`
        : "Work experience extracted from the user's resume.",
      tags: ["user-profile", "resume", "experience"],
      sectionItems: resumeData.experience || []
    },
    {
      docType: "user_education",
      title: `${userName || "User"} education`,
      summary: resumeData.education && resumeData.education.length
        ? `Education extracted from the resume: ${resumeData.education.slice(0, 4).join("; ")}.`
        : "Education extracted from the user's resume.",
      tags: ["user-profile", "resume", "education"],
      sectionItems: resumeData.education || []
    },
    {
      docType: "user_certifications",
      title: `${userName || "User"} certifications`,
      summary: resumeData.certifications && resumeData.certifications.length
        ? `Certifications extracted from the resume: ${resumeData.certifications.slice(0, 4).join("; ")}.`
        : "Certifications extracted from the user's resume.",
      tags: ["user-profile", "resume", "certifications"],
      sectionItems: resumeData.certifications || []
    },
    {
      docType: "user_courses",
      title: `${userName || "User"} courses`,
      summary: resumeData.courses && resumeData.courses.length
        ? `Courses extracted from the resume: ${resumeData.courses.slice(0, 4).join("; ")}.`
        : "Courses extracted from the user's resume.",
      tags: ["user-profile", "resume", "courses"],
      sectionItems: resumeData.courses || []
    },
    {
      docType: "user_achievements",
      title: `${userName || "User"} achievements`,
      summary: resumeData.achievements && resumeData.achievements.length
        ? `Achievements extracted from the resume: ${resumeData.achievements.slice(0, 4).join("; ")}.`
        : "Achievements extracted from the user's resume.",
      tags: ["user-profile", "resume", "achievements"],
      sectionItems: resumeData.achievements || []
    }
  ];

  return sections.map((section) => ({
    ownerUserId: userId,
    docType: section.docType,
    provider: "SkillBridge Resume Parser",
    title: section.title,
    sourceUrl: `skillbridge://user/${userId}/${section.docType}`,
    roleTarget,
    summary: section.summary,
    skills,
    tags: section.tags,
    metadata: {
      sourceType: "user-resume",
      userId,
      userName: userName || "",
      goal: goal || "",
      items: section.sectionItems
    }
  }));
}

async function syncUserKnowledgeBase({ userId, userName, goal, resumeData }) {
  if (!userId || !resumeData) {
    return;
  }

  await deleteKnowledgeDocumentsByUserId(userId);
  const documents = buildUserKnowledgeDocuments({ userId, userName, goal, resumeData });

  for (const document of documents) {
    await upsertKnowledgeDocument(document);
  }
}

function buildUserProfile(userDocuments) {
  const sectionMap = {
    user_profile: "skills",
    user_projects: "projects",
    user_experience: "experience",
    user_education: "education",
    user_certifications: "certifications",
    user_courses: "courses",
    user_achievements: "achievements"
  };

  const profile = {
    skills: [],
    projects: [],
    experience: [],
    education: [],
    certifications: [],
    courses: [],
    achievements: []
  };

  for (const document of userDocuments) {
    const sectionName = sectionMap[document.doc_type];
    if (!sectionName) continue;

    const metadata = JSON.parse(document.metadata_json || "{}");
    const items = Array.isArray(metadata.items) ? metadata.items : [];
    profile[sectionName] = items.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return profile;
}

async function retrieveKnowledgeContext({ userId }) {
  const userDocuments = userId ? await getKnowledgeDocumentsByUserId(userId) : [];

  return {
    userProfile: buildUserProfile(userDocuments)
  };
}

module.exports = {
  initializeKnowledgeBase,
  syncUserKnowledgeBase,
  retrieveKnowledgeContext
};
