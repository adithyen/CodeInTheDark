import { Question, TestCase } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// HTML EXAMPLE PARSER — extracts Input/Output/Explanation from LeetCode HTML
// ─────────────────────────────────────────────────────────────────────────────
function parseExamplesFromHtml(html: string): Array<{ input: string; output: string; explanation?: string }> {
  const examples: Array<{ input: string; output: string; explanation?: string }> = [];
  const clean = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|ul|ol|pre)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  const exampleBlocks = clean.split(/Example\s+\d+\s*:/i).slice(1);
  for (const block of exampleBlocks) {
    const inputMatch = block.match(/Input\s*:\s*([\s\S]*?)(?=Output\s*:|$)/i);
    const outputMatch = block.match(/Output\s*:\s*([\s\S]*?)(?=Explanation\s*:|Example\s|Constraints\s*:|$)/i);
    const explMatch = block.match(/Explanation\s*:\s*([\s\S]*?)(?=Example\s|Constraints\s*:|$)/i);
    if (inputMatch && outputMatch) {
      examples.push({
        input: inputMatch[1].trim(),
        output: outputMatch[1].trim(),
        explanation: explMatch ? explMatch[1].trim() : undefined,
      });
    }
  }
  return examples;
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTER TEMPLATE BUILDER — wraps LeetCode class snippets in stdin main()
// ─────────────────────────────────────────────────────────────────────────────
function buildStarterTemplates(langSnippets: Array<{ langSlug: string; code: string }> | null) {
  const find = (lang: string) =>
    (langSnippets || []).find(s => s.langSlug === lang)?.code?.trim() ?? null;

  const pySnippet = find('python3') || find('python');
  const cSnippet = find('c');
  const javaSnippet = find('java');

  return {
    python: pySnippet
      ? `import sys\n\n${pySnippet}\n\ndef main():\n    data = sys.stdin.read().split()\n    # TODO: parse input and call your solution\n    pass\n\nif __name__ == '__main__':\n    main()`
      : `import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    # Write your solution here\n    pass\n\nif __name__ == '__main__':\n    main()`,
    c: cSnippet
      ? `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\n${cSnippet}\n\nint main() {\n    // TODO: read input and call solution above\n    return 0;\n}`
      : `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
    java: javaSnippet
      ? `import java.util.*;\n\npublic class Main {\n${javaSnippet}\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // TODO: read input and call solution above\n    }\n}`
      : `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n    }\n}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CURATED OFFLINE FALLBACK BANK — proper starters, examples, expected outputs
// ─────────────────────────────────────────────────────────────────────────────
const POPULAR_LEETCODE_FALLBACKS: Record<string, Partial<Question>> = {
  'two-sum': {
    title: 'Two Sum (LeetCode #1)',
    category: 'Array & Hash Table',
    difficulty: 'Easy',
    points: 300,
    scenario: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nExample 1:\nInput: nums = [2,7,11,15], target = 9\nOutput: 0 1\nExplanation: nums[0] + nums[1] == 9\n\nExample 2:\nInput: nums = [3,2,4], target = 6\nOutput: 1 2\n\nExample 3:\nInput: nums = [3,3], target = 6\nOutput: 0 1`,
    inputFormat: `Line 1: N and target\nLine 2: N space-separated integers`,
    outputFormat: `Two space-separated 0-indexed indices (e.g. '0 1')`,
    constraints: `2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.`,
    starterTemplates: {
      python: `import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n, target = int(data[0]), int(data[1])\n    nums = [int(x) for x in data[2:2+n]]\n    # Write your solution here\n    # print(i, j)\n\nif __name__ == '__main__':\n    main()`,
      c: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    int n;\n    long long target;\n    scanf("%d %lld", &n, &target);\n    long long *nums = (long long *)malloc(sizeof(long long) * n);\n    for (int i = 0; i < n; i++) scanf("%lld", &nums[i]);\n    // Write your solution here\n    // printf("%d %d\\n", i, j);\n    free(nums);\n    return 0;\n}`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        long target = sc.nextLong();\n        long[] nums = new long[n];\n        for (int i = 0; i < n; i++) nums[i] = sc.nextLong();\n        // Write your solution here\n        // System.out.println(i + " " + j);\n    }\n}`,
    },
    testCases: [
      { id: 'lc-1-1', input: '4 9\n2 7 11 15', expectedOutput: '0 1', isHidden: false, explanation: 'nums[0] + nums[1] == 9' },
      { id: 'lc-1-2', input: '3 6\n3 2 4', expectedOutput: '1 2', isHidden: false },
      { id: 'lc-1-3', input: '2 6\n3 3', expectedOutput: '0 1', isHidden: true },
      { id: 'lc-1-4', input: '5 13\n2 11 7 15 4', expectedOutput: '0 2', isHidden: true },
    ],
  },
  'valid-parentheses': {
    title: 'Valid Parentheses (LeetCode #20)',
    category: 'String & Stack',
    difficulty: 'Easy',
    points: 300,
    scenario: `Given a string \`s\` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\n\nExample 1:\nInput: s = "()" → Output: true\n\nExample 2:\nInput: s = "()[]{}" → Output: true\n\nExample 3:\nInput: s = "(]" → Output: false`,
    inputFormat: `Line 1: The bracket string s`,
    outputFormat: `'true' or 'false'`,
    constraints: `1 <= s.length <= 10^4\ns consists of parentheses only '()[]{}'`,
    starterTemplates: {
      python: `import sys\n\ndef main():\n    s = sys.stdin.read().strip()\n    # Write your solution here\n    # print(True or False)\n\nif __name__ == '__main__':\n    main()`,
      c: `#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char s[10005];\n    if (scanf("%s", s) != 1) return 0;\n    // Write your solution here\n    // printf("true\\n"); or printf("false\\n");\n    return 0;\n}`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.next();\n        // Write your solution here\n        // System.out.println(true or false);\n    }\n}`,
    },
    testCases: [
      { id: 'lc-20-1', input: '()', expectedOutput: 'true', isHidden: false },
      { id: 'lc-20-2', input: '()[]{}', expectedOutput: 'true', isHidden: false },
      { id: 'lc-20-3', input: '(]', expectedOutput: 'false', isHidden: false },
      { id: 'lc-20-4', input: '([)]', expectedOutput: 'false', isHidden: true },
      { id: 'lc-20-5', input: '{[]}', expectedOutput: 'true', isHidden: true },
    ],
  },
  'maximum-subarray': {
    title: 'Maximum Subarray (LeetCode #53)',
    category: 'Dynamic Programming & Array',
    difficulty: 'Medium',
    points: 450,
    scenario: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.\n\nExample 1:\nInput: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: [4,-1,2,1] has the largest sum 6.\n\nExample 2:\nInput: nums = [1]\nOutput: 1\n\nExample 3:\nInput: nums = [5,4,-1,7,8]\nOutput: 23`,
    inputFormat: `Line 1: N\nLine 2: N space-separated integers`,
    outputFormat: `Single integer: maximum subarray sum`,
    constraints: `1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4`,
    starterTemplates: {
      python: `import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n = int(data[0])\n    nums = [int(x) for x in data[1:1+n]]\n    # Kadane's algorithm\n    # print(max_sum)\n\nif __name__ == '__main__':\n    main()`,
      c: `#include <stdio.h>\n\nint main() {\n    int n;\n    scanf("%d", &n);\n    long long nums[100005];\n    for (int i = 0; i < n; i++) scanf("%lld", &nums[i]);\n    // Write your solution here\n    return 0;\n}`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        long[] nums = new long[n];\n        for (int i = 0; i < n; i++) nums[i] = sc.nextLong();\n        // Write your solution here\n        // System.out.println(maxSum);\n    }\n}`,
    },
    testCases: [
      { id: 'lc-53-1', input: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6', isHidden: false, explanation: '[4,-1,2,1] has the largest sum = 6' },
      { id: 'lc-53-2', input: '1\n1', expectedOutput: '1', isHidden: false },
      { id: 'lc-53-3', input: '5\n5 4 -1 7 8', expectedOutput: '23', isHidden: true },
      { id: 'lc-53-4', input: '3\n-3 -2 -1', expectedOutput: '-1', isHidden: true },
    ],
  },
  'coin-change': {
    title: 'Coin Change (LeetCode #322)',
    category: 'Dynamic Programming',
    difficulty: 'Medium',
    points: 500,
    scenario: `You are given an integer array \`coins\` representing coins of different denominations and an integer \`amount\` representing a total amount of money.\n\nReturn the fewest number of coins that you need to make up that amount. If that amount cannot be made up, return -1.\n\nExample 1:\nInput: coins = [1,2,5], amount = 11\nOutput: 3\nExplanation: 11 = 5 + 5 + 1\n\nExample 2:\nInput: coins = [2], amount = 3\nOutput: -1\n\nExample 3:\nInput: coins = [1], amount = 0\nOutput: 0`,
    inputFormat: `Line 1: N (number of coin types) and amount\nLine 2: N space-separated coin values`,
    outputFormat: `Single integer: minimum coins or -1`,
    constraints: `1 <= coins.length <= 12\n1 <= coins[i] <= 2^31 - 1\n0 <= amount <= 10^4`,
    starterTemplates: {
      python: `import sys\n\ndef main():\n    data = sys.stdin.read().split()\n    n, amount = int(data[0]), int(data[1])\n    coins = [int(x) for x in data[2:2+n]]\n    # Write your DP solution here\n    # print(min_coins)  # or print(-1)\n\nif __name__ == '__main__':\n    main()`,
      c: `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n#include <limits.h>\n\nint main() {\n    int n, amount;\n    scanf("%d %d", &n, &amount);\n    int coins[15];\n    for (int i = 0; i < n; i++) scanf("%d", &coins[i]);\n    // Write your DP solution here\n    return 0;\n}`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt(), amount = sc.nextInt();\n        int[] coins = new int[n];\n        for (int i = 0; i < n; i++) coins[i] = sc.nextInt();\n        // Write your DP solution here\n        // System.out.println(result);\n    }\n}`,
    },
    testCases: [
      { id: 'lc-322-1', input: '3 11\n1 2 5', expectedOutput: '3', isHidden: false, explanation: '11 = 5 + 5 + 1' },
      { id: 'lc-322-2', input: '1 3\n2', expectedOutput: '-1', isHidden: false },
      { id: 'lc-322-3', input: '1 0\n1', expectedOutput: '0', isHidden: true },
      { id: 'lc-322-4', input: '4 6249\n186 419 83 408', expectedOutput: '20', isHidden: true },
    ],
  },
  'climbing-stairs': {
    title: 'Climbing Stairs (LeetCode #70)',
    category: 'Dynamic Programming',
    difficulty: 'Easy',
    points: 300,
    scenario: `You are climbing a staircase. It takes \`n\` steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?\n\nExample 1:\nInput: n = 2\nOutput: 2\nExplanation: 1+1, or 2\n\nExample 2:\nInput: n = 3\nOutput: 3\nExplanation: 1+1+1, 1+2, 2+1`,
    inputFormat: `Line 1: Integer n`,
    outputFormat: `Single integer: number of distinct ways`,
    constraints: `1 <= n <= 45`,
    starterTemplates: {
      python: `import sys\n\ndef main():\n    n = int(sys.stdin.read().strip())\n    # Write your DP / Fibonacci solution here\n    # print(ways)\n\nif __name__ == '__main__':\n    main()`,
      c: `#include <stdio.h>\n\nint main() {\n    int n;\n    scanf("%d", &n);\n    // Write your solution here\n    return 0;\n}`,
      java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        // Write your solution here\n        // System.out.println(ways);\n    }\n}`,
    },
    testCases: [
      { id: 'lc-70-1', input: '2', expectedOutput: '2', isHidden: false },
      { id: 'lc-70-2', input: '3', expectedOutput: '3', isHidden: false },
      { id: 'lc-70-3', input: '10', expectedOutput: '89', isHidden: true },
      { id: 'lc-70-4', input: '45', expectedOutput: '1836311903', isHidden: true },
    ],
  },
};

export async function importLeetCodeQuestion(slugOrUrl: string): Promise<Partial<Question> | null> {
  let slug = slugOrUrl.trim().toLowerCase();
  if (slug.includes('leetcode.com/problems/')) {
    const parts = slug.split('leetcode.com/problems/')[1].split('/');
    slug = parts[0];
  }
  slug = slug.replace(/[^a-z0-9-]/g, '');

  // Offline fallback first
  if (POPULAR_LEETCODE_FALLBACKS[slug]) {
    return POPULAR_LEETCODE_FALLBACKS[slug];
  }

  // Live LeetCode GraphQL — fetch description, examples, AND code snippets
  try {
    const query = `
      query getQuestionDetail($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          title
          difficulty
          content
          exampleTestcaseList
          sampleTestCase
          codeSnippets {
            langSlug
            code
          }
        }
      }
    `;

    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://leetcode.com',
      },
      body: JSON.stringify({ query, variables: { titleSlug: slug } }),
    });

    if (res.ok) {
      const data = await res.json();
      const q = data.data?.question;
      if (q) {
        const cleanContent = q.content
          ? q.content
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<\/?(p|div|li|ul|ol|pre)[^>]*>/gi, '\n')
              .replace(/<[^>]+>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/\n{3,}/g, '\n\n')
              .trim()
          : '';

        // Parse examples to get expected outputs
        const parsedExamples = q.content ? parseExamplesFromHtml(q.content) : [];

        const testCases: TestCase[] = (q.exampleTestcaseList || []).map((inputStr: string, idx: number) => ({
          id: `lc-tc-${idx + 1}`,
          input: inputStr,
          expectedOutput: parsedExamples[idx]?.output ?? '',
          isHidden: idx >= 2,
          explanation: parsedExamples[idx]?.explanation,
        }));

        if (testCases.length === 0) {
          testCases.push({
            id: 'lc-tc-1',
            input: q.sampleTestCase || '',
            expectedOutput: '',
            isHidden: false,
          });
        }

        return {
          title: `${q.title} (LeetCode #${q.questionId})`,
          category: 'Algorithms & Data Structures',
          difficulty: (q.difficulty as 'Easy' | 'Medium' | 'Hard') || 'Medium',
          points: q.difficulty === 'Easy' ? 300 : q.difficulty === 'Hard' ? 700 : 450,
          scenario: cleanContent,
          inputFormat: 'Read from stdin — see problem examples above for input format',
          outputFormat: 'Print to stdout — see expected output in examples above',
          constraints: 'See problem description constraints section',
          starterTemplates: buildStarterTemplates(q.codeSnippets || null),
          testCases,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to query LeetCode GraphQL:', err);
  }

  return null;
}