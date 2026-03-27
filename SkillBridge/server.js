require("dotenv").config();

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const bcrypt = require("bcryptjs");

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
  deleteExpiredRememberTokens
} = require("./src/db");
const { extractResumeData } = require("./src/services/resumeParser");
const { getTrendingSkills, generateExam, generateRoadmap } = require("./src/services/llmService");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const uploadDir = path.join(__dirname, "uploads");
const REMEMBER_COOKIE = "skillbridge_auth";
const REMEMBER_DAYS = 30;

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

initDb();
deleteExpiredRememberTokens().catch(() => {});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "skillbridge-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 }
  })
);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeBase = file.originalname.replace(/\s+/g, "-").toLowerCase();
    cb(null, `${Date.now()}-${safeBase}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = [".pdf", ".docx", ".txt"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      cb(new Error("Only PDF, DOCX, and TXT resumes are supported."));
      return;
    }
    cb(null, true);
  }
});

const GOALS = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Analyst",
  "Data Scientist",
  "Machine Learning Engineer",
  "Cloud Engineer",
  "Cybersecurity Analyst",
  "UI/UX Designer",
  "Product Manager"
];

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/signup");
  }
  next();
}

function buildExamSummary(score) {
  if (score >= 80) return "Advanced";
  if (score >= 50) return "Intermediate";
  return "Beginner";
}

function formatExamAttempt(row) {
  if (!row) {
    return null;
  }

  return {
    score: row.score,
    level: row.level,
    answers: JSON.parse(row.answers_json || "[]")
  };
}

function getCookieValue(req, name) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(";").map((part) => part.trim());
  const match = parts.find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

function clearRememberCookie(res) {
  res.clearCookie(REMEMBER_COOKIE, {
    httpOnly: true,
    sameSite: "lax"
  });
}

async function issueRememberMeToken(res, userId) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + REMEMBER_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await createRememberToken({
    userId,
    tokenHash,
    expiresAt
  });

  res.cookie(REMEMBER_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: REMEMBER_DAYS * 24 * 60 * 60 * 1000
  });
}

app.use(async (req, _res, next) => {
  if (req.session.userId) {
    return next();
  }

  const rawToken = getCookieValue(req, REMEMBER_COOKIE);
  if (!rawToken) {
    return next();
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const savedToken = await getRememberToken(tokenHash);

  if (savedToken) {
    req.session.userId = savedToken.user_id;
  }

  next();
});

app.get("/", async (req, res) => {
  if (req.session.userId) {
    return res.redirect("/home");
  }
  return res.redirect("/signup");
});

app.get("/signup", (_req, res) => {
  res.render("signup", { goals: GOALS, error: null, formData: {} });
});

app.get("/login", (_req, res) => {
  res.render("login", { error: null, formData: {} });
});

app.post("/signup", upload.single("resume"), async (req, res) => {
  const formData = {
    fullName: req.body.fullName || "",
    email: req.body.email || "",
    phone: req.body.phone || "",
    education: req.body.education || "",
    location: req.body.location || "",
    experienceYears: req.body.experienceYears || "",
    goal: req.body.goal || ""
  };

  try {
    const requiredFields = ["fullName", "email", "phone", "password", "education", "location", "experienceYears", "goal"];
    const missingField = requiredFields.find((field) => !String(req.body[field] || "").trim());
    if (missingField || !req.file) {
      throw new Error("Please complete all required fields and upload your resume.");
    }

    if (req.body.password !== req.body.confirmPassword) {
      throw new Error("Password and confirm password must match.");
    }

    const existingUser = await findUserByEmail(req.body.email.trim().toLowerCase());
    if (existingUser) {
      throw new Error("An account with that email already exists.");
    }

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const resumeData = await extractResumeData(req.file.path, req.file.originalname);

    const newUser = await createUser({
      fullName: req.body.fullName.trim(),
      email: req.body.email.trim().toLowerCase(),
      phone: req.body.phone.trim(),
      passwordHash,
      education: req.body.education.trim(),
      location: req.body.location.trim(),
      experienceYears: Number(req.body.experienceYears),
      goal: req.body.goal.trim(),
      resumeFilename: req.file.filename,
      resumeText: resumeData.resumeText,
      resumeSkills: JSON.stringify(resumeData.skills)
    });

    req.session.userId = newUser.id;
    req.session.resumeSkills = resumeData.skills;
    await issueRememberMeToken(res, newUser.id);

    return res.redirect("/home");
  } catch (error) {
    return res.status(400).render("signup", {
      goals: GOALS,
      error: error.message,
      formData
    });
  }
});

app.post("/login", async (req, res) => {
  const formData = {
    email: req.body.email || ""
  };

  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "").trim();

    if (!email || !password) {
      throw new Error("Please enter your email and password.");
    }

    const user = await findUserByEmail(email);
    if (!user) {
      throw new Error("No account was found with that email.");
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      throw new Error("Incorrect password.");
    }

    req.session.userId = user.id;
    req.session.resumeSkills = JSON.parse(user.resume_skills || "[]");
    await issueRememberMeToken(res, user.id);

    return res.redirect("/home");
  } catch (error) {
    return res.status(400).render("login", {
      error: error.message,
      formData
    });
  }
});

app.get("/home", requireAuth, async (req, res) => {
  const user = await getUserById(req.session.userId);
  const resumeSkills = JSON.parse(user.resume_skills || "[]");
  const trendingSkills = await getTrendingSkills({ goal: user.goal, skills: resumeSkills });
  const latestExamAttempt = await getLatestExamAttemptByUserId(req.session.userId);
  const latestRoadmap = await getLatestRoadmapByUserId(req.session.userId);

  res.render("home", {
    user,
    resumeSkills,
    trendingSkills,
    examResult: formatExamAttempt(latestExamAttempt),
    hasRoadmap: Boolean(latestRoadmap)
  });
});

app.get("/logout", async (req, res) => {
  const rawToken = getCookieValue(req, REMEMBER_COOKIE);
  if (rawToken) {
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await deleteRememberToken(tokenHash);
  }

  clearRememberCookie(res);
  req.session.destroy(() => {
    res.redirect("/login");
  });
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
      resumeSkills: JSON.parse(user.resume_skills || "[]").join(", ")
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
        resumeSkills: JSON.parse(user.resume_skills || "[]").join(", ")
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
  const resumeSkills = JSON.parse(user.resume_skills || "[]");
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
  const resumeSkills = JSON.parse(user.resume_skills || "[]");

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
  const latestExamAttempt = await getLatestExamAttemptByUserId(req.session.userId);
  const examResult = formatExamAttempt(latestExamAttempt);
  if (!examResult) {
    return res.redirect("/home");
  }

  const user = await getUserById(req.session.userId);
  const resumeSkills = JSON.parse(user.resume_skills || "[]");
  const roadmap = await generateRoadmap({
    goal: user.goal,
    skills: resumeSkills,
    skillLevel: examResult.level,
    score: examResult.score
  });

  await saveRoadmap({
    userId: req.session.userId,
    headline: roadmap.headline,
    summary: roadmap.summary,
    phasesJson: JSON.stringify(roadmap.phases || [])
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
  const resumeSkills = JSON.parse(user.resume_skills || "[]");
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
      phases: JSON.parse(latestRoadmap.phases_json || "[]")
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

function startServer(port, attemptsLeft = 10) {
  const server = app.listen(port, () => {
    console.log(`SkillBridge running on http://localhost:${port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      console.warn(`Port ${port} is busy. Trying ${port + 1}...`);
      startServer(port + 1, attemptsLeft - 1);
      return;
    }

    throw error;
  });
}

startServer(PORT);
