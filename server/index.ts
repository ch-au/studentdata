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

    const systemPrompt = `Du bist ein hilfreicher Assistent, der Informationen über deutsche Hochschulen und Studiengänge zusammenfasst. Antworte immer auf Deutsch in einfacher, verständlicher Sprache. Strukturiere deine Antwort mit Stichpunkten (•).`;

    const userPrompt = `Was sind besondere Aspekte des ${studiengang || 'Studienangebots'} an der Hochschule ${university}?

Bitte beschreibe in kurzen Stichpunkten:

INHALTLICH (Themen, Vertiefungen, Spezialisierung):
• ...

METHODISCH (Art der Vorlesungen, Praxisnähe):
• ...

STRUKTURELL (Infrastruktur der HS, besonderer Mehrwert):
• ...

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
