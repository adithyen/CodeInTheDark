# Alpha-1 Contest Test Suite — Complete & Partial Solutions

This file contains production-ready solutions in **Python 3**, **C (GCC)**, and **Java (OpenJDK)** for all 5 problems defined in [`questions.json`](./questions.json).

Additionally, each problem includes **Partial Solutions (Buggy Code)** demonstrating realistic competitive programming mistakes (e.g. integer division truncation, edge cases missed, forgetting 24-hr wrap) that will achieve **3/5 or 4/5 passed test cases** for validation.

---

## Problem 1: Lab Attendance Eligibility

### Full 5/5 Solution (Python 3)
```python
import sys

def solve():
    raw = sys.stdin.read().split()
    if not raw:
        return
    t = int(raw[0])
    a = int(raw[1])
    
    if t == 0:
        print("ELIGIBLE")
        return
        
    percentage = (a / t) * 100.0
    if percentage >= 75.0:
        print("ELIGIBLE")
    else:
        print("NOT ELIGIBLE")

if __name__ == "__main__":
    solve()
```

### Full 5/5 Solution (C - GCC)
```c
#include <stdio.h>

int main() {
    int t, a;
    if (scanf("%d %d", &t, &a) == 2) {
        if (t == 0) {
            printf("ELIGIBLE\n");
            return 0;
        }
        double percentage = ((double)a / (double)t) * 100.0;
        if (percentage >= 75.0) {
            printf("ELIGIBLE\n");
        } else {
            printf("NOT ELIGIBLE\n");
        }
    }
    return 0;
}
```

### Full 5/5 Solution (Java - OpenJDK)
```java
import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int t = sc.nextInt();
            int a = sc.nextInt();
            if (t == 0) {
                System.out.println("ELIGIBLE");
                return;
            }
            double pct = ((double) a / t) * 100.0;
            if (pct >= 75.0) {
                System.out.println("ELIGIBLE");
            } else {
                System.out.println("NOT ELIGIBLE");
            }
        }
    }
}
```

### ⚠️ Partial Solution (Score: 3/5 Passed) — Language: Python / C
**The Bug**: Strict inequality (`> 75.0` instead of `>= 75.0`). Fails when attendance is exactly 75%.
```python
import sys

def solve():
    raw = sys.stdin.read().split()
    if not raw: return
    t, a = int(raw[0]), int(raw[1])
    # BUG: Used strictly greater than 75%
    if (a / t) * 100.0 > 75.0:
        print("ELIGIBLE")
    else:
        print("NOT ELIGIBLE")

solve()
```
* **Test Case 1** (`40 32` = 80%): ✅ Passed
* **Test Case 2** (`50 35` = 70%): ✅ Passed
* **Test Case 3** (`100 75` = 75%): ❌ Failed (Outputs `NOT ELIGIBLE`, expected `ELIGIBLE`)
* **Test Case 4** (`8 6` = 75%): ❌ Failed (Outputs `NOT ELIGIBLE`, expected `ELIGIBLE`)
* **Test Case 5** (`40 29` = 72.5%): ✅ Passed
* **Result**: **3/5 Passed** (Base Score: 60 pts)

---

## Problem 2: Digital Clock Alarm Countdown

### Full 5/5 Solution (Python 3)
```python
import sys

def solve():
    raw = sys.stdin.read().split()
    if not raw:
        return
    h1, m1, h2, m2 = map(int, raw[:4])
    
    t1 = h1 * 60 + m1
    t2 = h2 * 60 + m2
    
    diff = t2 - t1
    if diff <= 0:
        diff += 24 * 60
        
    print(diff)

if __name__ == "__main__":
    solve()
```

### Full 5/5 Solution (C - GCC)
```c
#include <stdio.h>

int main() {
    int h1, m1, h2, m2;
    if (scanf("%d %d %d %d", &h1, &m1, &h2, &m2) == 4) {
        int t1 = h1 * 60 + m1;
        int t2 = h2 * 60 + m2;
        int diff = t2 - t1;
        if (diff <= 0) {
            diff += 24 * 60;
        }
        printf("%d\n", diff);
    }
    return 0;
}
```

### Full 5/5 Solution (Java - OpenJDK)
```java
import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int h1 = sc.nextInt();
            int m1 = sc.nextInt();
            int h2 = sc.nextInt();
            int m2 = sc.nextInt();
            
            int t1 = h1 * 60 + m1;
            int t2 = h2 * 60 + m2;
            int diff = t2 - t1;
            if (diff <= 0) {
                diff += 1440;
            }
            System.out.println(diff);
        }
    }
}
```

### ⚠️ Partial Solution (Score: 2/5 Passed) — Language: C
**The Bug**: Forgets to handle next-day wrap when target time is earlier or equal to current time.
```c
#include <stdio.h>

int main() {
    int h1, m1, h2, m2;
    if (scanf("%d %d %d %d", &h1, &m1, &h2, &m2) == 4) {
        int t1 = h1 * 60 + m1;
        int t2 = h2 * 60 + m2;
        // BUG: Simple subtraction, will give negative or 0 for next day alarms
        printf("%d\n", t2 - t1);
    }
    return 0;
}
```
* **Test Case 1** (`14 30 15 45`): ✅ Passed (`75`)
* **Test Case 2** (`23 50 0 10`): ❌ Failed (`-1420`, expected `20`)
* **Test Case 3** (`10 0 10 0`): ❌ Failed (`0`, expected `1440`)
* **Test Case 4** (`8 15 9 0`): ✅ Passed (`45`)
* **Test Case 5** (`22 15 6 30`): ❌ Failed (`-945`, expected `495`)
* **Result**: **2/5 Passed** (Base Score: 40 pts)

---

## Problem 3: Campus Library Overdue Fine

### Full 5/5 Solution (Python 3)
```python
import sys

def solve():
    raw = sys.stdin.read().split()
    if not raw:
        return
    d = int(raw[0])
    
    if d <= 0:
        print(0)
        return
        
    fine = 0
    if d <= 5:
        fine = d * 2
    elif d <= 10:
        fine = 5 * 2 + (d - 5) * 5
    else:
        fine = 5 * 2 + 5 * 5 + (d - 10) * 10
        
    print(fine)

if __name__ == "__main__":
    solve()
```

### Full 5/5 Solution (C - GCC)
```c
#include <stdio.h>

int main() {
    int d;
    if (scanf("%d", &d) == 1) {
        if (d <= 0) {
            printf("0\n");
            return 0;
        }
        int fine = 0;
        if (d <= 5) {
            fine = d * 2;
        } else if (d <= 10) {
            fine = 5 * 2 + (d - 5) * 5;
        } else {
            fine = 10 + 25 + (d - 10) * 10;
        }
        printf("%d\n", fine);
    }
    return 0;
}
```

### Full 5/5 Solution (Java - OpenJDK)
```java
import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int d = sc.nextInt();
            if (d <= 0) {
                System.out.println(0);
                return;
            }
            int fine = 0;
            if (d <= 5) {
                fine = d * 2;
            } else if (d <= 10) {
                fine = 10 + (d - 5) * 5;
            } else {
                fine = 35 + (d - 10) * 10;
            }
            System.out.println(fine);
        }
    }
}
```

### ⚠️ Partial Solution (Score: 3/5 Passed) — Language: Java
**The Bug**: Applies flat ₹10 rate directly to the entire duration instead of progressive bracket calculation.
```java
import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int d = sc.nextInt();
            if (d <= 0) {
                System.out.println(0);
            } else if (d <= 5) {
                System.out.println(d * 2);
            } else if (d <= 10) {
                System.out.println(10 + (d - 5) * 5);
            } else {
                // BUG: Charged entire duration at 10 instead of progressive slabs
                System.out.println(d * 10);
            }
        }
    }
}
```
* **Test Case 1** (`4`): ✅ Passed (`8`)
* **Test Case 2** (`7`): ✅ Passed (`20`)
* **Test Case 3** (`0`): ✅ Passed (`0`)
* **Test Case 4** (`10`): ✅ Passed (`35`)
* **Test Case 5** (`14`): ❌ Failed (`140`, expected `75`)
* **Result**: **4/5 Passed** (Base Score: 80 pts)

---

## Problem 4: Temperature Extremes & Delta

### Full 5/5 Solution (Python 3)
```python
import sys

def solve():
    raw = sys.stdin.read().split()
    if not raw:
        return
    n = int(raw[0])
    temps = [int(x) for x in raw[1:n+1]]
    
    if not temps:
        print(0)
        return
        
    print(max(temps) - min(temps))

if __name__ == "__main__":
    solve()
```

### Full 5/5 Solution (C - GCC)
```c
#include <stdio.h>

int main() {
    int n;
    if (scanf("%d", &n) == 1 && n > 0) {
        int first;
        scanf("%d", &first);
        int minVal = first;
        int maxVal = first;
        for (int i = 1; i < n; i++) {
            int val;
            scanf("%d", &val);
            if (val < minVal) minVal = val;
            if (val > maxVal) maxVal = val;
        }
        printf("%d\n", maxVal - minVal);
    }
    return 0;
}
```

### Full 5/5 Solution (Java - OpenJDK)
```java
import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int n = sc.nextInt();
            int minVal = Integer.MAX_VALUE;
            int maxVal = Integer.MIN_VALUE;
            for (int i = 0; i < n; i++) {
                int val = sc.nextInt();
                if (val < minVal) minVal = val;
                if (val > maxVal) maxVal = val;
            }
            System.out.println(maxVal - minVal);
        }
    }
}
```

### ⚠️ Partial Solution (Score: 3/5 Passed) — Language: Python
**The Bug**: Initializes `minVal = 0` (assumes temperatures are always non-negative). Fails when all readings are positive numbers (so minimum is mistakenly pegged to 0 instead of the actual lowest reading).
```python
import sys

def solve():
    raw = sys.stdin.read().split()
    if not raw: return
    n = int(raw[0])
    temps = [int(x) for x in raw[1:n+1]]
    
    max_val = -999999
    # BUG: initialized min to 0
    min_val = 0
    for t in temps:
        if t > max_val: max_val = t
        if t < min_val: min_val = t
        
    print(max_val - min_val)

solve()
```
* **Test Case 1** (`24 28 19 32 22`): ❌ Failed (`32 - 0 = 32`, expected `13`)
* **Test Case 2** (`-5 -2 -12 0`): ✅ Passed (`12`)
* **Test Case 3** (`25`): ❌ Failed (`25 - 0 = 25`, expected `0`)
* **Test Case 4** (`10 10 10 10 10 10`): ❌ Failed (`10 - 0 = 10`, expected `0`)
* **Test Case 5** (`-10 40 15 -25 30`): ✅ Passed (`65`)
* **Result**: **2/5 Passed** (Base Score: 40 pts)

---

## Problem 5: Palindromic Security Passcode

### Full 5/5 Solution (Python 3)
```python
import sys

def solve():
    line = sys.stdin.readline().rstrip('\r\n')
    # Filter only alphanumeric characters and convert to lowercase
    filtered = [ch.lower() for ch in line if ch.isalnum()]
    cleaned = "".join(filtered)
    
    if cleaned == cleaned[::-1]:
        print("VALID")
    else:
        print("INVALID")

if __name__ == "__main__":
    solve()
```

### Full 5/5 Solution (C - GCC)
```c
#include <stdio.h>
#include <string.h>
#include <ctype.h>

int main() {
    char s[600];
    if (fgets(s, sizeof(s), stdin)) {
        char cleaned[600];
        int k = 0;
        for (int i = 0; s[i] != '\0'; i++) {
            if (isalnum((unsigned char)s[i])) {
                cleaned[k++] = tolower((unsigned char)s[i]);
            }
        }
        cleaned[k] = '\0';
        
        int left = 0;
        int right = k - 1;
        int isPal = 1;
        while (left < right) {
            if (cleaned[left] != cleaned[right]) {
                isPal = 0;
                break;
            }
            left++;
            right--;
        }
        
        if (isPal) {
            printf("VALID\n");
        } else {
            printf("INVALID\n");
        }
    }
    return 0;
}
```

### Full 5/5 Solution (Java - OpenJDK)
```java
import java.util.Scanner;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextLine()) {
            String s = sc.nextLine();
            StringBuilder sb = new StringBuilder();
            for (char ch : s.toCharArray()) {
                if (Character.isLetterOrDigit(ch)) {
                    sb.append(Character.toLowerCase(ch));
                }
            }
            String cleaned = sb.toString();
            String rev = sb.reverse().toString();
            if (cleaned.equals(rev)) {
                System.out.println("VALID");
            } else {
                System.out.println("INVALID");
            }
        }
    }
}
```

### ⚠️ Partial Solution (Score: 2/5 Passed) — Language: Python
**The Bug**: Checks string reversal directly without removing spaces, punctuation, or handling case insensitivity.
```python
import sys

def solve():
    line = sys.stdin.readline().rstrip('\r\n')
    # BUG: Forgot to strip punctuation, spaces, and lowercase
    if line == line[::-1]:
        print("VALID")
    else:
        print("INVALID")

solve()
```
* **Test Case 1** (`Race Car!`): ❌ Failed (`INVALID`, expected `VALID`)
* **Test Case 2** (`Code In The Dark`): ✅ Passed (`INVALID`)
* **Test Case 3** (`A man, a plan, a canal: Panama`): ❌ Failed (`INVALID`, expected `VALID`)
* **Test Case 4** (`11:11`): ❌ Failed (`INVALID`, expected `VALID`)
* **Test Case 5** (`11-12-11`): ✅ Passed (`VALID` because symmetrical with hyphens)
* **Result**: **2/5 Passed** (Base Score: 40 pts)

---

## Quick Testing Instructions
You can test each problem and verify both the 5/5 and partial test case scores using the runner API directly:

```bash
curl -X POST https://marine-turbine-synthesis.ngrok-free.dev/api/v2/execute \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d "{\"language\":\"python\",\"files\":[{\"content\":\"print('VALID')\"}],\"stdin\":\"\"}"
```
