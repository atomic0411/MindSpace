import { AIProvider } from './AIProvider.js';

export class GroqProvider extends AIProvider {
  constructor({ apiKey, model }) {
    super();
    this.apiKey = apiKey;
    this.model = model || 'llama-3.3-70b-versatile';
  }

  async chat({ message, mode, sharedJournalText }) {
    if (!this.apiKey) throw new Error('Groq is not configured.');
    const system = `You are a compassionate general-wellness companion for the Mindspace app. Mode: ${mode}. Do not diagnose, prescribe, claim to replace therapy, encourage dependency or hide uncertainty. Use grounded empathy and useful follow-up questions.`;
    const userContent = sharedJournalText
      ? `The user explicitly selected this journal text to share:\n${sharedJournalText.slice(0, 4000)}\n\nUser message:\n${message}`
      : message;
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: userContent }],
        temperature: 0.7,
        max_tokens: 600
      }),
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error('The AI provider is unavailable right now.');
    const payload = await response.json();
    return payload.choices?.[0]?.message?.content || 'I could not generate a response. Please try again.';
  }
}
