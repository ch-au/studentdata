import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const isProduction = process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1";
if (isProduction) {
  app.use(express.static(path.join(__dirname, "../dist"), {
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
}

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

    const modelName = "google/gemini-2.5-flash-preview";
    const startTime = Date.now();
    
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://studienanfaenger.replit.app",
        "X-Title": "Studienanfaenger Dashboard"
      },
      body: JSON.stringify({
        model: modelName,
        plugins: [{ id: "web", max_results: 5 }],
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
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

if (isProduction) {
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });
}

const PORT = process.env.PORT || (isProduction ? 5000 : 3001);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} (${isProduction ? "production" : "development"})`);
});
