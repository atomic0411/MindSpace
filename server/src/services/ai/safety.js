const crisisPatterns = [
  /\b(suicide|suicidal|kill myself|end my life|self-harm|hurt myself)\b/i,
  /\b(can't go on|cannot go on|do not want to live|don't want to live)\b/i,
  /\b(overdose|no reason to live)\b/i
];

export function assessCrisis(message) {
  return crisisPatterns.some(pattern => pattern.test(message));
}

export function crisisResponse() {
  return 'I am sorry you are carrying this much pain. If you might act on these thoughts or are in immediate danger, contact local emergency services or go to the nearest emergency department now, and tell a trusted person so you are not alone. If you can, call or text a verified crisis line in your region. Mindspace cannot monitor you or contact help on your behalf.';
}
