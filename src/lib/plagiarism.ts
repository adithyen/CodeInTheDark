/**
 * Plagiarism and Code Similarity Detection Utility for Code In The Dark
 * Calculates token-level and n-gram similarity between two code submissions.
 */

export interface SimilarityResult {
  similarityScore: number; // 0 to 100
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  commonTokensCount: number;
  totalTokensA: number;
  totalTokensB: number;
  sharedPhrases: string[];
}

// Strip comments and extra whitespace from code
function cleanCode(code: string): string {
  return code
    // Remove multi-line comments /* ... */
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove python multi-line quotes """ ... """ or ''' ... '''
    .replace(/"""[\s\S]*?"""/g, '')
    .replace(/'''[\s\S]*?'''/g, '')
    // Remove single line comments // or #
    .replace(/\/\/.*$/gm, '')
    .replace(/#.*$/gm, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Tokenize into programming syntactic tokens
function tokenizeCode(code: string): string[] {
  const cleaned = cleanCode(code);
  // Match identifiers, numbers, operators, brackets
  const tokenRegex = /[a-zA-Z_]\w*|\d+|==|!=|<=|>=|&&|\|\||\+\+|--|[+\-*/%=<>!&|^~?:;,.(){}\[\]]/g;
  return cleaned.match(tokenRegex) || [];
}

// Generate N-grams from token array
function generateNGrams(tokens: string[], n = 3): Set<string> {
  const nGrams = new Set<string>();
  if (tokens.length < n) {
    if (tokens.length > 0) nGrams.add(tokens.join(' '));
    return nGrams;
  }
  for (let i = 0; i <= tokens.length - n; i++) {
    nGrams.add(tokens.slice(i, i + n).join(' '));
  }
  return nGrams;
}

/**
 * Calculates multi-dimensional code similarity between code A and code B
 */
export function calculateCodeSimilarity(codeA: string, codeB: string): SimilarityResult {
  if (!codeA.trim() || !codeB.trim()) {
    return {
      similarityScore: 0,
      riskLevel: 'LOW',
      commonTokensCount: 0,
      totalTokensA: 0,
      totalTokensB: 0,
      sharedPhrases: [],
    };
  }

  const tokensA = tokenizeCode(codeA);
  const tokensB = tokenizeCode(codeB);

  if (tokensA.length === 0 || tokensB.length === 0) {
    return {
      similarityScore: 0,
      riskLevel: 'LOW',
      commonTokensCount: 0,
      totalTokensA: tokensA.length,
      totalTokensB: tokensB.length,
      sharedPhrases: [],
    };
  }

  // 1. Token Bag Jaccard Overlap
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let tokenIntersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) tokenIntersection++;
  });
  const tokenUnion = setA.size + setB.size - tokenIntersection;
  const tokenJaccard = tokenUnion > 0 ? tokenIntersection / tokenUnion : 0;

  // 2. 3-Gram Structural Sequence Match
  const nGramsA = generateNGrams(tokensA, 3);
  const nGramsB = generateNGrams(tokensB, 3);
  let nGramIntersection = 0;
  const sharedPhrasesList: string[] = [];

  nGramsA.forEach((ngram) => {
    if (nGramsB.has(ngram)) {
      nGramIntersection++;
      if (sharedPhrasesList.length < 5) {
        sharedPhrasesList.push(ngram);
      }
    }
  });

  const nGramUnion = nGramsA.size + nGramsB.size - nGramIntersection;
  const nGramJaccard = nGramUnion > 0 ? nGramIntersection / nGramUnion : 0;

  // 3. Length Ratio Dampener
  const lengthRatio = Math.min(tokensA.length, tokensB.length) / Math.max(tokensA.length, tokensB.length);

  // Combined Weighted Similarity Score (0 to 100)
  // Structural n-grams carry 65% weight, token bag carries 35% weight
  const rawScore = (nGramJaccard * 0.65 + tokenJaccard * 0.35) * lengthRatio * 100;
  const similarityScore = Math.min(100, Math.round(rawScore));

  let riskLevel: SimilarityResult['riskLevel'] = 'LOW';
  if (similarityScore >= 80) {
    riskLevel = 'CRITICAL';
  } else if (similarityScore >= 60) {
    riskLevel = 'HIGH';
  } else if (similarityScore >= 35) {
    riskLevel = 'MODERATE';
  }

  return {
    similarityScore,
    riskLevel,
    commonTokensCount: tokenIntersection,
    totalTokensA: tokensA.length,
    totalTokensB: tokensB.length,
    sharedPhrases: sharedPhrasesList,
  };
}
