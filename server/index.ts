import express from 'express';
import cors from 'cors';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const app = express();
app.use(cors());
app.use(express.json());

const openai = createOpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

app.post('/api/university-info', async (req, res) => {
  try {
    const { university, studiengang } = req.body;

    if (!university) {
      return res.status(400).json({ error: 'University is required' });
    }

    const systemPrompt = `Du bist ein hilfreicher Assistent, der Informationen über deutsche Hochschulen und Studiengänge zusammenfasst. Antworte immer auf Deutsch in einfacher, verständlicher Sprache. Formatiere deine Antwort in Markdown mit Überschriften und Stichpunkten.`;

    const userPrompt = `Was ist die Value Proposition des ${studiengang || 'Studienangebots'} an der Hochschule ${university}?

Bitte beschreibe hervorgehobene inhaltliche (Themen, Vertiefungen, Spezialisierung), methodische (Art der Vorlesungen, Praxisnähe) und strukturelle Elemente (Infrastruktur der HS, besonderer Mehrwert) in kurzen Bullets.

Formatiere die Antwort in Markdown:

## Inhaltlich
- ...

## Methodisch
- ...

## Strukturell
- ...

## Quelle
Gib am Ende unbedingt die URL zur offiziellen Webseite des Studiengangs oder der Hochschule als Quelle an.

Halte die Antworten kurz und prägnant. Verwende einfache Sprache.`;

    const { text } = await generateText({
      model: openai('gpt-4o'),
      system: systemPrompt,
      prompt: userPrompt,
    });

    res.json({ 
      university,
      studiengang: studiengang || null,
      info: text 
    });
  } catch (error) {
    console.error('Error fetching university info:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Informationen' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
