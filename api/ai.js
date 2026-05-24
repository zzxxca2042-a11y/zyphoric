const AI_TIMEOUT_MS = Number.parseInt(process.env.AI_TIMEOUT_MS || '15000', 10);
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const ALLOWED_MODELS = new Set([
  'llama-3.1-8b-instant',
  'llama-3.1-70b-versatile',
  'llama-3.3-70b-versatile',
]);

// Simple in-memory quota map (function instance-lifetime)
const quotaMap = new Map();
const QUOTA_WINDOW_MS = 60 * 60 * 1000;
const QUOTA_MAX = Number.parseInt(process.env.AI_QUOTA_MAX || '100', 10);

const consumeQuota = (key) => {
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
};

const getClientKey = (event) =>
  (event.headers && (event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For']))?.split(',')[0]?.trim() ||
  (event.headers && (event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'])) ||
  'anonymous';

async function runAiEndpoint({ method, body, clientIp }) {
  if (method !== 'POST') {
    return { statusCode: 405, headers: { Allow: 'POST' }, body: { error: 'Method not allowed.' } };
  }

  const prompt = body?.prompt;
  const systemPrompt = body?.systemPrompt;
  if (!prompt || typeof prompt !== 'string') {
    return { statusCode: 400, body: { error: 'Invalid request body. `prompt` is required.' } };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { statusCode: 503, body: { error: 'AI service is not configured.' } };
  }

  if (!consumeQuota(clientIp)) {
    return { statusCode: 429, body: { error: 'Quota exceeded. Try again later.' } };
  }

  const model = ALLOWED_MODELS.has(body?.model) ? body.model : DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const GROQ_API_BASE = process.env.GROQ_API_BASE || 'https://api.groq.com/openai/v1';
    const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
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

    let data;
    try {
      data = await response.json();
    } catch (err) {
      clearTimeout(timeout);
      return { statusCode: 502, body: { error: 'Invalid response from AI provider.' } };
    }

    if (!response.ok) {
      clearTimeout(timeout);
      return { statusCode: 502, body: { error: data?.error?.message || 'AI provider returned an error.' } };
    }

    const text = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || data?.output?.text;
    if (!text) {
      clearTimeout(timeout);
      return { statusCode: 502, body: { error: 'AI provider returned an unexpected response.' } };
    }

    clearTimeout(timeout);
    return { statusCode: 200, body: { success: true, text } };
  } catch (error) {
    clearTimeout(timeout);
    if (error?.name === 'AbortError') {
      return { statusCode: 504, body: { error: 'AI request timed out.' } };
    }
    return { statusCode: 500, body: { error: 'AI service proxy failed.' } };
  }
}

// Netlify Function Handler
export async function handler(event, context) {
  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body.' }) };
  }

  const clientIp = getClientKey(event);
  const result = await runAiEndpoint({
    method: event.httpMethod,
    body,
    clientIp,
  });

  return {
    statusCode: result.statusCode,
    headers: result.headers,
    body: JSON.stringify(result.body),
  };
}
