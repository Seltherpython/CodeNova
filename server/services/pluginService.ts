import crypto from "crypto";

/**
 * Generates random identifiers based on a seed string.
 * It takes the unique letters from the seed and generates random numbers
 * prefixed by those letters.
 */
export function generateRandomIdentifiers(seed: string, count: number = 5): string[] {
  if (!seed) return [];
  
  // Extract unique letters from the seed
  const letters = Array.from(new Set(seed.replace(/[^a-zA-Z]/g, '').toLowerCase().split('')));
  
  if (letters.length === 0) {
    // Fallback if no letters are present
    letters.push('z');
  }

  const identifiers: string[] = [];
  for (let i = 0; i < count; i++) {
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4 digit random number
    identifiers.push(`${randomLetter.toUpperCase()}-${randomNumber}`);
  }

  return identifiers;
}
