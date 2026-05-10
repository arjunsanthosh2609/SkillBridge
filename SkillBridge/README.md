# SkillBridge

SkillBridge is an AI resume screener and skill gap analyser built with Express, EJS, SQLite, and an optional Google AI Studio Gemini-powered LLM layer.

## Features

- Signup page with required user details, goal selection, and resume upload
- Resume text extraction from PDF, DOCX, and TXT files
- Skill extraction and storage in SQLite
- Goal-based exam page to measure actual skill level
- Home dashboard with extracted skills, trending skills, exam access, and roadmap lock/unlock state
- Personalized roadmap page generated from user goal, resume skills, and exam result
- Resume-backed roadmap grounding using a user knowledge base built from extracted resume sections

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and add your `GEMINI_API_KEY` from Google AI Studio if you want live LLM output.

3. Start the app:

```bash
npm start
```

4. Open `http://localhost:3000`

## Notes

- Without a Gemini API key, the app uses built-in fallback content for trending skills, exam questions, and roadmaps.
- Uploaded resumes are stored in the `uploads/` folder.
- User and exam data are stored in `skillbridge.db`.
- The roadmap uses user-specific knowledge extracted from each resume, including skills, projects, experience, education, certifications, courses, and achievements.
