import { useMemo, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth";
import "./App.css";
import { GoogleGenAI } from "@google/genai";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const skillBank = [
  "react", "javascript", "html", "css", "node", "express", "mongodb", "sql",
  "python", "java", "api", "rest", "frontend", "backend", "fullstack", "git",
  "github", "database", "responsive", "ui", "ux", "authentication", "jwt",
  "typescript", "next", "vite", "tailwind", "bootstrap", "problem solving",
  "communication", "teamwork", "leadership", "internship", "developer",
  "software", "debugging", "deployment", "vercel", "firebase", "fastapi",
  "postgresql", "machine learning", "ai", "langchain", "rag", "data structures",
  "algorithms", "oops", "dbms", "operating system", "computer networks",
  "testing", "cloud", "aws", "figma", "seo", "analytics"
];

function App() {
  const [resume, setResume] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [fileName, setFileName] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);

  const cleanText = (text) => text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");

  const wordCount = (text) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const extractPdfText = async (file) => {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  });

  const pdf = await loadingTask.promise;

  let text = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const pageText = content.items
      .map((item) => item.str)
      .join(" ");

    text += pageText + "\n";
  }

  return text;
};

  const extractDocxText = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleFile = async (file) => {
    if (!file) return;

    setLoadingFile(true);
    setFileName(file.name);

    try {
      let text = "";

      if (file.name.endsWith(".pdf")) {
        text = await extractPdfText(file);
      } else if (file.name.endsWith(".docx")) {
        text = await extractDocxText(file);
      } else if (file.name.endsWith(".txt")) {
        text = await file.text();
      } else {
        alert("Please upload PDF, DOCX, or TXT file only.");
        setLoadingFile(false);
        return;
      }

      if (!text.trim()) {
        alert("Could not extract text. Please paste resume text manually.");
      } else {
        setResume(text);
      }
    } catch (error) {
      console.log(error);
      alert("Could not read this file. Please paste resume text manually.");
    }

    setLoadingFile(false);
  };

  const handleUpload = (e) => {
    handleFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const analysis = useMemo(() => {
    if (!resume.trim() || !jobDesc.trim()) return null;

    const resumeText = cleanText(resume);
    const jdText = cleanText(jobDesc);

    const jdKeywords = skillBank.filter((skill) => jdText.includes(skill));
    const matched = jdKeywords.filter((skill) => resumeText.includes(skill));
    const missing = jdKeywords.filter((skill) => !resumeText.includes(skill));

    const score =
      jdKeywords.length === 0
        ? 0
        : Math.round((matched.length / jdKeywords.length) * 100);

    const suggestions = [];

    if (score >= 80) {
      suggestions.push("Excellent match. Your resume is well aligned with this role.");
    } else if (score >= 60) {
      suggestions.push("Good match. Add a few missing role-specific keywords to make it stronger.");
    } else if (score >= 40) {
      suggestions.push("Average match. Improve your resume by adding more relevant skills and project details.");
    } else {
      suggestions.push("Weak match. Your resume needs more skills and experience related to this job description.");
    }

    if (missing.length > 0) {
      suggestions.push(`Add relevant missing keywords like: ${missing.slice(0, 7).join(", ")}.`);
    }

    if (!resumeText.includes("project")) {
      suggestions.push("Add a strong Projects section with real outcomes and tech stack.");
    }

    if (!resumeText.includes("github")) {
      suggestions.push("Add GitHub/project links to increase trust.");
    }

    if (wordCount(resume) < 150) {
      suggestions.push("Resume text looks short. Add achievements, responsibilities, and measurable impact.");
    }

    return {
      score,
      matched,
      missing,
      suggestions,
      resumeWords: wordCount(resume),
      jdWords: wordCount(jobDesc),
      jdKeywordCount: jdKeywords.length
    };
  }, [resume, jobDesc]);


  const loadSample = () => {
    setResume(`Sarvagya Singhal
B.Tech Computer Science student skilled in Java, Data Structures, Algorithms, React, JavaScript, HTML, CSS, SQL, GitHub and REST API.
Built projects including ResumeFit, Voice Notes App, Expense Tracker, URL Shortener and Smart DSA Tutor.
Experience in frontend development, responsive UI, debugging, deployment and API integration.
Strong problem solving, communication and teamwork skills.`);

    setJobDesc(`We are hiring a Software Developer Intern with knowledge of React, JavaScript, HTML, CSS, REST API, SQL, GitHub and responsive frontend development.
The candidate should have strong problem solving, communication and teamwork skills.
Experience with debugging, deployment and real projects is preferred.`);

    setFileName("Sample Resume");
  };

  const clearAll = () => {
  setResume("");
  setJobDesc("");
  setFileName("");
  setAiSuggestions(null);
  setAiError("");
};

  const copySuggestions = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(analysis.suggestions.join("\n"));
    alert("Suggestions copied!");
  };



const generateAiSuggestions = async () => {
  if (!analysis) {
    alert("Please upload resume and paste job description first.");
    return;
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    setAiError("Gemini API key is missing. Add VITE_GEMINI_API_KEY in .env.local and restart npm run dev.");
    return;
  }

  setAiLoading(true);
  setAiError("");
  setAiSuggestions(null);

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    const prompt = `
You are an expert resume reviewer and ATS optimization coach.

Analyze this resume against the job description.

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

Keyword Match Score: ${analysis.score}%
Matched Keywords: ${analysis.matched?.join(", ") || "None"}
Missing Keywords: ${analysis.missing?.join(", ") || "None"}

Keep suggestions practical and useful for a student/internship applicant.
Do not suggest fake achievements.
Do not tell the user to lie.
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
        improvements: ["AI response was generated but could not be formatted perfectly."],
        rewriteTips: [],
      };
    }

    setAiSuggestions(parsed);
  } catch (error) {
    console.error(error);
    setAiError(error.message || "Gemini AI suggestions failed.");
  } finally {
    setAiLoading(false);
  }
};

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };
  const scoreLabel = (score) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Average";
    return "Weak";
  };

  return (
    <div className="page">
      <header className="hero">
        <nav className="nav">
          <div className="brand">
            <div className="brand-icon">R</div>
            <div>
              <h2>ResumeFit</h2>
              <p>Smart Resume Matcher</p>
            </div>
          </div>

          <a
            className="hero-link"
            href="https://digitalheroesco.com"
            target="_blank"
            rel="noreferrer"
          >
            Built for Digital Heroes
          </a>
        </nav>

        <div className="hero-grid">
          <div className="hero-left">
            <h1>Turn your resume into a job-ready application.</h1>
            <p>
              Upload your resume, paste a job description, and get an instant match score,
              missing keywords, and Sarvagya’s AI-powered improvement suggestions.
            </p>

            <div className="hero-actions">
              <button onClick={loadSample}>Try Sample Data</button>
              <button className="ghost" onClick={clearAll}>Reset</button>
            </div>

            <div className="creator">
              Built by <b>Sarvagya Singhal</b> · <span>dhruvsinghal166@gmail.com</span>
            </div>
          </div>

          <div className="hero-card">
            <p>Live Match Score</p>
            <h3>{analysis ? `${analysis.score}%` : "--%"}</h3>
            <div className="bar">
              <div style={{ width: `${analysis ? analysis.score : 0}%` }}></div>
            </div>
            <span>{analysis ? scoreLabel(analysis.score) : "Upload resume to begin"}</span>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="upload-section">
          <div
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="upload-icon">↑</div>
            <h3>{loadingFile ? "Reading your resume..." : "Upload Resume"}</h3>
            <p>Drag & drop your PDF, DOCX, or TXT file here</p>

            <label>
              Browse File
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleUpload}
              />
            </label>

            {fileName && <small>Selected: {fileName}</small>}
          </div>

          <div className="mini-stats">
            <div>
              <h4>{analysis ? analysis.resumeWords : 0}</h4>
              <p>Resume Words</p>
            </div>

            <div>
              <h4>{analysis ? analysis.jdWords : 0}</h4>
              <p>JD Words</p>
            </div>

            <div>
              <h4>{analysis ? analysis.jdKeywordCount : 0}</h4>
              <p>JD Keywords</p>
            </div>
          </div>
        </section>

        <section className="editor-grid">
          <div className="panel">
            <div className="panel-head">
              <h3>Resume Text</h3>
              <span>{wordCount(resume)} words</span>
            </div>

            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Upload your resume or paste resume text here..."
            />
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>Job Description</h3>
              <span>{wordCount(jobDesc)} words</span>
            </div>

            <textarea
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Paste the job description here..."
            />
          </div>
        </section>

        {analysis ? (
          <section className="result-grid">
            <div className="score-box">
              <h3>Resume Match</h3>
              <div className="big-score">{analysis.score}%</div>
              <div className="bar large">
                <div style={{ width: `${analysis.score}%` }}></div>
              </div>
              <p>{scoreLabel(analysis.score)} match for this job role.</p>
            </div>

            <div className="keyword-box">
              <h3>Matched Keywords</h3>
              <div className="chips">
                {analysis.matched.length ? (
                  analysis.matched.map((item) => <span className="chip good" key={item}>{item}</span>)
                ) : (
                  <p>No matched keywords found.</p>
                )}
              </div>
            </div>

            <div className="keyword-box">
              <h3>Missing Keywords</h3>
              <div className="chips">
                {analysis.missing.length ? (
                  analysis.missing.map((item) => <span className="chip bad" key={item}>{item}</span>)
                ) : (
                  <p>No major missing keywords.</p>
                )}
              </div>
            </div>

            <div className="suggestion-box">
              <div className="suggestion-head">
                <h3>Smart Suggestions</h3>
                <button onClick={copySuggestions}>Copy</button>
              </div>

              <ul>
                {analysis.suggestions.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              <div className="ai-coach">
  <div className="ai-coach-head">
    <div>
      <h3>AI Resume Coach</h3>
      <p>Generate smarter resume improvement advice using Gemini AI.</p>
    </div>

    <button onClick={generateAiSuggestions} disabled={aiLoading}>
      {aiLoading ? "Generating..." : "Generate AI Suggestions"}
    </button>
  </div>

  {aiError && <p className="ai-error">{aiError}</p>}

  {aiSuggestions && (
    <div className="ai-output">
      <div className="ai-summary">
        <h4>Overall Review</h4>
        <button onClick={() => copyToClipboard(aiSuggestions.summary)}>Copy</button>
        <p>{aiSuggestions.summary}</p>
      </div>

      <div className="ai-lists">
        <div>
          <h4>Strengths</h4>
          <button onClick={() => copyToClipboard(aiSuggestions.strengths.join(", "))}>Copy</button>
          <ul>
            {(aiSuggestions.strengths || []).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4>Improvements</h4>
          <button onClick={() => copyToClipboard(aiSuggestions.improvements.join(", "))}>Copy</button>
          <ul>
            {(aiSuggestions.improvements || []).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4>Rewrite Tips</h4>
          <button onClick={() => copyToClipboard(aiSuggestions.rewriteTips.join(", "))}>Copy</button>
          <ul>
            {(aiSuggestions.rewriteTips || []).map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )}
</div>
            </div>
          </section>
        ) : (
          <section className="empty-state">
            <h3>Start by uploading your resume and pasting a job description.</h3>
            <p>Your live analysis will appear automatically.</p>
          </section>
        )}
      </main>

      <footer>
        <p>ResumeFit helps students and job seekers improve their applications before applying.</p>
        <p>© 2026 Sarvagya Singhal · dhruvsinghal166@gmail.com</p>
      </footer>
    </div>
  );
}

export default App;