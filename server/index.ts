import express from "express";
import cors from "cors";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const app = express();
app.use(cors());
app.use(express.json());

const openai = createOpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

app.post("/api/university-info", async (req, res) => {
  try {
    const { university, studiengang, niveau } = req.body;

    if (!university) {
      return res.status(400).json({ error: "University is required" });
    }

    const niveauText = niveau && niveau !== "Alle" ? ` (${niveau})` : "";
    const studiengangText = studiengang
      ? `${studiengang}${niveauText}`
      : "Studienangebots";

    const systemPrompt = `Du bist ein Studienerater, der spezifische Informationen über Studiengänge an Hochschulen recherchiert. Antworte immer auf Deutsch in einfacher, verständlicher Sprache. Formatiere deine Antwort in Markdown. Sei konkret und spezifisch - keine generischen Aussagen. Stelle KEINE Rückfragen - antworte direkt mit den verfügbaren Informationen.`;

    const userPrompt = `Was ist die Value Proposition des ${studiengangText} an der Hochschule ${university}?

Bitte beschreibe hervorgehobene inhaltliche (Themen, Vertiefungen, Spezialisierung, KI Elemente?), methodische (Art der Vorlesungen, Praxisnähe, Online?) und strukturelle Elemente (Infrastruktur der HS, besonderer Mehrwert) in kurzen Bullets.

WICHTIG: Sei spezifisch und nicht generisch! Zum Beispiel:
- Statt "Online-Unterricht möglich" → "40% Online-Anteil, Präsenzphasen am Wochenende"
- Statt "Praxisnah" → "Pflichtpraktikum im 5. Semester (mind. 20 Wochen)"
- Statt "Internationale Ausrichtung" → "Doppelabschluss mit Université Paris-Saclay möglich"

Formatiere die Antwort in Markdown:

## Inhaltlich
- ...

## Methodisch
- ...

## Strukturell
- ...

## Quelle
Gib am Ende unbedingt die direkte URL zur Studiengangsseite an (nicht die Hauptseite der Hochschule, sondern die spezifische Seite des Studiengangs${niveauText}).

WICHTIG: Stelle KEINE Rückfragen! Antworte direkt mit den Informationen, die du hast.`;

    const modelName = "gpt-5-nano";
    const startTime = Date.now();
    
    const { text } = await generateText({
      model: openai(modelName),
      system: systemPrompt,
      prompt: userPrompt,
    });
    
    const latencyMs = Date.now() - startTime;
    
    console.log("\n========== AI MODEL CALL ==========");
    console.log(`Model: ${modelName}`);
    console.log(`Latency: ${latencyMs}ms (${(latencyMs / 1000).toFixed(2)}s)`);
    console.log(`University: ${university}`);
    console.log(`Studiengang: ${studiengang || "Alle"}`);
    console.log(`Niveau: ${niveau || "Alle"}`);
    console.log("--- SYSTEM PROMPT ---");
    console.log(systemPrompt);
    console.log("--- USER PROMPT ---");
    console.log(userPrompt);
    console.log("====================================\n");

    res.json({
      university,
      studiengang: studiengang || null,
      info: text,
    });
  } catch (error) {
    console.error("Error fetching university info:", error);
    res.status(500).json({ error: "Fehler beim Abrufen der Informationen" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
