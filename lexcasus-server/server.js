import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import admin from 'firebase-admin'; // 🟢 ADDED: Firebase Admin SDK

console.log("🏛️  THE CHAMBERS ARE ATTEMPTING TO OPEN...");

// 🛡️ NATIVE, SIMPLIFIED CORS VIP LIST
const app = express();

// 🛡️ FINAL CORS CONFIGURATION
const corsOptions = {
  origin: ['http://localhost:5173', 'https://lex-casus.vercel.app'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// 🚨 Explicitly handle preflight for all routes using the options defined above
app.options('*', cors(corsOptions)); 

app.use(express.json());

// 🟢 DIAGNOSTIC LOG: Check the Environment
console.log("🔑  Checking Credentials...");
console.log("- Gemini Key:", process.env.GEMINI_API_KEY ? "✅ LOADED" : "❌ MISSING");
console.log("- Supabase URL:", process.env.SUPABASE_URL ? "✅ LOADED" : "❌ MISSING");

// 🟢 INITIALIZE FIREBASE ADMIN (The Master Key - FIXED FOR RENDER)
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: "lexcasusv2",
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // 🟢 Crucial fix: Render escapes the \n, so we put them back to real newlines
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        })
      });
      console.log("🔥 Firebase Admin Secure Connection: ✅ LOADED");
    } else {
      console.log("🔥 Firebase Admin Secure Connection: ❌ MISSING ENV VARS");
    }
  } catch (e) {
    console.error("⚠️ Firebase Admin could not initialize:", e.message);
  }
}

// 🟢 CONFIGURATION: AI & DATABASE
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
  return `${text.slice(0, 18000)}\n\n[...TECHNICAL PROCEEDINGS TRUNCATED...]\n\n${text.slice(-18000)}`;
}

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
    
    $('script, style, nav, footer, iframe').remove(); 
    $('br').replaceWith('\n');
    $('p').prepend('\n\n');
    
    let rawText = $('body').text();
    rawText = rawText.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();

    const headerMatch = rawText.match(/\[(.*?)\]/);
    const exactHeader = headerMatch ? headerMatch[0] : "Header brackets not found";

    return `CRITICAL METADATA (Contains Date): ${exactHeader}\n\nFULL TEXT:\n${rawText}`;
  } catch (e) { 
    return ""; 
  }
}

// ============================================================
// 🩺 HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({ status: "🟢 The Chambers are Open", time: new Date().toISOString() });
});

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
      "num": 3 
    });

    const response = await axios.post('https://google.serper.dev/search', data, {
      headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' }
    });

    const results = response.data.organic || [];

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
        metadata: { citation: r.title, fullDate: "Pending Scrape" },
        links: { viewSource: r.link, importAction: true }
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
  const { query, url, focus, userId, isAdmin } = req.body;
  const normalized = normalizeGR(query);

  try {
    if (!focus) {
      const { data: existingCase } = await supabase
        .from('cases')
        .select('*')
        .eq('gr_no', normalized)
        .maybeSingle();

      if (existingCase) {
        console.log(`📦 Vault Hit: Returning G.R. No. ${normalized} instantly.`);
        return res.json(existingCase);
      }
    }

    let evidenceText = "";
    if (url) {
      evidenceText = await scrapeFullText(url);
    }

    if (evidenceText.length < 1200) {
      return res.status(404).json({ 
        error: "Accuracy Rejection", 
        detail: "The official text for this case could not be scraped cleanly.",
        suggestion: "Please try another source link."
      });
    }

    const focusInstruction = focus 
      ? `CRITICAL DIRECTIVE: The user has requested to FOCUS STRICTLY on the issue of: "${focus}". 
         You MUST extract the issues and rulings ONLY as they pertain to "${focus}". 
         For the FACTS, provide a highly comprehensive narrative emphasizing the factual background that leads up to the "${focus}" issue.` 
      : `Provide a comprehensive digest covering all major issues. For the FACTS, provide a highly detailed, chronological narrative of the events leading up to the Supreme Court. Do not over-summarize the facts.`;

    const prompt = `
      SYSTEM: You are Lex Casus Elite, a Philippine Bar Examiner and Expert Legal Scholar.
      TARGET: ${normalized}
      
      ${focusInstruction}
      
      STRICT EXTRACTION & FORMATTING RULES:
      1. TITLE & DATE: Look inside the brackets [ ] at the very top. DO NOT write "NOT FOUND" if it's there.
      2. FOR FACTS: Write a COMPREHENSIVE and DETAILED chronological story of the case.
      3. FOR ISSUES: Format as "Issue 1: [Question]"
      4. FOR RATIO (RULINGS): Format as "Ruling 1: [Answer]" matching the issues exactly.
      5. Output ONLY valid JSON.

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
      const sanitizedText = cleanJSON(result.response.text());
      digest = JSON.parse(sanitizedText);
    } catch (parseError) {
       return res.status(500).json({ error: "AI returned an invalid format. Please try again." });
    }

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
      await supabase.from('cases').insert([dbRecord]);
    }

    // 🛡️ THE PAYWALL ENFORCER: Securely deduct Case Digest credits
    if (userId && !isAdmin && admin.apps.length > 0) {
      try {
        const db = admin.firestore();
        await db.collection('users').doc(userId).update({
          'usage.dailyCaseCount': admin.firestore.FieldValue.increment(1),
          'usage.monthlyCaseCount': admin.firestore.FieldValue.increment(1)
        });
        console.log(`💰 Billed Case Digest to User: ${userId}`);
      } catch (billingError) {
        console.error(`🚨 Billing Failed for User ${userId}:`, billingError.message);
      }
    }

    res.json(dbRecord);
  } catch (err) {
    console.error("❌ Digest Error:", err.message);
    res.status(500).json({ error: "System Error", detail: err.message });
  }
});

// ============================================================
// ⚖️ PHASE 3: GRADE SUBMITTED BAR ANSWERS (SECURED PAYWALL)
// ============================================================
app.post('/api/grade', async (req, res) => {
  // 🟢 Extract userId and isAdmin from the request
  const { question, userAnswer, suggestedAnswer, userId, isAdmin } = req.body;
  
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
    
    CRITICAL: Output ONLY valid JSON.
    
    JSON SCHEMA:
    {
      "score": number,
      "feedback": "Overall 1-sentence critique.",
      "answer": "Evaluate the categorical Yes/No and its alignment with the standard.",
      "legalBasis": "Check if they cited the correct law/jurisprudence.",
      "analysis": "Did they apply the facts to the law logically?",
      "conclusion": "Is the final word consistent?",
      "improvements": ["Specific tip 1", "Specific tip 2"]
    }
  `;

  try {
    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME, 
      generationConfig: { responseMimeType: 'application/json' } 
    });
    
    const result = await model.generateContent(prompt);
    
    // 🛡️ THE PAYWALL ENFORCER: Securely deduct credits on the backend
    if (userId && !isAdmin && admin.apps.length > 0) {
      try {
        const db = admin.firestore();
        await db.collection('users').doc(userId).update({
          'usage.dailyPracticeCount': admin.firestore.FieldValue.increment(1)
        });
        console.log(`💰 Billed AI Practice Grader to User: ${userId}`);
      } catch (billingError) {
        console.error(`🚨 Billing Failed for User ${userId}:`, billingError.message);
      }
    }

    try {
      const evaluation = JSON.parse(cleanJSON(result.response.text()));
      res.json(evaluation);
    } catch (parseError) {
      res.status(500).json({ error: "Grader output format error. Try submitting again." });
    }
    
  } catch (e) { 
    res.status(500).json({ error: "Grader Offline" }); 
  }
});

// ============================================================
// 🟢 PHASE 4: LEGAL CHAT AI (SECURED PAYWALL)
// ============================================================
app.post('/api/chat', async (req, res) => {
  // 🟢 Extract userId and isAdmin from the frontend request
  const { history, message, userId, isAdmin } = req.body; 
  const safeHistory = Array.isArray(history) ? history : [];

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const chat = model.startChat({ history: safeHistory });
    const result = await chat.sendMessage(message);
    
    // 🛡️ THE PAYWALL ENFORCER: Securely deduct credits on the backend
    if (userId && !isAdmin && admin.apps.length > 0) {
      try {
        const db = admin.firestore();
        await db.collection('users').doc(userId).update({
          'usage.dailyChatCount': admin.firestore.FieldValue.increment(1)
        });
        console.log(`💰 Billed AI Chat to User: ${userId}`);
      } catch (billingError) {
        console.error(`🚨 Billing Failed for User ${userId}:`, billingError.message);
      }
    }

    res.json({ response: result.response.text() }); 
  } catch (e) { 
    res.status(500).json({ error: "LexCasus Chat is currently overloaded." }); 
  }
});

// ============================================================
// 🟢 PHASE 5: CODAL DECONSTRUCTION (WITH SECURE BILLING)
// ============================================================
app.post('/api/deconstruct', async (req, res) => {
  // 🟢 Extract userId and isAdmin from the frontend request
  const { title, content, userId, isAdmin } = req.body;
  
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
    
    // 🛡️ THE PAYWALL ENFORCER: Securely deduct credits on the backend
    if (userId && !isAdmin && admin.apps.length > 0) {
      try {
        const db = admin.firestore();
        await db.collection('users').doc(userId).update({
          'usage.aiDeconstructionCount': admin.firestore.FieldValue.increment(1)
        });
        console.log(`💰 Billed AI Deconstruction to User: ${userId}`);
      } catch (billingError) {
        console.error(`🚨 Billing Failed for User ${userId}:`, billingError.message);
      }
    }

    res.json({ analysis: result.response.text() });
  } catch (e) {
    res.status(500).json({ error: "Deconstruction failed" });
  }
});

// ============================================================
// 🟢 PHASE 6: BAR EXAM QUESTION GENERATOR
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
    3. Provide the official Suggested Answer using the ALAC method.
    
    CRITICAL: Output ONLY valid JSON. Do not include conversational text.
    
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
    
    try {
      const practiceData = JSON.parse(cleanJSON(result.response.text()));
      res.json(practiceData);
    } catch (parseError) {
      console.error("❌ Practice Generator JSON Parse Failed! AI output:", result.response.text());
      res.status(500).json({ error: "AI formatting error. Try generating again." });
    }
    
  } catch (e) { 
    console.error("❌ Practice Generator Network Error:", e.message);
    res.status(500).json({ error: "Failed to generate practice question." }); 
  }
});

// ============================================================
// 🚀 SERVER LAUNCH
// ============================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`⚖️  LEX CASUS ELITE: ARMED AND DEPLOYED ON PORT ${PORT}`));