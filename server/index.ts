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
import YAML from "yaml";

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

const PROMPTS_PATH = path.join(__dirname, "prompts.yaml");
let promptsCache: Record<string, string> | null = null;

async function loadPrompts(): Promise<Record<string, string>> {
  if (promptsCache) return promptsCache;
  const raw = await fs.readFile(PROMPTS_PATH, "utf-8");
  promptsCache = YAML.parse(raw);
  return promptsCache!;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

async function fetchUniversityData(
  university: string,
  studiengangText: string,
  niveauText: string,
  niveauLabel: string = "",
  comparisonContext: string = ""
) {
  const prompts = await loadPrompts();
  const niveauHinweis = niveauLabel
    ? `WICHTIG: Fokussiere dich ausschließlich auf den ${niveauLabel}-Studiengang (nicht auf andere Abschlüsse wie ${niveauLabel === "Bachelor" ? "Master" : "Bachelor"}).`
    : "";
  const vars = { university, studiengangText, niveauText, niveauLabel, niveauHinweis, comparisonContext };

  const systemPrompt = fillTemplate(prompts.system, vars);

  const base = comparisonContext ? prompts.comparison : prompts.standard;
  const suffix = prompts.suffix;
  const userPrompt = fillTemplate(base, vars) + "\n" + fillTemplate(suffix, vars);

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
    const niveauLabel = niveau && niveau !== "Alle" ? niveau : "";
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
        mainzInfo = await fetchUniversityData(university, studiengangText, niveauText, niveauLabel);
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
      mainzFacts = await fetchUniversityData("Hochschule Mainz", studiengangText, niveauText, niveauLabel);
      await setMainzCache(cacheKey, mainzFacts);
    }

    // Now research the requested university with the Mainz facts injected
    const targetInfo = await fetchUniversityData(university, studiengangText, niveauText, niveauLabel, mainzFacts);

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
