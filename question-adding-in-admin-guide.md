# Question Authoring & Administration Guide

This guide explains how to add, configure, and manage contest questions in the **11:11 Command Bridge** (`/orbit`), either manually or by importing from the prepared question sets.

---

## 1. Accessing the Command Bridge

1. Navigate to `/orbit` (e.g., `https://11-11-chapter-2-codeinthedark.vercel.app/orbit` or `http://localhost:3000/orbit`).
2. Enter your Master Admiralty Key.
3. Select the session you wish to manage from the top dropdown (e.g., `11:11 Chapter 2 — Main Arena`).
4. Click on the **"Setup Trials"** tab in the top navigation bar.

---

## 2. Method A: 1-Click Instant Bulk Import (Recommended)

You have a ready-to-use dataset containing **25 beginner-level engineering problems** located in [`sample-problems.json`](file:///d:/Projects/Code%20In%20The%20Dark/sample-problems.json).

1. Open [`sample-problems.json`](file:///d:/Projects/Code%20In%20The%20Dark/sample-problems.json) in your editor.
2. Copy either:
   * **All 25 questions** (select all and copy), OR
   * **A subset of 5 questions** (e.g., questions 1 to 5) that you want for the current round.
3. In `/orbit` ➔ **Setup Trials**, click the gold **"Import Scrolls JSON"** button.
4. Paste the JSON into the modal textarea.
5. Click **"Import Scrolls"**.
6. All questions, starter templates, and public/hidden test cases are automatically generated and linked to your session in Supabase!

---

## 3. Method B: Manual Question Inscription ("Inscribe New Trial Scroll")

To create or edit a question manually, click **"Inscribe New Trial Scroll"** (or click the edit pencil on any existing question). Fill in the following fields:

### Field-by-Field Breakdown

| Field Label | Purpose & Guidance | Example |
| :--- | :--- | :--- |
| **Scroll Title** | Short, engaging name describing the challenge. | `Fuel Consumption & Range Estimator` |
| **Bounty Points** | Base points awarded for passing all test cases. Typically set to **100** (5 questions = 500 total). | `100` |
| **Category** | Problem topic classification badge. | `Basic Math`, `Conditionals`, `Arrays`, `Strings` |
| **Difficulty** | Display badge: `Easy`, `Medium`, or `Hard`. | `Easy` |
| **Scenario Charter** | Problem description and background narrative. Clearly state what needs to be calculated. | *"A delivery vehicle has a fuel tank..."* |
| **Input Inscription** | Precise specification of standard input (`stdin`). Mention data types and spacing. | *"Three space-separated numbers: totalFuel, mileage, reserveLimit."* |
| **Output Vessel** | Precise specification of standard output (`stdout`). Mention exact formatting or units. | *"A single integer representing usable range in km."* |
| **Voyage Constraints** | Value ranges, time limits, and memory limits. | `0 <= fuel <= 200, 1 <= mileage <= 50, Time: 3.5s` |

---

## 4. Test Case Authoring Rules (Critical)

Every question should have **4 to 5 test cases**:
* **2 Public Test Cases (`Sealed (Hidden)` UNCHECKED)**
* **2 to 3 Sealed Test Cases (`Sealed (Hidden)` CHECKED)**

### Critical Formatting Rules:
1. **No Interactive Input Prompts**:
   * Participants must **never** print prompts like `Enter number: ` or `Result: `.
   * Their program must directly read from `stdin` and print the exact answer to `stdout`.
   * *Correct Python*: `print(result)`
   * *Incorrect Python*: `print("The answer is:", result)`
2. **Exact Whitespace Matching**:
   * The evaluation engine trims leading and trailing whitespace and standardizes line breaks (`\r\n` $\rightarrow$ `\n`).
   * However, internal formatting (e.g. single space vs two spaces, uppercase vs lowercase) must match exactly.
   * If the expected output is `ACTIVE 15`, an output of `active 15` will fail.
3. **Floating Point Precision**:
   * If a problem asks for decimal places (e.g. 2 decimal places), state this clearly in the description (e.g. `24.00 kWh`).
   * In Python: `print(f"{ans:.2f}")`
   * In C: `printf("%.2f\n", ans);`
   * In Java: `System.out.printf("%.2f\n", ans);`
4. **Edge Cases to Include in Hidden/Sealed Trials**:
   * **Zero values** (`0`, `0.0`)
   * **Negative numbers** (if permitted by constraints)
   * **Boundary limits** (maximum constraint values like `100000`)
   * **Equality cases** (e.g., `balance == amount`, `inflow == outflow`)

---

## 5. Starter Code Template Guidelines

Provide clean boilerplate so contestants don't waste time writing `import sys` or scanner setup:

### Python 3 Template:
```python
import sys

def solve():
    raw = sys.stdin.read().split()
    if not raw:
        return
    # Read variables
    a = int(raw[0])
    b = int(raw[1])
    
    # Write solution here
    print(a + b)

if __name__ == '__main__':
    solve()
```

### C (GCC) Template:
```c
#include <stdio.h>

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        // Write solution here
        printf("%d\n", a + b);
    }
    return 0;
}
```

### Java (OpenJDK) Template:
> **IMPORTANT FOR JAVA**: The class name **MUST be `Main`** and must belong to the default (unnamed) package.

```java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int a = sc.nextInt();
            int b = sc.nextInt();
            
            // Write solution here
            System.out.println(a + b);
        }
    }
}
```

---

## 6. Pre-Contest Verification Checklist

Before opening registration for participants:

- [ ] **Native Runner Running**: Ensure [`D:\Apps\START_RUNNER.bat`](file:///D:/Apps/START_RUNNER.bat) is running on your host machine.
- [ ] **Runner URL Set in Vercel**: Verify that `PISTON_URL` in Vercel environment variables is set to your permanent static URL: `https://marine-turbine-synthesis.ngrok-free.dev`.
- [ ] **Test with "Run Code" in Arena**: Open the arena with a test participant and click "Run Code" on each question to verify that Python, C, and Java compile and return `Accepted` on public test cases.
- [ ] **Check Session Phase**: Ensure the contest session is in `setup` or `registration` before contestants arrive.
