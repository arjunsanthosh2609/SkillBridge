require("dotenv").config();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const Tesseract = require("tesseract.js"); // Added for OCR
const PDFDocument = require("pdfkit"); // Added for Resume PDF

const {
  initDb,
  createUser,
  findUserByEmail,
  getUserById,
  updateUser,
  saveExamAttempt,
  getLatestExamAttemptByUserId,
  saveRoadmap,
  getLatestRoadmapByUserId,
  createRememberToken,
  getRememberToken,
  deleteRememberToken,
  deleteExpiredRememberTokens,
  saveResumeSuggestion,
  getLatestSuggestionByUserId,
  updateResumeText
} = require("./src/db");

const { extractResumeData, extractResumeInsightsFromText } = require("./src/services/resumeParser");
const { getTrendingSkills, generateExam, generateRoadmap } = require("./src/services/llmService");
const { initializeKnowledgeBase, retrieveKnowledgeContext, syncUserKnowledgeBase } = require("./src/services/knowledgeBase");
const { analyzeResume } = require("./src/services/suggestionService");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '10.112.80.138'; // Use your actual Wi-Fi IP for mobile connectivity
const uploadDir = path.join(__dirname, "uploads");
const REMEMBER_COOKIE = "skillbridge_auth";
const REMEMBER_DAYS = 30;

// Temporary storage for mobile uploads/sync
const pendingScans = {};

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

initDb();
deleteExpiredRememberTokens().catch(() => {});
initializeKnowledgeBase().catch((err) => console.error("Knowledge base init failed:", err.message));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: "7d",
  etag: true
}));
app.use(session({
  secret: process.env.SESSION_SECRET || "skillbridge-dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 }
}));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const GOALS = [
  "Frontend Developer", "Backend Developer", "Full Stack Developer", 
  "Data Analyst", "Data Scientist", "Machine Learning Engineer", 
  "Cloud Engineer", "Cybersecurity Analyst", "UI/UX Designer", "Product Manager"
];

// --- AUTH & FORMATTING HELPERS ---

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect("/signup");
  next();
}

function buildExamSummary(score) {
  if (score >= 80) return "Advanced";
  if (score >= 50) return "Intermediate";
  return "Beginner";
}

function formatExamAttempt(row) {
  if (!row) return null;
  return {
    score: row.score,
    level: row.level,
    answers: JSON.parse(row.answers_json || "[]")
  };
}

function normalizeResumeSkills(rawSkills) {
  if (!Array.isArray(rawSkills)) return [];
  return rawSkills.map(skill => {
    if (typeof skill === "string") return skill.trim();
    if (skill && typeof skill === "object") {
      return (skill.skill || skill.matched || "").trim();
    }
    return "";
  }).filter(Boolean);
}

async function syncKnowledgeFromResume({ userId, userName, goal, resumeText, parsedResumeData, fallbackSkills = [] }) {
  const resumeData = parsedResumeData || extractResumeInsightsFromText(resumeText || "", fallbackSkills);
  await syncUserKnowledgeBase({
    userId,
    userName,
    goal,
    resumeData
  });
}

// --- REMEMBER ME COOKIE LOGIC ---

function getCookieValue(req, name) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.split(";").map(p => p.trim()).find(p => p.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

async function issueRememberMeToken(res, userId) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + REMEMBER_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await createRememberToken({ userId, tokenHash, expiresAt });
  res.cookie(REMEMBER_COOKIE, rawToken, { httpOnly: true, sameSite: "lax", maxAge: REMEMBER_DAYS * 24 * 60 * 60 * 1000 });
}

// --- MOBILE OCR ROUTES ---

app.get('/mobile-upload-page', (req, res) => {
  const sessionId = req.query.id;
  if (!sessionId) return res.status(400).send("Invalid Session ID");
  res.render("mobile_upload_form", { sessionId });
});

app.post('/extract-skills', async (req, res) => {
  try {
    const { image, sessionId } = req.body;
    if (!image || !sessionId) return res.status(400).json({ success: false });
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const { data: { text } } = await Tesseract.recognize(Buffer.from(base64Data, 'base64'), 'eng');
    
    const skillBank = ['Java', 'Python', 'C', 'JavaScript', 'HTML', 'CSS', 'Node.js', 'React', 'SQL', 'Linux'];
    const extracted = skillBank.filter(s => new RegExp(`\\b${s.replace('.', '\\.')}\\b`, 'i').test(text));
    const finalSkills = extracted.length > 0 ? extracted.join(', ') : "Skills Scanned";

    pendingScans[sessionId] = { status: 'completed', skills: finalSkills };
    setTimeout(() => { delete pendingScans[sessionId]; }, 300000);
    res.json({ success: true, skills: finalSkills });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/check-scan/:sessionId', (req, res) => {
  const scan = pendingScans[req.params.sessionId];
  if (scan && scan.status === 'completed') {
    res.json(scan);
    return;
  }
  res.json({ status: 'pending' });
});

// --- AUTH MIDDLEWARE (REMEMBER ME) ---

app.use(async (req, _res, next) => {
  if (req.session.userId) return next();
  const rawToken = getCookieValue(req, REMEMBER_COOKIE);
  if (!rawToken) return next();
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const savedToken = await getRememberToken(tokenHash);
  if (savedToken) req.session.userId = savedToken.user_id;
  next();
});

// --- MAIN ROUTES ---

app.get("/", (req, res) => req.session.userId ? res.redirect("/home") : res.redirect("/signup"));

app.get("/signup", (req, res) => res.render("signup", { goals: GOALS, error: null, formData: {} }));

app.get("/login", (_req, res) => res.render("login", { error: null, formData: {} }));

app.post("/signup", upload.single("resume"), async (req, res) => {
    const formData = { ...req.body };
    try {
        const mobileSkillsRaw = req.body.mobileScannedSkills || "";
        if (!req.file && !mobileSkillsRaw) throw new Error("Please upload a resume or use mobile scan.");
        
        if (req.body.password !== req.body.confirmPassword) throw new Error("Passwords do not match.");

        let finalSkills = [];
        let extractedText = "";
        let parsedResumeData = null;

        if (req.file) {
            const data = await extractResumeData(req.file.path, req.file.originalname);
            finalSkills = normalizeResumeSkills(data.skills);
            extractedText = data.resumeText || data.text || "File upload content";
            parsedResumeData = data;
        }

        if (mobileSkillsRaw) {
            const mSkills = mobileSkillsRaw.split(",").map(s => s.trim()).filter(Boolean);
            finalSkills = [...new Set([...finalSkills, ...mSkills])];
            if (!extractedText) extractedText = "OCR Extraction: " + mobileSkillsRaw;
            if (!parsedResumeData) {
              parsedResumeData = extractResumeInsightsFromText(extractedText, mSkills);
            }
        }

        const newUser = await createUser({
            ...formData,
            passwordHash: await bcrypt.hash(req.body.password, 10),
            resumeFilename: req.file ? req.file.filename : "mobile-scan.png",
            resumeText: extractedText || "No text available",
            resumeSkills: JSON.stringify(finalSkills)
        });

        await syncKnowledgeFromResume({
          userId: newUser.id,
          userName: newUser.full_name,
          goal: newUser.goal,
          resumeText: extractedText,
          parsedResumeData,
          fallbackSkills: finalSkills
        });

        req.session.userId = newUser.id;
        await issueRememberMeToken(res, newUser.id);
        res.redirect("/home");
    } catch (error) {
        res.status(400).render("signup", { goals: GOALS, error: error.message, formData });
    }
});

app.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const user = await findUserByEmail(email);
    if (!user || !(await bcrypt.compare(req.body.password, user.password_hash))) {
      throw new Error("Invalid credentials.");
    }
    req.session.userId = user.id;
    await issueRememberMeToken(res, user.id);
    res.redirect("/home");
  } catch (error) {
    res.status(400).render("login", { error: error.message, formData: req.body });
  }
});

app.get("/home", requireAuth, async (req, res) => {
  const user = await getUserById(req.session.userId);
  const resumeSkills = JSON.parse(user.resume_skills || "[]");
  const [trendingSkills, latestExam, latestRoadmap] = await Promise.all([
    getTrendingSkills({ goal: user.goal, skills: resumeSkills }),
    getLatestExamAttemptByUserId(req.session.userId),
    getLatestRoadmapByUserId(req.session.userId)
  ]);

  res.render("home", {
    user,
    resumeSkills,
    trendingSkills,
    examResult: formatExamAttempt(latestExam),
    hasRoadmap: !!latestRoadmap
  });
});

// --- REMAINING ROUTES (Exam, Roadmap, PDF, Suggestion) ---
// Note: Keep your existing /exam, /roadmap, /resume-suggestions, and /generate-pdf routes exactly as they were.

app.get("/logout", async (req, res) => {
  const rawToken = getCookieValue(req, REMEMBER_COOKIE);
  if (rawToken) {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await deleteRememberToken(tokenHash);
  }
  res.clearCookie(REMEMBER_COOKIE);
  req.session.destroy(() => res.redirect("/login"));
});

app.get("/profile", requireAuth, async (req, res) => {
  const user = await getUserById(req.session.userId);
  res.render("profile", {
    user,
    goals: GOALS,
    error: null,
    success: null,
    formData: {
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      education: user.education,
      location: user.location,
      experienceYears: user.experience_years,
      goal: user.goal,
      resumeText: user.resume_text,
      resumeSkills: normalizeResumeSkills(JSON.parse(user.resume_skills || "[]")).join(", ")
    }
  });
});

app.post("/profile", requireAuth, async (req, res) => {
  const currentUser = await getUserById(req.session.userId);
  const formData = {
    fullName: req.body.fullName || "",
    email: req.body.email || "",
    phone: req.body.phone || "",
    education: req.body.education || "",
    location: req.body.location || "",
    experienceYears: req.body.experienceYears || "",
    goal: req.body.goal || "",
    resumeText: req.body.resumeText || "",
    resumeSkills: req.body.resumeSkills || ""
  };

  try {
    const requiredFields = ["fullName", "email", "phone", "education", "location", "experienceYears", "goal", "resumeText", "resumeSkills"];
    const missingField = requiredFields.find((field) => !String(req.body[field] || "").trim());
    if (missingField) {
      throw new Error("Please complete all profile fields before saving.");
    }

    const email = req.body.email.trim().toLowerCase();
    const existingUser = await findUserByEmail(email);
    if (existingUser && existingUser.id !== currentUser.id) {
      throw new Error("That email is already being used by another account.");
    }

    const normalizedSkills = req.body.resumeSkills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    await updateUser({
      id: currentUser.id,
      fullName: req.body.fullName.trim(),
      email,
      phone: req.body.phone.trim(),
      education: req.body.education.trim(),
      location: req.body.location.trim(),
      experienceYears: Number(req.body.experienceYears),
      goal: req.body.goal.trim(),
      resumeText: req.body.resumeText.trim(),
      resumeSkills: JSON.stringify(normalizedSkills)
    });

    const user = await getUserById(currentUser.id);
    await syncKnowledgeFromResume({
      userId: user.id,
      userName: user.full_name,
      goal: user.goal,
      resumeText: user.resume_text,
      fallbackSkills: normalizedSkills
    });
    req.session.resumeSkills = normalizedSkills;

    return res.render("profile", {
      user,
      goals: GOALS,
      error: null,
      success: "Your profile has been updated successfully.",
      formData: {
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        education: user.education,
        location: user.location,
        experienceYears: user.experience_years,
        goal: user.goal,
        resumeText: user.resume_text,
        resumeSkills: normalizeResumeSkills(JSON.parse(user.resume_skills || "[]")).join(", ")
      }
    });
  } catch (error) {
    return res.status(400).render("profile", {
      user: currentUser,
      goals: GOALS,
      error: error.message,
      success: null,
      formData
    });
  }
});

app.get("/exam", requireAuth, async (req, res) => {
  const user = await getUserById(req.session.userId);
  const resumeSkills = normalizeResumeSkills(JSON.parse(user.resume_skills || "[]"));
  const examQuestions = await generateExam({ goal: user.goal, skills: resumeSkills });
  req.session.examQuestions = examQuestions;

  res.render("exam", {
    user,
    resumeSkills,
    questions: examQuestions,
    error: null
  });
});

app.post("/exam", requireAuth, async (req, res) => {
  const questions = req.session.examQuestions || [];
  const user = await getUserById(req.session.userId);
  const resumeSkills = normalizeResumeSkills(JSON.parse(user.resume_skills || "[]"));

  if (!questions.length) {
    return res.redirect("/exam");
  }

  let correctCount = 0;
  const answers = questions.map((question, index) => {
    const chosen = Number(req.body[`question_${index}`]);
    const isCorrect = chosen === question.correctOption;
    if (isCorrect) correctCount += 1;

    return {
      question: question.question,
      selectedOption: Number.isNaN(chosen) ? null : chosen,
      correctOption: question.correctOption,
      isCorrect
    };
  });

  const score = Math.round((correctCount / questions.length) * 100);
  const level = buildExamSummary(score);
  const result = { score, level, answers };

  await saveExamAttempt({
    userId: req.session.userId,
    score,
    level,
    answersJson: JSON.stringify(answers)
  });

  req.session.examResult = result;
  req.session.examQuestions = null;

  return res.redirect("/home");
});

app.get("/roadmap", requireAuth, async (req, res) => {
  const forceRefresh = req.query.refresh === "1";
  const latestExamAttempt = await getLatestExamAttemptByUserId(req.session.userId);
  const examResult = formatExamAttempt(latestExamAttempt);
  if (!examResult) {
    return res.redirect("/home");
  }

  const user = await getUserById(req.session.userId);
  const resumeSkills = normalizeResumeSkills(JSON.parse(user.resume_skills || "[]"));
  const knowledgeContext = await retrieveKnowledgeContext({
    userId: req.session.userId,
    goal: user.goal,
    skills: resumeSkills
  });
  const roadmap = await generateRoadmap({
    goal: user.goal,
    skills: resumeSkills,
    skillLevel: examResult.level,
    score: examResult.score,
    knowledgeContext,
    forceRefresh
  });

  await saveRoadmap({
    userId: req.session.userId,
    headline: roadmap.headline,
    summary: roadmap.summary,
    phasesJson: JSON.stringify(roadmap.phases || []),
    contextJson: JSON.stringify({
      datasetSuggestions: roadmap.datasetSuggestions || [],
      knowledgeBase: roadmap.knowledgeBase || {}
    })
  });

  res.render("roadmap", {
    user,
    resumeSkills,
    examResult,
    roadmap,
    isSavedRoadmap: false
  });
});

app.get("/roadmap/progress", requireAuth, async (req, res) => {
  const user = await getUserById(req.session.userId);
  const resumeSkills = normalizeResumeSkills(JSON.parse(user.resume_skills || "[]"));
  const latestExamAttempt = await getLatestExamAttemptByUserId(req.session.userId);
  const latestRoadmap = await getLatestRoadmapByUserId(req.session.userId);

  if (!latestRoadmap) {
    return res.redirect("/home");
  }

  res.render("roadmap", {
    user,
    resumeSkills,
    examResult: formatExamAttempt(latestExamAttempt),
    roadmap: {
      headline: latestRoadmap.headline,
      summary: latestRoadmap.summary,
      phases: JSON.parse(latestRoadmap.phases_json || "[]"),
      ...(JSON.parse(latestRoadmap.context_json || "{}"))
    },
    isSavedRoadmap: true
  });
});

app.use((err, _req, res, _next) => {
  res.status(400).render("signup", {
    goals: GOALS,
    error: err.message || "Something went wrong.",
    formData: {}
  });
});



// ROUTE: GENERATE SUGGESTIONS
app.post("/resume-suggestions", requireAuth, async (req, res) => {

    try {
        const user = await getUserById(req.session.userId);

        if (!user.resume_text) {
            return res.status(400).json({ message: "Resume text missing" });
        }
        
        // Handle cases where skills might not be parsed yet
        let resumeSkills = [];
        try {
            resumeSkills = JSON.parse(user.resume_skills || "[]");
        } catch (e) {
            resumeSkills = user.resume_skills ? user.resume_skills.split(',') : [];
        }
        
        // 1. Trigger the Analytical Pipeline
        const analysis = await analyzeResume(
            user.resume_text, 
            user.goal, 
            resumeSkills
        );

        // 2. Save to RESUME_SUGGESTION table
        await saveResumeSuggestion({
            userId: user.id,
            atsScore: analysis.atsScore,
            targetRole: user.goal,
            suggestionJson: JSON.stringify({
                // Explicitly map these to match the /resume-report expectations
                missingKeywords: analysis.report.missingKeywords || [],
                rewrittenPoints: analysis.report.rewrittenPoints || [],
                formattedResume: analysis.formattedResume || user.resume_text,
                atsScore: analysis.atsScore 
            })
        });

        // 3. Redirect to the report page where the editor and download buttons are located
        res.redirect("/resume-report"); 

    } catch (error) {
        console.error("Suggestion Module Error:", error);
        res.status(500).json({ success: false, message: "Pipeline failed." });
    }
});

// ROUTE: VIEW REPORT
app.get("/resume-report", requireAuth, async (req, res) => {
    const user = await getUserById(req.session.userId);
    const report = await getLatestSuggestionByUserId(req.session.userId);

    let parsedData = {
        missingKeywords: [],
        rewrittenPoints: [],
        formattedResume: user.resume_text // Use the user's current resume as the default
    };

    if (report && report.suggestions_json) {
        try {
            const data = JSON.parse(report.suggestions_json);
            parsedData = {
                score: report.ats_score,
                missingKeywords: data.missingKeywords || [],
                rewrittenPoints: data.rewrittenPoints || [],
                // Ensure we prefer the AI-formatted resume if it exists
                formattedResume: data.formattedResume || user.resume_text 
            };
        } catch (err) {
            console.error("JSON Parse Error:", err);
        }
    }

    res.render("resume-report", {
        user,
        report: parsedData
    });
});

function parseResumeText(resumeText) {
  const lines = resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line);

  const headerName = lines[0] || "Your Name";
  const headerContact = lines[1] || "Email | Phone | LinkedIn";
  const bodyLines = lines.slice(2);

  const sectionHeadings = ["SUMMARY", "PROFILE", "EXPERIENCE", "EDUCATION", "SKILLS", "CERTIFICATIONS", "PROJECTS", "ACHIEVEMENTS", "CONTACT", "CAREER OBJECTIVE", "TECHNICAL SKILLS", "EDUCATIONAL QUALIFICATION", "PROJECTS / EXPERIENCE", "LANGUAGES"];
  const sections = {};
  let currentSection = "SUMMARY";
  let currentContent = [];

  bodyLines.forEach((line) => {
    const isSectionHeading = sectionHeadings.some((heading) => line.toUpperCase().startsWith(heading)) || line.endsWith(":");
    if (isSectionHeading) {
      if (currentContent.length > 0) {
        sections[currentSection] = currentContent;
      }
      currentSection = line.replace(/[:\s]+$/, "").trim().toUpperCase();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  });

  if (currentContent.length > 0) {
    sections[currentSection] = currentContent;
  }

  // Join non-bulleted sections into paragraphs
  for (const section in sections) {
    const items = sections[section];
    const hasBullets = items.some(item => item.match(/^([•*\-]|\d+\.)\s*/));
    if (!hasBullets && items.length > 1) {
      sections[section] = [items.join('\n')];
    }
  }

  const sectionOrder = ["SUMMARY", "PROFILE", "EXPERIENCE", "EDUCATION", "SKILLS", "CERTIFICATIONS", "PROJECTS", "ACHIEVEMENTS"];
  const orderedSectionNames = [
    ...sectionOrder.filter((name) => sections[name] && sections[name].length > 0),
    ...Object.keys(sections).filter((name) => !sectionOrder.includes(name) && sections[name].length > 0)
  ];

  return { headerName, headerContact, sections, orderedSectionNames };
}

async function htmlToPdf(html) {
  let puppeteer;
  try {
    puppeteer = require("puppeteer");
  } catch (err) {
    return null;
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const buffer = await page.pdf({
    format: "letter",
    printBackground: true,
    margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" }
  });
  await browser.close();
  return buffer;
}

function renderPdfResume(doc, headerName, headerContact, sections, orderedSectionNames) {
  doc.fontSize(18).text(headerName, { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).text(headerContact, { align: 'center' });
  doc.moveDown(2);

  orderedSectionNames.forEach((sectionName) => {
    doc.fontSize(12).text(sectionName, { underline: true });
    doc.moveDown();
    const items = sections[sectionName] || [];
    items.forEach((item) => {
      if (item.startsWith('•')) {
        doc.fontSize(10).text('  ' + item);
      } else {
        doc.fontSize(10).text(item);
      }
      doc.moveDown(0.5);
    });
    doc.moveDown();
  });
}

app.post("/generate-pdf", requireAuth, async (req, res) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({ success: false, message: "Resume text is empty" });
    }

    const resumeData = parseResumeText(resumeText);
    const html = await new Promise((resolve, reject) => {
      app.render("resume-template", resumeData, (err, renderedHtml) => {
        if (err) return reject(err);
        resolve(renderedHtml);
      });
    });

    const pdfBuffer = await htmlToPdf(html);
    if (pdfBuffer) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=SkillBridge_Resume.pdf");
      return res.send(pdfBuffer);
    }

    const { headerName, headerContact, sections, orderedSectionNames } = resumeData;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=SkillBridge_Resume.pdf");

    const doc = new PDFDocument({
      size: "LETTER",
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });
    doc.pipe(res);
    renderPdfResume(doc, headerName, headerContact, sections, orderedSectionNames);
    doc.end();
  } catch (error) {
    console.error("PDF Generation Error:", error);
    res.status(500).json({ success: false, message: "Error generating PDF: " + error.message });
  }
});

// SAVE EDITED RESUME
app.post("/save-edited-resume", requireAuth, async (req, res) => {
    try {
        const { editedText } = req.body;
        // USE THE SPECIFIC HELPER INSTEAD OF THE GENERAL updateUser
        await updateResumeText(req.session.userId, editedText);
        const user = await getUserById(req.session.userId);
        await syncKnowledgeFromResume({
          userId: user.id,
          userName: user.full_name,
          goal: user.goal,
          resumeText: editedText,
          fallbackSkills: normalizeResumeSkills(JSON.parse(user.resume_skills || "[]"))
        });
        res.json({ success: true });
    } catch (error) {
        console.error("Save Resume Error:", error);
        res.status(500).json({ success: false });
    }
});

// --- SERVER START ---

function startServer(port, attemptsLeft = 10) {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`SkillBridge running at http://${HOST}:${port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      startServer(port + 1, attemptsLeft - 1);
      return;
    }
    throw error;
  });
}

startServer(PORT);
