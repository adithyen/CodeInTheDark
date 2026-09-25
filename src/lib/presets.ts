import { Question } from '@/types';
import { DEFAULT_QUESTIONS } from './store';

export interface RoundPreset {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  questions: Question[];
}

export const ROUND_PRESETS: RoundPreset[] = [
  {
    id: 'round-1-qualifying',
    name: 'Round 1: Preliminary Algorithmic Marathon',
    description: '4 real-world logistics, caching, and network optimization scenarios.',
    durationMinutes: 50,
    questions: [...DEFAULT_QUESTIONS],
  },
  {
    id: 'round-2-semis',
    name: 'Round 2: Semi-Finals Deep Tech',
    description: '3 higher-difficulty challenges focused on monotonic queues, sliding windows, and bit manipulation.',
    durationMinutes: 45,
    questions: [
      {
        id: 'q-semi-1',
        order: 1,
        title: 'High-Frequency Stream Window Maxima',
        category: 'Monotonic Queue & Streaming',
        difficulty: 'Medium',
        points: 450,
        scenario: `A financial exchange processes real-time ticker quotes. Given a sliding window of size $K$ sliding across a quote stream of length $N$, compute the maximum price observed in each contiguous window position.`,
        inputFormat: `Line 1: Two space-separated integers $N$ (quote count) and $K$ (window size).\nLine 2: $N$ space-separated integers representing prices.`,
        outputFormat: `Print the space-separated maximums for each window from left to right.`,
        constraints: `1 <= K <= N <= 10^5\n-10^9 <= price[i] <= 10^9`,
        starterTemplates: {
          python: `import sys\n\ndef main():\n    lines = sys.stdin.read().split()\n    if not lines: return\n    n, k = int(lines[0]), int(lines[1])\n    nums = [int(x) for x in lines[2:2+n]]\n    # Blind solution here\n\nif __name__ == '__main__':\n    main()`,
          c: `#include <stdio.h>\n#include <stdlib.h>\n\nint main() {\n    int n, k;\n    if (scanf("%d %d", &n, &k) != 2) return 0;\n    // Blind solution here\n    return 0;\n}`,
          java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (!sc.hasNextInt()) return;\n        int n = sc.nextInt();\n        int k = sc.nextInt();\n        // Blind solution here\n    }\n}`,
        },
        testCases: [
          {
            id: 'semi-tc-1',
            input: '8 3\n1 3 -1 -3 5 3 6 7',
            expectedOutput: '3 3 5 5 6 7',
            isHidden: false,
            explanation: 'Sliding window max values.',
          },
          {
            id: 'semi-tc-2',
            input: '1 1\n42',
            expectedOutput: '42',
            isHidden: true,
            explanation: 'Single element window.',
          },
        ],
      },
      {
        id: 'q-semi-2',
        order: 2,
        title: 'The Subnet IP Collision Resolver',
        category: 'Trie & Bitwise Subnets',
        difficulty: 'Hard',
        points: 600,
        scenario: `A core router maintains CIDR prefix routing tables. Given $N$ binary routing bit-patterns, compute the maximum XOR metric achievable between any pair of distinct routing addresses to measure diversity.`,
        inputFormat: `Line 1: An integer $N$.\nLine 2: $N$ space-separated integers.`,
        outputFormat: `Print a single integer: the maximum XOR value between any two numbers.`,
        constraints: `2 <= N <= 50,000\n0 <= value[i] <= 2^31 - 1`,
        starterTemplates: {
          python: `import sys\ndef main():\n    data = sys.stdin.read().split()\n    if not data: return\n    n = int(data[0])\n    nums = [int(x) for x in data[1:1+n]]\n    # Compute max XOR\nif __name__ == '__main__':\n    main()`,
          c: `#include <stdio.h>\nint main() {\n    // Code here\n    return 0;\n}`,
          java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // Code here\n    }\n}`,
        },
        testCases: [
          {
            id: 'semi-tc-3',
            input: '6\n3 10 5 25 2 8',
            expectedOutput: '28',
            isHidden: false,
            explanation: '5 XOR 25 = 28.',
          },
        ],
      },
    ],
  },
  {
    id: 'round-3-finals',
    name: 'Round 3: Championship Grand Finals',
    description: 'Elite algorithmic endurance. Complex dynamic programming & graph traversal.',
    durationMinutes: 40,
    questions: [
      {
        id: 'q-final-1',
        order: 1,
        title: 'Autonomous Rover Trajectory Synchronization',
        category: 'Dynamic Programming & State Compression',
        difficulty: 'Hard',
        points: 800,
        scenario: `Two rovers start simultaneously at coordinates $(0, 0)$ of an $N \\times M$ hazardous grid and must navigate to $(N-1, M-1)$. Both collect minerals at visited cells, but if both visit the same cell, minerals are collected only once. Maximize total minerals collected.`,
        inputFormat: `Line 1: Two integers $N$ and $M$.\nNext $N$ lines: $M$ space-separated integers representing mineral counts.`,
        outputFormat: `Print the maximum combined mineral yield.`,
        constraints: `1 <= N, M <= 100\n0 <= grid[i][j] <= 1000`,
        starterTemplates: {
          python: `import sys\ndef main():\n    lines = sys.stdin.read().split()\n    if not lines: return\n    n, m = int(lines[0]), int(lines[1])\n    # Solution\nif __name__ == '__main__':\n    main()`,
          c: `#include <stdio.h>\nint main() {\n    // Solution\n    return 0;\n}`,
          java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // Solution\n    }\n}`,
        },
        testCases: [
          {
            id: 'final-tc-1',
            input: '3 3\n0 1 1\n1 0 1\n1 1 0',
            expectedOutput: '4',
            isHidden: false,
            explanation: 'Optimal dual disjoint path yield.',
          },
        ],
      },
    ],
  },
];
