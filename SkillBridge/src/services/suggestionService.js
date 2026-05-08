const { generateSuggestions } = require("./llmService");

function extractJSON(text) {
    try {
        const cleaned = text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        const jsonString = cleaned.substring(start, end + 1);

        return JSON.parse(jsonString);
    } catch {
        return null;
    }
}

function formatResumeManually(text) {
    return `Resume\n\n${text}`;
}

function calculateATSScore(resumeText, skills, missingKeywords) {
    let score = 0;

    const textLower = resumeText.toLowerCase();

    // Structure score
    const sections = ["experience", "education", "skills", "project"];
    const structureScore = sections.filter(sec => textLower.includes(sec)).length * 10;

    // Skill score
    const skillScore = Math.min(40, skills.length * 4);

    // Missing keyword penalty
    const keywordPenalty = Math.min(20, (missingKeywords || []).length * 1.5);

    score = structureScore + skillScore - keywordPenalty;

    return Math.max(30, Math.min(95, score));
}


async function analyzeResume(resumeText, targetRole, currentSkills) {

    const prompt = `YOUR UPDATED PROMPT HERE`; // keep your improved prompt

    let aiResponse;

    try {
        const raw = await generateSuggestions(resumeText, targetRole);

        if (typeof raw === "string") {
            aiResponse = extractJSON(raw) || {};
        } else {
            aiResponse = raw;
        }

    } catch (error) {
        console.error("AI Pipeline Error:", error);

        aiResponse = { 
            missingKeywords: [], 
            rewrittenPoints: [],
            formattedResume: resumeText
        };
    }

    // CALCULATE ATS SCORE HERE (AFTER AI RESPONSE)
    const atsScore = calculateATSScore(
        resumeText,
        currentSkills,
        aiResponse.missingKeywords || []
    );

    const formattedResume = typeof aiResponse.formattedResume === 'string'
        ? aiResponse.formattedResume
        : formatResumeManually(resumeText);

    return {
        atsScore: atsScore,
        report: aiResponse,
        formattedResume
    };
}
module.exports = { analyzeResume };