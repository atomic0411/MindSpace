import { describe, expect, it, vi } from 'vitest';
import { GeminiProvider } from '../src/services/ai/GeminiProvider.js';

describe('GeminiProvider', () => {
  it('sends only the current message and explicitly selected journal text', async () => {
    const generateContent = vi.fn().mockResolvedValue({ text: 'A thoughtful response.' });
    const provider = new GeminiProvider({
      apiKey: 'test-key',
      model: 'test-model',
      client: { models: { generateContent } }
    });

    const response = await provider.chat({
      message: 'Help me reflect.',
      mode: 'Reflect',
      sharedJournalText: 'A selected private entry.'
    });

    expect(response).toBe('A thoughtful response.');
    expect(generateContent).toHaveBeenCalledWith({
      model: 'test-model',
      contents: 'The user explicitly selected this journal text to share:\nA selected private entry.\n\nUser message:\nHelp me reflect.',
      config: {
        systemInstruction: expect.stringContaining('Mode: Reflect'),
        temperature: 0.7,
        maxOutputTokens: 600
      }
    });
  });

  it('does not add journal context when none was selected', async () => {
    const generateContent = vi.fn().mockResolvedValue({ text: 'A response.' });
    const provider = new GeminiProvider({
      apiKey: 'test-key',
      client: { models: { generateContent } }
    });

    await provider.chat({ message: 'Hello', mode: 'Talk' });

    expect(generateContent.mock.calls[0][0].contents).toBe('Hello');
  });

  it('reports an empty model response as a provider error', async () => {
    const provider = new GeminiProvider({
      apiKey: 'test-key',
      client: { models: { generateContent: vi.fn().mockResolvedValue({}) } }
    });

    await expect(provider.chat({ message: 'Hello', mode: 'Talk' }))
      .rejects.toThrow('Gemini returned no response text.');
  });
});
