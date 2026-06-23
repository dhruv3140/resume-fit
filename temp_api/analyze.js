import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { resume, jobDesc, score, matched, missing } = req.body;

    if (!resume || !jobDesc) {
      return res.status(400).json({ error: "Resume and job description are required." });
    }

    const prompt = `
You are an expert resume reviewer and ATS optimization coach.

Analyze the resume against the job description.

Return only valid JSON in this exact format:
{
  "summary": "short overall review",
  "strengths": ["point 1", "point 2", "point 3"],
  "improvements": ["point 1", "point 2", "point 3"],
  "rewriteTips": ["point 1", "point 2", "point 3"]
}

Resume:
${resume.slice(0, 6000)}

Job Description:
${jobDesc.slice(0, 4000)}

Keyword Match Score: ${score}%
Matched Keywords: ${matched?.join(", ") || "None"}
Missing Keywords: ${missing?.join(", ") || "None"}

Keep suggestions practical, specific, and useful for an Indian student/internship applicant.
Do not give fake achievements. Do not tell the user to lie.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text || "";

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsed;

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        summary: cleaned,
        strengths: [],
        improvements: ["AI response was generated, but could not be formatted perfectly."],
        rewriteTips: [],
      };
    }

    return res.status(200).json(parsed);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({
      error: "AI suggestions failed. Please try again later.",
    });
  }
}
