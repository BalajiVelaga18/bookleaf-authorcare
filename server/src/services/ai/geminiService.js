import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../../config/index.js';
import { AIUsageLog } from '../../models/index.js';
import { getRelevantKbSections } from '../../knowledge-base/index.js';

let genAI = null;

export function initAI() {
  if (!config.ai.enabled || !config.ai.apiKey) return null;
  if (!genAI) {
    genAI = new GoogleGenAI({ apiKey: config.ai.apiKey });
  }
  return genAI;
}

export function isAIConfigured() {
  return config.ai.enabled && !!config.ai.apiKey;
}

async function callGemini({ operation, prompt, jsonSchema, ticketId = null }) {
  const ai = initAI();
  const start = Date.now();
  let success = false;
  let errorMessage = null;
  let inputTokens = null;
  let outputTokens = null;

  if (!ai) {
    return { success: false, error: 'AI not configured', fallback: true };
  }

  let lastError = null;
  for (let attempt = 0; attempt <= config.ai.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.ai.timeoutMs);

      const result = await ai.models.generateContent({
        model: config.ai.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: jsonSchema,
        },
      }, { signal: controller.signal });

      clearTimeout(timeout);

      const raw = result.text || '';
      inputTokens = result.usageMetadata?.promptTokenCount ?? null;
      outputTokens = result.usageMetadata?.candidatesTokenCount ?? null;
      success = true;

      return {
        success: true,
        raw,
        inputTokens,
        outputTokens,
        model: config.ai.model,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      lastError = err;
      errorMessage = err.message;
      if (err.name === 'AbortError') {
        errorMessage = 'AI request timed out';
      }
      const retryable = err.message?.includes('503') || err.message?.includes('429') || err.message?.includes('timeout') || err.name === 'AbortError';
      if (!retryable || attempt === config.ai.maxRetries) break;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  const durationMs = Date.now() - start;
  return {
    success: false,
    error: errorMessage || lastError?.message,
    fallback: true,
    model: config.ai.model,
    durationMs,
  };
}

export async function classifyTicket({ subject, description, bookContext, ticketId }) {
  const prompt = buildClassificationPrompt(subject, description, bookContext);

  const schema = {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        enum: [
          'Royalty & Payments',
          'ISBN & Metadata Issues',
          'Printing & Quality',
          'Distribution & Availability',
          'Book Status & Production Updates',
          'General Inquiry',
        ],
      },
      priority: { type: Type.STRING, enum: ['Critical', 'High', 'Medium', 'Low'] },
      categoryRationale: { type: Type.STRING },
      priorityRationale: { type: Type.STRING },
      confidence: { type: Type.STRING, enum: ['High', 'Medium', 'Low', 'Uncertain'] },
      missingInfo: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ['category', 'priority', 'categoryRationale', 'priorityRationale', 'confidence', 'missingInfo'],
  };

  const result = await callGemini({ operation: 'classify', prompt, jsonSchema: schema, ticketId });

  await AIUsageLog.create({
    ticket: ticketId,
    operation: 'classify',
    model: config.ai.model,
    success: result.success,
    errorMessage: result.success ? null : result.error,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    durationMs: result.durationMs,
  });

  if (!result.success) {
    return { success: false, error: result.error, fallback: true };
  }

  try {
    const parsed = JSON.parse(result.raw);
    return { success: true, data: parsed, model: config.ai.model };
  } catch (err) {
    return { success: false, error: 'Failed to parse AI classification', fallback: true };
  }
}

export async function draftResponse({ ticket, book, previousMessages, author, ticketId }) {
  const prompt = buildDraftPrompt({ ticket, book, previousMessages, author });

  const schema = {
    type: Type.OBJECT,
    properties: {
      subject: { type: Type.STRING },
      body: { type: Type.STRING },
      nextStep: { type: Type.STRING },
      timeline: { type: Type.STRING },
    },
    required: ['subject', 'body', 'nextStep', 'timeline'],
  };

  const result = await callGemini({ operation: 'draft', prompt, jsonSchema: schema, ticketId });

  await AIUsageLog.create({
    ticket: ticketId,
    operation: 'draft',
    model: config.ai.model,
    success: result.success,
    errorMessage: result.success ? null : result.error,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    durationMs: result.durationMs,
  });

  if (!result.success) {
    return { success: false, error: result.error, fallback: true };
  }

  try {
    const parsed = JSON.parse(result.raw);
    return { success: true, data: parsed, model: config.ai.model };
  } catch (err) {
    return { success: false, error: 'Failed to parse AI draft', fallback: true };
  }
}

function buildClassificationPrompt(subject, description, bookContext) {
  return `You are a support classifier for BookLeaf Publishing. Classify the following author support ticket into exactly one category and one priority level.

BookLeaf Publishing policies:
- Author receives 80% of net profit; BookLeaf 20%. Royalties quarterly, paid within 45 days after quarter end. Minimum payout ₹1,000; balances roll over.
- ISBNs are unique and registered under BookLeaf's imprint. Mismatches or duplicates are high-priority and escalated to production.
- Print turnaround 5–7 business days. Verified defects (misprints, binding, color) qualify for free reprint.
- Distribution platforms: Amazon India, Flipkart, Amazon US, Amazon UK, BookLeaf Store. Listings go live 7–10 business days after publication. Resync takes 24–48 hours.
- Production workflow: Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live.

Categories:
1. Royalty & Payments
2. ISBN & Metadata Issues
3. Printing & Quality
4. Distribution & Availability
5. Book Status & Production Updates
6. General Inquiry

Priority guidelines:
- Critical: severe financial harm, widespread distribution failure, repeated severe quality defects, security/privacy concern.
- High: overdue royalty with significant amount, ISBN mismatch, major quality issue, production delay affecting launch.
- Medium: distribution availability, minor metadata update, moderate production question.
- Low: routine informational question, minor clarification.

Book context: ${bookContext || 'None provided (general/account-level ticket).'}

Ticket subject: ${subject}
Ticket description: ${description}

Return ONLY a JSON object with keys: category, priority, categoryRationale, priorityRationale, confidence (High/Medium/Low/Uncertain), missingInfo (array of strings). Do not include markdown or explanations outside the JSON.`;
}

function formatBookContext(book) {
  if (!book) return 'No specific book selected.';
  const fields = [
    `Title: ${book.title || 'N/A'}`,
    `ISBN: ${book.isbn || 'N/A'}`,
    `Status: ${book.status || 'N/A'}`,
    `MRP: ${book.mrp != null ? '₹' + book.mrp : 'N/A'}`,
    `Copies sold: ${book.totalCopiesSold ?? 0}`,
    `Total royalty earned: ${book.totalRoyaltyEarned ? '₹' + book.totalRoyaltyEarned : '₹0'}`,
    `Royalty paid: ${book.royaltyPaid ? '₹' + book.royaltyPaid : '₹0'}`,
    `Royalty pending: ${book.royaltyPending ? '₹' + book.royaltyPending : '₹0'}`,
    `Last payout: ${book.lastRoyaltyPayoutDate ? new Date(book.lastRoyaltyPayoutDate).toLocaleDateString('en-IN') : 'None'}`,
    `Print partner: ${book.printPartner || 'N/A'}`,
    `Available on: ${(book.availableOn || []).join(', ') || 'N/A'}`,
  ];
  return fields.join('\n');
}

function buildDraftPrompt({ ticket, book, previousMessages, author }) {
  const kb = getRelevantKbSections(ticket.category || ticket.aiCategory || 'General Inquiry').join('\n\n');

  return `You are a BookLeaf Publishing support representative drafting a response to an author. Use the following verified facts and policies only. Do not invent dates, statuses, payouts, or actions already taken.

BookLeaf policies relevant to this ticket:
${kb}

Author: ${author?.name || 'Author'} (${author?.email || 'N/A'})
Book context:
${formatBookContext(book)}

Ticket subject: ${ticket.subject}
Ticket description: ${ticket.description}
Category: ${ticket.category || ticket.aiCategory || 'General Inquiry'}
Priority: ${ticket.priority || ticket.aiPriority || 'Medium'}

Previous public messages (most recent first, last 3 only):
${(previousMessages || []).slice(-3).map((m) => `${m.senderRole}: ${m.body}`).join('\n---\n') || 'No previous messages.'}

Communication tone: empathetic and professional. Acknowledge the concern before proposing a solution. Use specific figures, dates, and statuses only when supported by actual data above. Give clear escalation timelines, including 48 hours where investigation is needed. End with a concrete next step. Keep the response concise (3–6 short paragraphs).

Return ONLY a JSON object with keys: subject (concise), body (full response), nextStep (one sentence), timeline (e.g. "within 48 hours" or "5–7 business days"). Do not include markdown or explanations outside the JSON.`;
}
