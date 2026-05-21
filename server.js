import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import * as Sentry from '@sentry/node';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.GROQ_API_KEY;
const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || '15000'); // 15s default
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const ALLOWED_MODELS = ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'llama-3.3-70b-versatile'];

// Initialize Sentry (server) if DSN provided
const SENTRY_DSN = process.env.SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({ dsn: SENTRY_DSN });
  app.use(Sentry.Handlers.requestHandler());
}

if (!apiKey) {
  console.error('Missing GROQ_API_KEY in environment. Please set it in your .env file.');
  process.exit(1);
}

app.use(helmet());
app.use(express.json({ limit: '256kb' }));
app.use(
  rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  })
);

// HTTP request logging
app.use(morgan('combined'));

// Simple in-memory quota tracking per client IP.
const quotaMap = new Map(); // key -> { count, windowStart }
const QUOTA_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const QUOTA_MAX = parseInt(process.env.AI_QUOTA_MAX || '100');

function checkAndConsumeQuota(key) {
  const now = Date.now();
  const entry = quotaMap.get(key) || { count: 0, windowStart: now };
  if (now - entry.windowStart > QUOTA_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  if (entry.count >= QUOTA_MAX) return false;
  entry.count += 1;
  quotaMap.set(key, entry);
  return true;
}

// Sitemap endpoint (dynamic based on tools.json)
app.get('/sitemap.xml', (req, res) => {
  try {
    const toolsPath = path.resolve(process.cwd(), 'tools.json');
    const raw = fs.readFileSync(toolsPath, 'utf-8');
    const data = JSON.parse(raw);
    const base = process.env.SITE_URL || data.site?.baseUrl || 'https://devtools-hubpro.netlify.app';
    const staticRoutes = ['/articles', '/about', '/contact', '/privacy', '/terms'];
    const urls = [base, ...(data.tools || []).map(t => `${base}${t.path}`), ...staticRoutes.map(route => `${base}${route}`)];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map(u => `  <url><loc>${u}</loc><priority>0.8</priority></url>`)
      .join('\n')}\n</urlset>`;
    res.header('Content-Type', 'application/xml');
    return res.send(xml);
  } catch (e) {
    console.error('Sitemap generation failed', e);
    return res.status(500).send('Sitemap generation failed');
  }
});

app.post('/api/ai', async (req, res) => {
  const { prompt, systemPrompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid request body. `prompt` is required.' });
  }
  const key = req.ip;
  if (!checkAndConsumeQuota(key)) {
    return res.status(429).json({ error: 'Quota exceeded. Try again later.' });
  }

  try {
    const model = (req.body.model && ALLOWED_MODELS.includes(req.body.model)) ? req.body.model : DEFAULT_MODEL;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt || 'You are a helpful senior software engineer.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Try to parse JSON safely
    let data;
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text().catch(() => null);
      console.error('AI proxy invalid JSON response', text, e);
      return res.status(502).json({ error: 'Invalid response from AI provider.' });
    }

    if (!response.ok) {
      console.error('AI provider error', response.status, data);
      return res.status(502).json({ error: data?.error || 'AI provider returned an error.' });
    }

    // Normalize returned text
    const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || data?.output?.text;
    if (!content) {
      console.error('AI provider returned empty content', data);
      return res.status(502).json({ error: 'AI provider returned an unexpected response.' });
    }

    return res.status(200).json({ success: true, text: content, raw: data });
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('AI proxy timeout');
      return res.status(504).json({ error: 'AI request timed out.' });
    }
    console.error('AI proxy error:', error);
    return res.status(500).json({ error: 'AI service proxy failed.' });
  }
});

app.listen(port, () => {
  console.log(`AI proxy server listening on http://localhost:${port}`);
});

// If Sentry is enabled add error handler
if (SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}
