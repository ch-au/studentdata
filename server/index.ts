import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.REPLIT_DEPLOYMENT === "1";
if (isProduction) {
  app.use(
    express.static(path.join(__dirname, "../dist"), {
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );
}

import fs from "fs/promises";

// Helper to reliably interact with the JSON cache file.
const CACHE_FILE_PATH = path.join(__dirname, "mainz_cache.json");

async function getMainzCache() {
  try {
    const data = await fs.readFile(CACHE_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return {};
    }
    throw err;
  }
}

async function setMainzCache(key: string, value: string) {
  const cache = await getMainzCache();
  cache[key] = value;
  await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

async function fetchUniversityData(
  university: string,
  studiengangText: string,
  niveauText: string,
  comparisonContext: string = ""
) {
  const systemPrompt = `Du bist ein Studienerater, der spezifische Informationen über Studiengänge an Hochschulen recherchiert. Antworte immer auf Deutsch in einfacher, verständlicher Sprache. Formatiere deine Antwort in Markdown. Sei konkret und spezifisch - keine generischen Aussagen. Stelle KEINE Rückfragen - antworte direkt mit den verfügbaren Informationen.`;

  let userPrompt = "";

  if (comparisonContext) {
    userPrompt = `Du bist als Vergleichs-Analyst tätig. Recherchiere die Value Proposition des ${studiengangText} an der Hochschule ${university} und vergleiche sie direkt mit den bekannten Fakten der Hochschule Mainz.

Bedenke die folgenden bekannten Fakten zur Hochschule Mainz:
<HochschuleMainzFakten>
${comparisonContext}
</HochschuleMainzFakten>

Bitte halte dich zwingend an die folgende Struktur: Beginne mit einer Management Summary, erstelle danach eine Strukturierte Vergleichstabelle und liefere abschließend die detaillierten Datenpunkte der Hochschule ${university}.

WICHTIG: Sei spezifisch, datengestützt und nicht generisch! Beispiele: "Regelstudienzeit: 7 Semester", "NC: 2,4 im WS 23/24", "Praxis: 24 Wochen im 5. Semester".

Formatiere die Antwort zwingend in diesem Markdown-Format:

## Management Summary (Vergleich)
[Fasse die wichtigsten Unterschiede, die Value Proposition und die strategische Ausrichtung (USP) der Hochschule ${university} im direkten Vergleich zur Hochschule Mainz in 2-3 prägnanten Sätzen zusammen.]

## Strukturierter Vergleich: Hochschule ${university} vs. Hochschule Mainz
| Kategorie | Hochschule ${university} | Hochschule Mainz |
| :--- | :--- | :--- |
| **Strukturell & Formal** (Dauer, ECTS, Kosten) | ... | ... |
| **Inhaltlich & Fachlich** (Schwerpunkte, Praxis) | ... | ... |
| **Methodik & Lehrformat** (Präsenz, Specials) | ... | ... |
| **Marketing & USP** | ... | ... |

## Detaillierte Analyse: Hochschule ${university}
### 1. Strukturell & Formal
- **Regelstudienzeit & ECTS:** [z.B. 7 Semester, 210 ECTS]
- **Zulassung (NC/Eignungstest):** [z.B. NC-frei, Vorpraktikum nötig]
- **Kosten & Gebühren:** [z.B. Semesterbeitrag 142€, keine Studiengebühren]
- **Standort & Abschluss:** [z.B. München, B.Sc.]

### 2. Inhaltlich & Fachlich
- **Schwerpunkte & Vertiefungen:** [z.B. ab 4. Semester Wahl zwischen Cyber Security und Data Science]
- **Spezifische Module (Beispiele):** [Nenne 2-3 konkrete, herausstechende Module, insb. bzgl. neue Technologien/KI]
- **Praxisanteil:** [z.B. 20 Wochen Pflichtpraktikum im 5. Semester]

### 3. Methodik & Lehrformat
- **Lehrformate:** [z.B. hoher Anteil an Projektarbeiten in Kleingruppen]
- **Präsenz vs. Online:** [Gibt es hybride Konzepte oder strikte Präsenzpflicht?]
- **Besonderheiten:** [z.B. Duales Studium möglich, Auslandssemester integriert]

### 4. Marketing & USP (Unique Selling Proposition)
- **Kommunizierte USP:** [Wie positioniert sich der Studiengang offiziell? Womit wird geworben?]`;
  } else {
    userPrompt = `Recherchiere die Value Proposition des ${studiengangText} an der Hochschule ${university}.

Bitte halte dich zwingend an die folgende Struktur: Beginne mit einer Management Summary, erstelle danach eine Strukturierte Übersichtstabelle und liefere abschließend die detaillierten Datenpunkte.

WICHTIG: Sei spezifisch, datengestützt und nicht generisch! Beispiele: "Regelstudienzeit: 7 Semester", "NC: 2,4 im WS 23/24", "Praxis: 24 Wochen im 5. Semester".

Formatiere die Antwort zwingend in diesem Markdown-Format:

## Management Summary
[Fasse die wichtigsten Erkenntnisse, die Value Proposition und die strategische Ausrichtung (USP) des Studiengangs in 2-3 prägnanten Sätzen zusammen.]

## Strukturierte Übersicht
| Kategorie | Kernaspekte Hochschule ${university} |
| :--- | :--- |
| **Strukturell & Formal** | [Kompakte Zusammenfassung] |
| **Inhaltlich & Fachlich** | [Kompakte Zusammenfassung] |
| **Methodik & Lehrformat** | [Kompakte Zusammenfassung] |
| **Marketing & USP** | [Kompakte Zusammenfassung] |

## Detaillierte Analyse
### 1. Strukturell & Formal
- **Regelstudienzeit & ECTS:** [z.B. 7 Semester, 210 ECTS]
- **Zulassung (NC/Eignungstest):** [z.B. NC-frei, Vorpraktikum nötig]
- **Kosten & Gebühren:** [z.B. Semesterbeitrag 142€, keine Studiengebühren]
- **Standort & Abschluss:** [z.B. München, B.Sc.]

### 2. Inhaltlich & Fachlich
- **Schwerpunkte & Vertiefungen:** [z.B. ab 4. Semester Wahl zwischen Cyber Security und Data Science]
- **Spezifische Module (Beispiele):** [Nenne 2-3 konkrete, herausstechende Module, insb. bzgl. neue Technologien/KI]
- **Praxisanteil:** [z.B. 20 Wochen Pflichtpraktikum im 5. Semester]

### 3. Methodik & Lehrformat
- **Lehrformate:** [z.B. hoher Anteil an Projektarbeiten in Kleingruppen]
- **Präsenz vs. Online:** [Gibt es hybride Konzepte oder strikte Präsenzpflicht?]
- **Besonderheiten:** [z.B. Duales Studium möglich, Auslandssemester integriert]

### 4. Marketing & USP (Unique Selling Proposition)
- **Kommunizierte USP:** [Wie positioniert sich der Studiengang offiziell? Womit wird geworben?]`;
  }

  userPrompt += `\n\n## Quelle
Gib am Ende unbedingt die direkte URL zur Studiengangsseite an (nicht die Hauptseite der Hochschule, sondern die spezifische Seite des Studiengangs${niveauText}).

WICHTIG: Stelle KEINE Rückfragen! Antworte direkt mit den Informationen, die du hast.`;

  const modelName = "google/gemini-3.1-flash-lite-preview";
  const startTime = Date.now();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://studienanfaenger.replit.app",
      "X-Title": "Studienanfaenger Dashboard",
    },
    body: JSON.stringify({
      model: modelName,
      plugins: [{ id: "web", max_results: 5 }],
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenRouter API error:", errorText);
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "Keine Informationen gefunden.";

  const latencyMs = Date.now() - startTime;

  console.log("\n========== AI MODEL CALL ==========");
  console.log(`Model: ${modelName} (with web search)`);
  console.log(`Latency: ${latencyMs}ms (${(latencyMs / 1000).toFixed(2)}s)`);
  console.log(`University: ${university}`);
  console.log(`Studiengang: ${studiengangText}`);
  console.log(`Has Comparison Context: ${!!comparisonContext}`);
  console.log("====================================\n");

  return text;
}

app.post("/api/university-info", async (req, res) => {
  try {
    const { university, studiengang, niveau } = req.body;

    if (!university) {
      return res.status(400).json({ error: "University is required" });
    }

    const niveauText = niveau && niveau !== "Alle" ? ` (${niveau})` : "";
    const studiengangText = studiengang ? `${studiengang}${niveauText}` : "Studienangebots";

    const isMainz = university.toLowerCase().includes("mainz");
    const cacheKey = `${studiengangText}|${niveauText}`;

    if (isMainz) {
      // If requesting Mainz, try to pull from cache first
      let mainzInfo = "";
      const cache = await getMainzCache();
      if (cache[cacheKey]) {
        console.log(`[Cache Hit] Hochschule Mainz for ${cacheKey}`);
        mainzInfo = cache[cacheKey];
      } else {
        console.log(`[Cache Miss] Hochschule Mainz for ${cacheKey}, fetching...`);
        mainzInfo = await fetchUniversityData(university, studiengangText, niveauText);
        await setMainzCache(cacheKey, mainzInfo);
      }
      return res.json({
        university,
        studiengang: studiengang || null,
        info: mainzInfo,
      });
    }

    // If NOT Mainz, fetch/check Mainz first for the comparison context
    let mainzFacts = "";
    const cache = await getMainzCache();
    if (cache[cacheKey]) {
      console.log(`[Cache Hit] Pre-querying Hochschule Mainz facts for ${cacheKey}`);
      mainzFacts = cache[cacheKey];
    } else {
      console.log(`[Cache Miss] Pre-querying Hochschule Mainz facts for ${cacheKey}, fetching...`);
      mainzFacts = await fetchUniversityData("Hochschule Mainz", studiengangText, niveauText);
      await setMainzCache(cacheKey, mainzFacts);
    }

    // Now research the requested university with the Mainz facts injected
    const targetInfo = await fetchUniversityData(university, studiengangText, niveauText, mainzFacts);

    res.json({
      university,
      studiengang: studiengang || null,
      info: targetInfo,
    });
  } catch (error) {
    console.error("Error fetching university info:", error);
    res.status(500).json({ error: "Fehler beim Abrufen der Informationen" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

if (isProduction) {
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });
}

const PORT = parseInt((process.env.PORT || (isProduction ? "5000" : "3001")).toString(), 10);
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Server running on port ${PORT} (${isProduction ? "production" : "development"})`,
  );
});
