const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "..", "skillbridge.db");
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
    });
  });
}

function initDb() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        education TEXT NOT NULL,
        location TEXT NOT NULL,
        experience_years INTEGER NOT NULL,
        goal TEXT NOT NULL,
        resume_filename TEXT NOT NULL,
        resume_text TEXT NOT NULL,
        resume_skills TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS exam_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        level TEXT NOT NULL,
        answers_json TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS roadmaps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        headline TEXT NOT NULL,
        summary TEXT NOT NULL,
        phases_json TEXT NOT NULL,
        context_json TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS remember_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS knowledge_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doc_type TEXT NOT NULL,
        provider TEXT NOT NULL,
        title TEXT NOT NULL,
        source_url TEXT NOT NULL,
        role_target TEXT,
        summary TEXT NOT NULL,
        skills_json TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run("CREATE INDEX IF NOT EXISTS idx_kb_doc_type ON knowledge_documents(doc_type)");
    db.run("CREATE INDEX IF NOT EXISTS idx_kb_provider ON knowledge_documents(provider)");
    db.run("CREATE INDEX IF NOT EXISTS idx_kb_role_target ON knowledge_documents(role_target)");
    db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_source_url ON knowledge_documents(source_url)");
  });

  db.run("ALTER TABLE roadmaps ADD COLUMN context_json TEXT DEFAULT '{}'", () => {});
}

async function createUser(user) {
  const result = await run(
    `
      INSERT INTO users (
        full_name,
        email,
        phone,
        password_hash,
        education,
        location,
        experience_years,
        goal,
        resume_filename,
        resume_text,
        resume_skills
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      user.fullName,
      user.email,
      user.phone,
      user.passwordHash,
      user.education,
      user.location,
      user.experienceYears,
      user.goal,
      user.resumeFilename,
      user.resumeText,
      user.resumeSkills
    ]
  );

  return getUserById(result.lastID);
}

function findUserByEmail(email) {
  return get("SELECT * FROM users WHERE email = ?", [email]);
}

function getUserById(id) {
  return get("SELECT * FROM users WHERE id = ?", [id]);
}

function updateUser(user) {
  return run(
    `
      UPDATE users
      SET
        full_name = ?,
        email = ?,
        phone = ?,
        education = ?,
        location = ?,
        experience_years = ?,
        goal = ?,
        resume_text = ?,
        resume_skills = ?
      WHERE id = ?
    `,
    [
      user.fullName,
      user.email,
      user.phone,
      user.education,
      user.location,
      user.experienceYears,
      user.goal,
      user.resumeText,
      user.resumeSkills,
      user.id
    ]
  );
}

function saveExamAttempt({ userId, score, level, answersJson }) {
  return run(
    "INSERT INTO exam_attempts (user_id, score, level, answers_json) VALUES (?, ?, ?, ?)",
    [userId, score, level, answersJson]
  );
}

function getLatestExamAttemptByUserId(userId) {
  return get(
    "SELECT * FROM exam_attempts WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 1",
    [userId]
  );
}

function saveRoadmap({ userId, headline, summary, phasesJson, contextJson = "{}" }) {
  return run(
    "INSERT INTO roadmaps (user_id, headline, summary, phases_json, context_json) VALUES (?, ?, ?, ?, ?)",
    [userId, headline, summary, phasesJson, contextJson]
  );
}

function getLatestRoadmapByUserId(userId) {
  return get(
    "SELECT * FROM roadmaps WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 1",
    [userId]
  );
}

function upsertKnowledgeDocument(document) {
  return run(
    `
      INSERT INTO knowledge_documents (
        doc_type,
        provider,
        title,
        source_url,
        role_target,
        summary,
        skills_json,
        tags_json,
        metadata_json,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(source_url) DO UPDATE SET
        doc_type = excluded.doc_type,
        provider = excluded.provider,
        title = excluded.title,
        role_target = excluded.role_target,
        summary = excluded.summary,
        skills_json = excluded.skills_json,
        tags_json = excluded.tags_json,
        metadata_json = excluded.metadata_json,
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      document.docType,
      document.provider,
      document.title,
      document.sourceUrl,
      document.roleTarget || null,
      document.summary,
      JSON.stringify(document.skills || []),
      JSON.stringify(document.tags || []),
      JSON.stringify(document.metadata || {})
    ]
  );
}

function getKnowledgeDocumentsByType(docType) {
  return all("SELECT * FROM knowledge_documents WHERE doc_type = ? ORDER BY updated_at DESC, id DESC", [docType]);
}

function getAllKnowledgeDocuments() {
  return all("SELECT * FROM knowledge_documents ORDER BY updated_at DESC, id DESC");
}

function createRememberToken({ userId, tokenHash, expiresAt }) {
  return run(
    "INSERT INTO remember_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
    [userId, tokenHash, expiresAt]
  );
}

function getRememberToken(tokenHash) {
  return get(
    `
      SELECT remember_tokens.*, users.id as linked_user_id
      FROM remember_tokens
      JOIN users ON users.id = remember_tokens.user_id
      WHERE token_hash = ?
        AND datetime(expires_at) > datetime('now')
      ORDER BY id DESC
      LIMIT 1
    `,
    [tokenHash]
  );
}

function deleteRememberToken(tokenHash) {
  return run("DELETE FROM remember_tokens WHERE token_hash = ?", [tokenHash]);
}

function deleteExpiredRememberTokens() {
  return run("DELETE FROM remember_tokens WHERE datetime(expires_at) <= datetime('now')");
}

module.exports = {
  initDb,
  createUser,
  findUserByEmail,
  getUserById,
  updateUser,
  saveExamAttempt,
  getLatestExamAttemptByUserId,
  saveRoadmap,
  getLatestRoadmapByUserId,
  upsertKnowledgeDocument,
  getKnowledgeDocumentsByType,
  getAllKnowledgeDocuments,
  createRememberToken,
  getRememberToken,
  deleteRememberToken,
  deleteExpiredRememberTokens
};
