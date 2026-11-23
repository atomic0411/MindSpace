import { describe, expect, it } from 'vitest';
import { assessCrisis, crisisResponse } from '../src/services/ai/safety.js';

describe('AI safety layer', () => {
  it('detects direct self-harm language separately from model output', () => {
    expect(assessCrisis('I want to kill myself')).toBe(true);
    expect(assessCrisis('I feel stressed about work')).toBe(false);
  });

  it('returns immediate-human-support guidance without claiming monitoring', () => {
    const response = crisisResponse();
    expect(response).toMatch(/emergency/i);
    expect(response).toMatch(/trusted person/i);
    expect(response).toMatch(/cannot monitor you/i);
  });

  it('avoids obvious false positives in ordinary wellness text', () => {
    expect(assessCrisis('I need to end this difficult meeting')).toBe(false);
  });
});
