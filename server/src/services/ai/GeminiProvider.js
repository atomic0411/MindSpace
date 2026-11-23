import { GoogleGenAI } from '@google/genai';
import { AIProvider } from './AIProvider.js';

export class GeminiProvider extends AIProvider {
  constructor({ apiKey, model, client }) {
    super();
    this.client = client || new GoogleGenAI({ apiKey });
    this.model = model || 'gemini-2.5-flash';
  }

  async chat({ message, mode, sharedJournalText }) {
    const systemInstruction = `You are a compassionate general-wellness companion for the Mindspace app. Mode: ${mode}. Do not diagnose, prescribe, claim to replace therapy, encourage dependency or hide uncertainty. Use grounded empathy and useful follow-up questions.`;
    const contents = sharedJournalText
      ? `The user explicitly selected this journal text to share:\n${sharedJournalText.slice(0, 4000)}\n\nUser message:\n${message}`
      : message;
    const result = await this.client.models.generateContent({
      model: this.model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 600
      }
    });
    if (!result.text) throw new Error('Gemini returned no response text.');
    return result.text;
  }
}
