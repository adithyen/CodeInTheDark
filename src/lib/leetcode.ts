import { Question, TestCase } from '@/types';

// Curated offline fallback bank for instant LeetCode question importing
const POPULAR_LEETCODE_FALLBACKS: Record<string, Partial<Question>> = {
  'two-sum': {
    title: 'Two Sum (LeetCode #1)',
    category: 'Array & Hash Table',
    difficulty: 'Easy',
    points: 300,
    scenario: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.`,
    inputFormat: `Line 1: N and target\nLine 2: N space-separated integers`,
    outputFormat: `Two space-separated 0-indexed indices (e.g. '0 1')`,
    constraints: `2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9`,
    testCases: [
      { id: 'lc-1', input: '4 9\n2 7 11 15', expectedOutput: '0 1', isHidden: false, explanation: 'nums[0] + nums[1] == 9' },
      { id: 'lc-2', input: '3 6\n3 2 4', expectedOutput: '1 2', isHidden: false },
      { id: 'lc-3', input: '2 6\n3 3', expectedOutput: '0 1', isHidden: true },
    ]
  },
  'valid-parentheses': {
    title: 'Valid Parentheses (LeetCode #20)',
    category: 'String & Stack',
    difficulty: 'Easy',
    points: 300,
    scenario: `Given a string \`s\` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.`,
    inputFormat: `Line 1: The bracket string s`,
    outputFormat: `'true' or 'false'`,
    constraints: `1 <= s.length <= 10^4`,
    testCases: [
      { id: 'lc-20-1', input: '()', expectedOutput: 'true', isHidden: false },
      { id: 'lc-20-2', input: '()[]{}', expectedOutput: 'true', isHidden: false },
      { id: 'lc-20-3', input: '(]', expectedOutput: 'false', isHidden: false },
      { id: 'lc-20-4', input: '([)]', expectedOutput: 'false', isHidden: true },
    ]
  },
  'maximum-subarray': {
    title: 'Maximum Subarray - Kadane (LeetCode #53)',
    category: 'Dynamic Programming & Array',
    difficulty: 'Medium',
    points: 450,
    scenario: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.`,
    inputFormat: `Line 1: N\nLine 2: N space-separated integers`,
    outputFormat: `Single integer: maximum subarray sum`,
    constraints: `1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4`,
    testCases: [
      { id: 'lc-53-1', input: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6', isHidden: false, explanation: '[4,-1,2,1] has the largest sum = 6' },
      { id: 'lc-53-2', input: '1\n1', expectedOutput: '1', isHidden: false },
      { id: 'lc-53-3', input: '5\n5 4 -1 7 8', expectedOutput: '23', isHidden: true },
      { id: 'lc-53-4', input: '3\n-3 -2 -1', expectedOutput: '-1', isHidden: true },
    ]
  },
  'coin-change': {
    title: 'Coin Change (LeetCode #322)',
    category: 'Dynamic Programming',
    difficulty: 'Medium',
    points: 500,
    scenario: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.

Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return -1.`,
    inputFormat: `Line 1: N (number of coin types) and amount\nLine 2: N space-separated coin values`,
    outputFormat: `Single integer: minimum coins or -1`,
    constraints: `1 <= coins.length <= 12\n1 <= coins[i] <= 2^31 - 1\n0 <= amount <= 10^4`,
    testCases: [
      { id: 'lc-322-1', input: '3 11\n1 2 5', expectedOutput: '3', isHidden: false, explanation: '11 = 5 + 5 + 1 (3 coins)' },
      { id: 'lc-322-2', input: '1 3\n2', expectedOutput: '-1', isHidden: false },
      { id: 'lc-322-3', input: '1 0\n1', expectedOutput: '0', isHidden: true },
      { id: 'lc-322-4', input: '4 6249\n186 419 83 408', expectedOutput: '20', isHidden: true },
    ]
  }
};

export async function importLeetCodeQuestion(slugOrUrl: string): Promise<Partial<Question> | null> {
  // Normalize slug from URL or bare slug
  let slug = slugOrUrl.trim().toLowerCase();
  if (slug.includes('leetcode.com/problems/')) {
    const parts = slug.split('leetcode.com/problems/')[1].split('/');
    slug = parts[0];
  }
  slug = slug.replace(/[^a-z0-9-]/g, '');

  // Check fallback bank first
  if (POPULAR_LEETCODE_FALLBACKS[slug]) {
    return POPULAR_LEETCODE_FALLBACKS[slug];
  }

  // Attempt live GraphQL query to LeetCode API
  try {
    const query = `
      query getQuestionDetail($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          title
          difficulty
          content
          exampleTestcaseList
        }
      }
    `;

    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: JSON.stringify({
        query,
        variables: { titleSlug: slug },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const q = data.data?.question;
      if (q) {
        // Strip HTML tags for clean markdown scenario
        const cleanContent = q.content
          ? q.content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
          : '';

        const testCases: TestCase[] = (q.exampleTestcaseList || []).map((inputStr: string, idx: number) => ({
          id: `lc-tc-${idx + 1}`,
          input: inputStr,
          expectedOutput: '', // To be filled by admin or manual sample
          isHidden: idx > 1,
        }));

        return {
          title: `${q.title} (LeetCode #${q.questionId})`,
          category: 'Algorithms & Data Structures',
          difficulty: (q.difficulty as 'Easy' | 'Medium' | 'Hard') || 'Medium',
          points: q.difficulty === 'Easy' ? 300 : q.difficulty === 'Hard' ? 700 : 450,
          scenario: cleanContent,
          inputFormat: 'Standard LeetCode input format',
          outputFormat: 'Standard LeetCode output format',
          constraints: 'See problem description constraints',
          testCases: testCases.length > 0 ? testCases : [
            { id: 'lc-tc-1', input: 'sample_input', expectedOutput: 'sample_output', isHidden: false }
          ],
        };
      }
    }
  } catch (err) {
    console.warn('Failed to query LeetCode GraphQL:', err);
  }

  return null;
}
