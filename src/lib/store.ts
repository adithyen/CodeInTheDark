import { Question, Participant, Submission, ContestState, Violation, LeaderboardEntry } from '@/types';

// Default Real-World Scenario Questions
export const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 'q1-drone-dispatch',
    order: 1,
    title: 'The Autonomous Drone Dispatcher',
    category: 'Smart Logistics & Two-Pointer',
    difficulty: 'Easy',
    points: 300,
    scenario: `A smart logistics hub deploys dual-cargo autonomous drones. Each drone has two independent pod slots. To maintain aerodynamic balance, the combined weight of two packages assigned to a drone must strictly equal a target payload capacity $T$.

Given an array of package weights and the target payload capacity $T$, determine if there exist two distinct packages whose combined weight equals $T$. Print 'YES' if such a pair exists, otherwise print 'NO'.`,
    inputFormat: `Line 1: Two space-separated integers $N$ (number of packages) and $T$ (target payload capacity).
Line 2: $N$ space-separated integers representing the package weights.`,
    outputFormat: `Output 'YES' (without quotes) if a valid pair exists, or 'NO' otherwise.`,
    constraints: `2 <= N <= 10^5
1 <= T <= 10^9
1 <= weight[i] <= 10^9`,
    starterTemplates: {
      c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    long long t;
    if (scanf("%d %lld", &n, &t) != 2) return 0;
    
    long long *weights = (long long *)malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) {
        scanf("%lld", &weights[i]);
    }
    
    // Write your blind solution logic here
    
    free(weights);
    return 0;
}`,
      python: `import sys

def main():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    target = int(input_data[1])
    weights = [int(x) for x in input_data[2:2 + n]]
    
    # Write your blind solution logic here
    # Print YES or NO

if __name__ == '__main__':
    main()`,
      java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) return;
        int n = scanner.nextInt();
        long target = scanner.nextLong();
        long[] weights = new long[n];
        for (int i = 0; i < n; i++) {
            weights[i] = scanner.nextLong();
        }
        
        // Write your blind solution logic here
        // System.out.println("YES" or "NO");
    }
}`
    },
    testCases: [
      {
        id: 'tc-1-1',
        input: '5 10\n2 4 6 8 3',
        expectedOutput: 'YES',
        isHidden: false,
        explanation: 'Packages with weights 4 and 6 (or 2 and 8) add up to target 10.'
      },
      {
        id: 'tc-1-2',
        input: '4 15\n1 2 5 7',
        expectedOutput: 'NO',
        isHidden: false,
        explanation: 'No two packages sum to 15.'
      },
      {
        id: 'tc-1-3',
        input: '3 6\n3 2 1',
        expectedOutput: 'NO',
        isHidden: true,
        explanation: 'Only one package has weight 3; you need two distinct packages.'
      },
      {
        id: 'tc-1-4',
        input: '6 100\n10 20 50 50 30 70',
        expectedOutput: 'YES',
        isHidden: true,
        explanation: 'Two distinct packages with weight 50 sum to 100.'
      },
      {
        id: 'tc-1-5',
        input: '2 2000000000\n1000000000 1000000000',
        expectedOutput: 'YES',
        isHidden: true,
        explanation: 'Large numbers handling (64-bit integer).'
      }
    ]
  },
  {
    id: 'q2-packet-sequencer',
    order: 2,
    title: 'High-Frequency Trading Packet Order',
    category: 'Network Protocol & Sliding Window',
    difficulty: 'Medium',
    points: 450,
    scenario: `At a low-latency exchange, trading packets arrive out of chronological order due to fiber-optic route jitter. Each packet is stamped with a transaction price $P_i$. 

An algorithmic arbitrage bot must find the maximum profit obtainable by executing a buy transaction at some time $i$ and a sell transaction at a strictly later time $j$ ($j > i$). If no profitable trade is possible, output 0.`,
    inputFormat: `Line 1: An integer $N$ (number of price ticks).
Line 2: $N$ space-separated integers representing the price sequence.`,
    outputFormat: `Output a single integer representing the maximum profit achievable, or 0 if no profit is possible.`,
    constraints: `1 <= N <= 10^5
0 <= price[i] <= 10^9`,
    starterTemplates: {
      c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    
    long long *prices = (long long *)malloc(sizeof(long long) * n);
    for (int i = 0; i < n; i++) {
        scanf("%lld", &prices[i]);
    }
    
    // Write your blind solution logic here
    
    free(prices);
    return 0;
}`,
      python: `import sys

def main():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    prices = [int(x) for x in input_data[1:1 + n]]
    
    # Write your blind solution logic here
    # Print max profit

if __name__ == '__main__':
    main()`,
      java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (!scanner.hasNextInt()) return;
        int n = scanner.nextInt();
        long[] prices = new long[n];
        for (int i = 0; i < n; i++) {
            prices[i] = scanner.nextLong();
        }
        
        // Write your blind solution logic here
    }
}`
    },
    testCases: [
      {
        id: 'tc-2-1',
        input: '6\n7 1 5 3 6 4',
        expectedOutput: '5',
        isHidden: false,
        explanation: 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6 - 1 = 5.'
      },
      {
        id: 'tc-2-2',
        input: '5\n7 6 4 3 1',
        expectedOutput: '0',
        isHidden: false,
        explanation: 'Prices strictly decrease; no trade possible.'
      },
      {
        id: 'tc-2-3',
        input: '1\n100',
        expectedOutput: '0',
        isHidden: true,
        explanation: 'Single day tick cannot complete a buy and sell.'
      },
      {
        id: 'tc-2-4',
        input: '7\n2 4 1 8 3 9 0',
        expectedOutput: '8',
        isHidden: true,
        explanation: 'Buy at 1, sell at 9 -> profit = 8.'
      },
      {
        id: 'tc-2-5',
        input: '4\n100000000 1000000000 0 500000000',
        expectedOutput: '900000000',
        isHidden: true,
        explanation: 'Large numbers check.'
      }
    ]
  },
  {
    id: 'q3-zero-day-validator',
    order: 3,
    title: 'Zero-Day Packet Checksum Validator',
    category: 'Cybersecurity & Stack / Parsing',
    difficulty: 'Medium',
    points: 500,
    scenario: `A military firewall inspects nested security encapsulation tokens in packet headers. The payload tokens contain nested delimiters '(', ')', '{', '}', '[', ']'.

A packet header is valid if and only if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Print 'VALID' if the header format is uncompromised, otherwise print 'INVALID'.`,
    inputFormat: `Line 1: An integer $T$ representing the number of packet strings to test.
Next $T$ lines: A string consisting exclusively of brackets '()[]{}'.`,
    outputFormat: `For each test string, print 'VALID' or 'INVALID' on a new line.`,
    constraints: `1 <= T <= 100
1 <= length(string) <= 10^4`,
    starterTemplates: {
      c: `#include <stdio.h>
#include <string.h>

void solve() {
    char s[10005];
    if (scanf("%s", s) != 1) return;
    
    // Write your blind solution logic here
}

int main() {
    int t;
    if (scanf("%d", &t) != 1) return 0;
    while (t--) {
        solve();
    }
    return 0;
}`,
      python: `import sys

def check_packet(s):
    # Write your blind solution logic here
    # Return 'VALID' or 'INVALID'
    pass

def main():
    lines = sys.stdin.read().split()
    if not lines:
        return
    t = int(lines[0])
    for i in range(1, t + 1):
        print(check_packet(lines[i]))

if __name__ == '__main__':
    main()`,
      java: `import java.util.*;

public class Main {
    static String checkPacket(String s) {
        // Write your blind solution logic here
        return "VALID";
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int t = sc.nextInt();
        while (t-- > 0) {
            String s = sc.next();
            System.out.println(checkPacket(s));
        }
    }
}`
    },
    testCases: [
      {
        id: 'tc-3-1',
        input: '3\n()[]{}\n(]\n([{}])',
        expectedOutput: 'VALID\nINVALID\nVALID',
        isHidden: false,
        explanation: 'Sample bracket combinations.'
      },
      {
        id: 'tc-3-2',
        input: '2\n]\n(((((',
        expectedOutput: 'INVALID\nINVALID',
        isHidden: true,
        explanation: 'Unbalanced starting or trailing brackets.'
      },
      {
        id: 'tc-3-3',
        input: '2\n{[]}\n{[}]',
        expectedOutput: 'VALID\nINVALID',
        isHidden: true,
        explanation: 'Improper interleaving is invalid.'
      }
    ]
  },
  {
    id: 'q4-quantum-grid-traversal',
    order: 4,
    title: 'Submarine Cable Route Optimizer',
    category: 'Graph & Dynamic Programming',
    difficulty: 'Hard',
    points: 750,
    scenario: `An undersea fiber optic consortium is laying high-speed data cables across a grid of oceanic sectors from $(0, 0)$ (Northwest Station) to $(R-1, C-1)$ (Southeast Station). Each sector has a latency weight $L[r][c]$.

Cables can only be laid moving strictly **Right** or strictly **Down**. Find the minimum cumulative latency to link the two stations.`,
    inputFormat: `Line 1: Two space-separated integers $R$ and $C$ (rows and columns).
Next $R$ lines: $C$ space-separated integers representing sector latencies.`,
    outputFormat: `A single integer representing the minimum path latency.`,
    constraints: `1 <= R, C <= 500
0 <= L[r][c] <= 10^6`,
    starterTemplates: {
      c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int r, c;
    if (scanf("%d %d", &r, &c) != 2) return 0;
    
    // Write your blind solution logic here
    
    return 0;
}`,
      python: `import sys

def main():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    r, c = int(input_data[0]), int(input_data[1])
    idx = 2
    grid = []
    for _ in range(r):
        grid.append([int(x) for x in input_data[idx:idx + c]])
        idx += c
        
    # Write your blind solution logic here
    # Print minimum path sum

if __name__ == '__main__':
    main()`,
      java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int r = sc.nextInt();
        int c = sc.nextInt();
        long[][] grid = new long[r][c];
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                grid[i][j] = sc.nextLong();
            }
        }
        
        // Write your blind solution logic here
    }
}`
    },
    testCases: [
      {
        id: 'tc-4-1',
        input: '3 3\n1 3 1\n1 5 1\n4 2 1',
        expectedOutput: '7',
        isHidden: false,
        explanation: 'Path: 1 -> 3 -> 1 -> 1 -> 1 minimizes latency to 7.'
      },
      {
        id: 'tc-4-2',
        input: '2 3\n1 2 3\n4 5 6',
        expectedOutput: '12',
        isHidden: false,
        explanation: 'Path: 1 -> 2 -> 3 -> 6 = 12.'
      },
      {
        id: 'tc-4-3',
        input: '1 4\n5 10 15 20',
        expectedOutput: '50',
        isHidden: true,
        explanation: 'Single row grid traversal.'
      },
      {
        id: 'tc-4-4',
        input: '4 1\n10\n20\n30\n40',
        expectedOutput: '100',
        isHidden: true,
        explanation: 'Single column grid traversal.'
      }
    ]
  }
];

// In-Memory Global Singleton Store for Next.js Server Runtime
interface StoreState {
  contest: ContestState;
  questions: Question[];
  participants: Map<string, Participant>;
  submissions: Map<string, Submission>;
  violations: Violation[];
}

// Global declaration to survive Next.js dev reloads
declare global {
  // eslint-disable-next-line no-var
  var __CODE_IN_THE_DARK_STORE__: StoreState | undefined;
}

function getInitialStore(): StoreState {
  return {
    contest: {
      isActive: false,
      isPaused: false,
      startTime: null,
      durationMinutes: 50,
      endTime: null,
      title: '11:11 Chapter 2 — Code In The Dark',
      announcement: 'Welcome to Code In The Dark! Contestants, ensure presentation mode is on.',
      isRevealMode: false,
    },
    questions: [...DEFAULT_QUESTIONS],
    participants: new Map(),
    submissions: new Map(),
    violations: [],
  };
}

export const store: StoreState = global.__CODE_IN_THE_DARK_STORE__ || (global.__CODE_IN_THE_DARK_STORE__ = getInitialStore());
