import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';

console.log("🏛️  THE CHAMBERS ARE ATTEMPTING TO OPEN...");

const app = express();
app.use(cors());
app.use(express.json());

// 🟢 DIAGNOSTIC LOG: Check the Environment
console.log("🔑  Checking Credentials...");
console.log("- Gemini Key:", process.env.GEMINI_API_KEY ? "✅ LOADED" : "❌ MISSING");
console.log("- Supabase URL:", process.env.SUPABASE_URL ? "✅ LOADED" : "❌ MISSING");

// 🟢 CONFIGURATION: AI & DATABASE (INITIALIZED ONLY ONCE)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const MODEL_NAME = "gemini-2.5-flash"; 

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

console.log("🛡️  AI and Database Clients initialized.");

// ============================================================
// 🟢 EXTRACTION & REFINEMENT HELPERS
// ============================================================

const normalizeGR = (raw) => raw.replace(/[^\w.\-,\s]/g, '').trim();

function getSmartContext(text) {
  const MAX_LEN = 40000; 
  if (text.length <= MAX_LEN) return text;
  // Slicing Head (Facts) and Tail (Ruling) to maximize accuracy within context limits
  return `${text.slice(0, 18000)}\n\n[...TECHNICAL PROCEEDINGS TRUNCATED...]\n\n${text.slice(-18000)}`;
}

// 🛡️ Helper to safely strip Markdown formatting from AI JSON responses
function cleanJSON(rawText) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json/, "");
  if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```/, "");
  if (cleaned.endsWith("```")) cleaned = cleaned.replace(/```$/, "");
  return cleaned.trim();
}

async function scrapeFullText(url) {
  try {
    const { data } = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    
    // 1. Remove background junk
    $('script, style, nav, footer, iframe').remove(); 
    
    // 2. Convert HTML line breaks to actual text line breaks
    $('br').replaceWith('\n');
    $('p').prepend('\n\n');
    
    // 3. Grab text and clean up excessive spaces, but KEEP newlines
    let rawText = $('body').text();
    rawText = rawText.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();

    // 4. 🕵️‍♂️ DIRECT EXTRACTION: Find the bracketed header!
    const headerMatch = rawText.match(/\[(.*?)\]/);
    const exactHeader = headerMatch ? headerMatch[0] : "Header brackets not found";

    // 5. Force-feed the header to the AI
    return `CRITICAL METADATA (Contains Date): ${exactHeader}\n\nFULL TEXT:\n${rawText}`;
  } catch (e) { 
    return ""; 
  }
}

// ============================================================
// 🕵️‍♂️ PHASE 1: DISCOVERY LAYER (FETCH SEARCH CARDS)
// ============================================================

app.post('/api/search', async (req, res) => {
  const { query } = req.body;
  const normalized = normalizeGR(query);

  try {
    const digitsOnly = normalized.replace(/\D/g, '');
    const data = JSON.stringify({
      "q": `site:lawphil.net OR site:chanrobles.com OR site:elibrary.judiciary.gov.ph "${normalized}" OR "${digitsOnly}"`,
      "gl": "ph",
      "num": 3 // Top 3 choices for the dropdown
    });

    const response = await axios.post('https://google.serper.dev/search', data, {
      headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' }
    });

    const results = response.data.organic || [];

    // Map into the requested JSON Schema for the Frontend Cards
    const formattedResults = results.map(r => {
      let sourceName = "Philippine Supreme Court";
      if (r.link.includes('lawphil')) sourceName = "Lawphil";
      if (r.link.includes('chanrobles')) sourceName = "ChanRobles";

      return {
        grNo: normalized,
        title: r.title.replace(/ - Lawphil| - Supreme Court E-Library/gi, '').trim(),
        dateDecided: "Extracted on Digest", 
        source: sourceName,
        summary: r.snippet,
        metadata: {
          citation: r.title,
          fullDate: "Pending Scrape"
        },
        links: {
          viewSource: r.link,
          importAction: true
        }
      };
    });

    res.json({ searchResults: formattedResults });

  } catch (err) {
    console.error("❌ Search Error:", err.message);
    res.status(500).json({ error: "Search Failed" });
  }
});

// ============================================================
// ⚖️ PHASE 2: GENERATE CASE DIGEST
// ============================================================

app.post('/api/digest', async (req, res) => {
  const { query, url, focus } = req.body;
  const normalized = normalizeGR(query);

  try {
    // 🏛️ STEP 1: CHECK DB FIRST TO SAVE TOKENS (Only if NO focus is provided)
    if (!focus) {
      const { data: existingCase, error: dbError } = await supabase
        .from('cases')
        .select('*')
        .eq('gr_no', normalized)
        .maybeSingle();

      if (existingCase) {
        console.log(`📦 Vault Hit: Returning G.R. No. ${normalized} instantly.`);
        return res.json(existingCase);
      }
    }

    // 🏛️ STEP 2: SCRAPE THE SPECIFIC URL CHOSEN BY THE USER
    console.log(`🔍 Vault Miss or Focus Requested: Scraping selected URL for ${normalized}...`);
    let evidenceText = "";
    if (url) {
      evidenceText = await scrapeFullText(url);
    }

    // 🏛️ STEP 3: ACCURACY PROTECTION (Hard Gate)
    const hasEnoughData = evidenceText.length > 1200;
    if (!hasEnoughData) {
      return res.status(404).json({ 
        error: "Accuracy Rejection", 
        detail: "The official text for this case could not be scraped cleanly.",
        suggestion: "Please try another source link or paste manually."
      });
    }

    // 🏛️ STEP 4: GENERATE DIGEST (Gemini)
    // 🟢 ENHANCED: Demand comprehensive facts!
    const focusInstruction = focus 
      ? `CRITICAL DIRECTIVE: The user has requested to FOCUS STRICTLY on the issue of: "${focus}". 
         You MUST extract the issues and rulings ONLY as they pertain to "${focus}". 
         For the FACTS, provide a highly comprehensive, detailed, chronological narrative of what truly happened in the case, heavily emphasizing the factual background that leads up to the "${focus}" issue.` 
      : `Provide a comprehensive digest covering all major issues. For the FACTS, provide a highly detailed, chronological narrative of the events leading up to the Supreme Court. Do not over-summarize the facts.`;

    const prompt = `
      SYSTEM: You are Lex Casus Elite, a Philippine Bar Examiner and Expert Legal Scholar.
      TARGET: ${normalized}
      
      ${focusInstruction}
      
      STRICT EXTRACTION & FORMATTING RULES:
      1. TITLE & DATE: Look inside the brackets [ ] at the very top. DO NOT write "NOT FOUND" if it's there.
      2. FOR FACTS: Write a COMPREHENSIVE and DETAILED chronological story of the case. Do not leave out important material dates, actions, or lower court decisions (RTC/CA). Ensure the client understands exactly what truly happened.
      3. FOR ISSUES: You MUST format as:
         Issue 1: [Question]
         Issue 2: [Question]
      4. FOR RATIO (RULINGS): You MUST match the issues exactly:
         Ruling 1: [The specific answer and legal reasoning for Issue 1]
         Ruling 2: [The specific answer and legal reasoning for Issue 2]
      5. Use ONLY the provided text.

      CASE TEXT:
      ${getSmartContext(evidenceText)}

      JSON SCHEMA:
      {
        "title": "Full Case Title", 
        "date": "Extracted Date", 
        "ponente": "Justice Name",
        "topic": "${focus ? focus : 'Main Legal Subject'}", 
        "facts": "Detailed and comprehensive chronological facts of the case...", 
        "issues": "Issue 1: ... \\nIssue 2: ...", 
        "ratio": "Ruling 1: ... \\nRuling 2: ...", 
        "disposition": "fallo...",
        "doctrines": "doctrines...", 
        "barrelevance": "High/Medium/Low"
      }
    `;
    
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME, 
      generationConfig: { responseMimeType: "application/json" } 
    });

    const result = await model.generateContent(prompt);
    
    let digest;
    try {
      const rawResponse = result.response.text();
      const sanitizedText = cleanJSON(rawResponse);
      digest = JSON.parse(sanitizedText);
    } catch (parseError) {
       console.error("❌ AI Parsing Error: The AI did not return valid JSON.", result.response.text());
       return res.status(500).json({ error: "AI returned an invalid format. Please try again." });
    }

    // 🏛️ STEP 5: STORE IN DB (Supabase)
    const dbRecord = {
        gr_no: normalized,
        title: digest.title || "Untitled",
        date: digest.date || "Not Found",
        ponente: digest.ponente || "Not Found",
        topic: digest.topic || "General",
        facts: digest.facts || "",
        issues: digest.issues || "",
        ratio: digest.ratio || "",
        disposition: digest.disposition || "",
        doctrines: digest.doctrines || "",
        barrelevance: digest.barrelevance || "Medium",
        source_url: url || "Direct URL Import"
    };

    if (!focus) {
      const { data: insertedData, error: insertError } = await supabase
        .from('cases')
        .insert([dbRecord])
        .select();

      if (insertError) {
         console.error("❌ Vault Storage Error:", insertError.message);
      } else {
         console.log("✅ Case successfully archived in Supabase vault.");
      }
    } else {
       console.log("✅ Focused case generated. Bypassing global cache.");
    }

    res.json(dbRecord);

  } catch (err) {
    console.error("❌ Process Halted:", err.message);
    res.status(500).json({ error: "System Error", detail: err.message });
  }
});

// ============================================================
// ⚖️ ADDITIONAL MODULES (Grade, Chat)
// ============================================================

app.post('/api/grade', async (req, res) => {
  const { question, userAnswer, suggestedAnswer } = req.body;
  
  const prompt = `
    SYSTEM: You are an Elite Philippine Bar Examiner. 
    
    REFERENCE STANDARD (Admin's Suggested Answer): 
    "${suggestedAnswer}"
    
    STUDENT'S SUBMISSION:
    "${userAnswer}"
    
    GRADING PROTOCOL:
    1. Use the REFERENCE STANDARD as the 100% benchmark.
    2. If the student misses a key legal point mentioned in the Standard, deduct points.
    3. Evaluate specifically using the ALAC method.
    4. If the student's "Legal Basis" differs significantly from the Standard, mark it as a "Weakness."
    
    JSON SCHEMA:
    {
      "score": number (0-100),
      "feedback": "Overall 1-sentence critique.",
      "answer": "Evaluate the categorical Yes/No and its alignment with the standard.",
      "legalBasis": "Check if they cited the correct law/jurisprudence mentioned in the standard.",
      "analysis": "Did they apply the facts to the law as logically as the standard did?",
      "conclusion": "Is the final word consistent with the standard?",
      "improvements": ["Specific tip 1", "Specific tip 2"]
    }
  `;

  try {
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME, 
      generationConfig: { responseMimeType: 'application/json' } 
    });
    
    const result = await model.generateContent(prompt);
    
    const sanitizedText = cleanJSON(result.response.text());
    const evaluation = JSON.parse(sanitizedText);
    
    res.json(evaluation);
    
  } catch (e) { 
    console.error("Grader Error:", e);
    res.status(500).json({ error: "Grader Offline" }); 
  }
});

app.post('/api/chat', async (req, res) => {
  const { history, message } = req.body; 
  
  try {
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME, 
      tools: [{ googleSearch: {} }] 
    });
    
    const chat = model.startChat({ history: history || [] });
    
    const result = await chat.sendMessage(message);
    
    res.json({ response: result.response.text() }); 
  } catch (e) { 
    console.error("Chat Error:", e);
    res.status(500).json({ error: "Chat Error" }); 
  }
});

// 🟢 PHASE 3: CODAL DECONSTRUCTION
app.post('/api/deconstruct', async (req, res) => {
  const { title, content } = req.body;
  
  const prompt = `
    SYSTEM: You are Lex Casus, an expert Philippine Legal Scholar.
    TASK: Deconstruct the following legal provision into a simplified explanation for a law student.
    
    PROVISION: ${title}
    CONTENT: ${content}
    
    FORMAT: Use clear headings. Explain the "Elements," "Key Terms," and a "Bar Exam Tip." Use Markdown.
  `;

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(prompt);
    res.json({ analysis: result.response.text() });
  } catch (e) {
    res.status(500).json({ error: "Deconstruction failed" });
  }
});

// ============================================================
// 🟢 PHASE 4: BAR EXAM PRACTICE GENERATOR
// ============================================================

app.post('/api/practice', async (req, res) => {
  const { subject, topic } = req.body; 
  
  const prompt = `
    SYSTEM: You are an Elite Philippine Bar Examiner.
    TASK: Generate a challenging Bar Exam practice question based on the following parameters:
    - Subject: ${subject || 'Philippine Law'}
    - Specific Topic: ${topic || 'Random Bar Topic'}
    
    REQUIREMENTS:
    1. Create a realistic, highly detailed factual scenario (like a real Supreme Court Bar Exam question).
    2. End with a specific legal question (e.g., "Is the contract valid? Explain.").
    3. Provide the official Suggested Answer using the ALAC (Answer, Legal Basis, Analysis, Conclusion) method.
    
    JSON SCHEMA:
    {
      "question": "The factual scenario and the specific question...",
      "suggestedAnswer": "The official ALAC suggested answer...",
      "issue": "The main legal issue involved"
    }
  `;

  try {
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME, 
      generationConfig: { responseMimeType: 'application/json' } 
    });
    
    const result = await model.generateContent(prompt);
    
    const sanitizedText = cleanJSON(result.response.text());
    const practiceData = JSON.parse(sanitizedText);
    
    res.json(practiceData);
    
  } catch (e) { 
    console.error("Practice Generator Error:", e);
    res.status(500).json({ error: "Failed to generate practice question." }); 
  }
});

console.log("⚖️  Attempting to bind to Port 5000...");

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`⚖️  LEX CASUS ELITE: ARMED AND DEPLOYED ON PORT ${PORT}`));