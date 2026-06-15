import { Injectable } from '@nestjs/common';

@Injectable()
export class IngredientNormalizerService {
  private readonly synonymsMap = new Map<string, string>([
    ['extra virgin olive oil', 'olive oil'],
    ['cold pressed olive oil', 'olive oil'],
    ['virgin olive oil', 'olive oil'],
    ['canola oil', 'vegetable oil'],
    ['sunflower oil', 'vegetable oil'],
    ['corn oil', 'vegetable oil'],
    ['kosher salt', 'salt'],
    ['sea salt', 'salt'],
    ['table salt', 'salt'],
    ['fine salt', 'salt'],
    ['granulated sugar', 'sugar'],
    ['white sugar', 'sugar'],
    ['cane sugar', 'sugar'],
    ['confectioners sugar', 'powdered sugar'],
    ['sweet butter', 'butter'],
    ['unsalted butter', 'butter'],
    ['salted butter', 'butter'],
    ['whole milk', 'milk'],
    ['skim milk', 'milk'],
    ['low fat milk', 'milk'],
    ['heavy whipping cream', 'heavy cream'],
    ['boneless skinless chicken breast', 'chicken breast'],
    ['skinless boneless chicken breast', 'chicken breast'],
    ['chicken breast fillets', 'chicken breast'],
    ['chicken breasts', 'chicken breast'],
    ['ground beef chuck', 'ground beef'],
    ['lean ground beef', 'ground beef'],
  ]);

  private readonly noiseWords = new Set([
    'organic',
    'fresh',
    'chopped',
    'diced',
    'sliced',
    'peeled',
    'minced',
    'sieved',
    'grated',
    'shredded',
    'melted',
    'dried',
    'ground',
    'powdered',
    'boneless',
    'skinless',
    'unsalted',
    'salted',
    'cold',
    'hot',
    'warm',
    'large',
    'medium',
    'small',
    'crushed',
    'pure',
    'natural',
    'sifted',
    'cooked',
    'raw',
    'frozen',
    'extra',
    'virgin',
    'fillet',
    'fillets',
    'breast',
    'breasts',
  ]);

  normalize(name: string): string {
    if (!name) return '';

    // Convert to lowercase and strip punctuation/numbers
    let clean = name
      .toLowerCase()
      .replace(/[^a-zA-Z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Check direct synonyms map first
    if (this.synonymsMap.has(clean)) {
      return this.synonymsMap.get(clean)!;
    }

    // Clean word by word to remove noise descriptors
    const words = clean.split(' ');
    const filteredWords = words.filter((word) => !this.noiseWords.has(word));

    let normalized = filteredWords.join(' ').trim();

    // In case filtering everything out left nothing, fall back to original clean
    if (!normalized) {
      normalized = clean;
    }

    // Recheck synonyms map on filtered name
    if (this.synonymsMap.has(normalized)) {
      return this.synonymsMap.get(normalized)!;
    }

    // Standardize pluralizations briefly
    if (normalized.endsWith('s') && !normalized.endsWith('ss') && !normalized.endsWith('us') && !normalized.endsWith('is')) {
      // Remove trailing 's' for basic singular conversion
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  }
}
