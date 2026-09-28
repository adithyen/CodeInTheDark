# 11:11 Chapter 2 — Code Execution & Evaluation Architecture

This document provides a comprehensive, end-to-end breakdown of how code writing, test case evaluation, scoring, and leaderboard publishing operate across the entire system.

---

## 1. High-Level System Workflow Diagram

```
[ Participant in Arena ]
         │
         ├── 1. Writes Blind Code (Monaco Editor)
         ├── 2. Auto-Saves Cloud Drafts (Debounced every 3s -> Supabase)
         ├── 3. Clicks "Save & Next" / "Lock Question"
         │      └─ Records `firstSealedAt`, `lastSealedAt`, `firstDurationMs`, `elapsedMs`
         │
         └── 4. Final Contest Submission (Manual click or Timer Auto-Submit)
                 │
                 ▼
      [ Vercel API: /api/submit ]
                 │
                 ├── Fetches Question Test Cases (Revealed + Hidden) from Supabase
                 │
                 ├── Sends Code + Stdin to Runner in Parallel (`Promise.all`)
                 │      │
                 │      ▼
         [ Cloudflare Tunnel HTTPS ]
                 │
                 ▼
      [ Local Native Runner (Port 2000) ]
                 │
                 ├── Python: `python -u main.py` (piped stdin)
                 ├── C: `gcc -O2 main.c -o main.exe` -> `main.exe`
                 └── Java: `javac Main.java` -> `java -Xmx128m Main`
                 │
                 ├── Process Tree Timeout Watchdog (3.5s limit)
                 │
                 ▼
      [ Execution Results Returned to /api/submit ]
                 │
                 ├── Output normalization (CRLF -> LF, trimming)
                 ├── Compares stdout with expectedOutput
                 ├── Computes:
                 │      - `testCasesPassed` (e.g. 4/5)
                 │      - `baseScore` (Accuracy pts)
                 │      - `speedBonus` (Sub-minute velocity + time saved)
                 │      - `finalScore` = baseScore + speedBonus
                 │
                 ▼
      [ Supabase Database: `submissions` Table ]
                 │
                 ├── Stores `score`, `speed_bonus`, `test_cases_passed`, `exec_time_ms`
                 │
                 ▼
      [ Leaderboard Engine: `buildLeaderboard()` ]
                 │
                 ├── Aggregates question scores per participant
                 ├── Deducts anti-cheat strikes (50 pts per strike)
                 ├── Sorts: Total Score DESC -> Fastest Solve Duration ASC -> Earliest Timestamp
                 │
                 ▼
      [ Admin Dashboard (/orbit) & Public Leaderboard (/leaderboard) ]
                 └── Live sync with automated reveal sequence (@ 1.5s, 3.0s, 4.5s, 6.0s)
```

---

## 2. Inscribing Questions & Parameters

When an administrator clicks **"Inscribe New Trial Scroll"** in the Command Bridge (`/orbit` ➔ **Setup Trials** tab), the following parameters are configured:

| Field Name | Inscription Form Label | Technical Purpose | Example Value |
| :--- | :--- | :--- | :--- |
| `title` | **Scroll Title** | The public display name of the problem. | `"ATM Cash Dispenser"` |
| `points` | **Bounty Points** | Base points allocated to the question (default: 100). | `100` |
| `category` | **Category** | Topic tag for problem grouping. | `"Math / Logic"` |
| `difficulty` | **Difficulty** | Display badge: `Easy`, `Medium`, or `Hard`. | `Easy` |
| `scenario` | **Scenario Charter** | The problem description, context, and requirements. | *"A customer wants to withdraw amount X..."* |
| `inputFormat` | **Input Inscription** | Explanation of how standard input (`stdin`) is supplied. | *"A single line containing integer N"* |
| `outputFormat` | **Output Vessel** | Exact expected structure of standard output (`stdout`). | *"Print minimum notes required, or -1"* |
| `constraints` | **Voyage Constraints** | Limits on inputs, CPU time, and memory. | `1 <= N <= 100000, Time Limit: 3.5s` |
| `testCases` | **Public & Sealed Trials** | Array of test cases containing inputs and expected outputs. | See section below |

### Revealed vs Sealed (Hidden) Test Cases
Each question typically has **4 to 5 test cases**:
* **Revealed Test Cases (`isHidden = false`)**:
  * Shown in the problem statement as sample examples with explanations.
  * Helps the participant understand the problem requirements and input/output structure.
* **Sealed / Hidden Test Cases (`isHidden = true`)**:
  * **Completely masked** from the participant during the contest.
  * Contains edge cases: zero (`0`), negative numbers, maximum constraint values, boundary inputs, or corner-case formatting.
  * Evaluated on final submission to prevent hardcoded `if/else` cheats.

---

## 3. How Submissions Reach the Native Runner

When a participant seals their code and submits:

1. **Client-Side Payload**:
   The arena compiles all question answers and elapsed stopwatch durations:
   ```json
   {
     "participantId": "p-12345",
     "sessionId": "sess-67890",
     "submissions": [
       {
         "questionId": "q-001",
         "language": "python",
         "code": "import sys\nx = int(sys.stdin.read())\nprint(x * 10)",
         "elapsedMs": 50000,
         "firstDurationMs": 50000,
         "firstSealedAt": 1790400000000,
         "lastSealedAt": 1790400000000
       }
     ]
   }
   ```

2. **Serverless Dispatch (`/api/submit`)**:
   * Resolves the active session and verifies that the participant is not locked out.
   * Pulls the question's full test case suite (both public and hidden) from Supabase.
   * Evaluates all test cases **in parallel** (`Promise.all`) by making HTTP POST calls to:
     ```
     POST ${PISTON_URL}/api/v2/execute
     ```

3. **Cloudflare Tunnel Routing**:
   * The request is routed securely over HTTPS via the permanent Ngrok tunnel (`https://marine-turbine-synthesis.ngrok-free.dev`) to port `2000` on your host PC.

---

## 4. How the Native Runner Evaluates Code

Inside [`D:\Apps\runner\server.js`](file:///D:/Apps/runner/server.js), each execution request undergoes the following lifecycle:

1. **Workspace Isolation**:
   * Creates an isolated temporary directory: `D:\Apps\runner\temp\run_<timestamp>_<uuid>\`.
   * Writes the participant's code into `main.py`, `main.c`, or `Main.java`.

2. **Compilation (for C & Java)**:
   * **C**: Runs `D:\Apps\w64devkit\bin\gcc.exe -O2 main.c -o main.exe` (5.0s timeout).
     * If compilation fails (`code !== 0`), returns `{ compile: { code: 1, stderr: "syntax error..." } }`.
   * **Java**: Runs `D:\Apps\jdk-17.0.12\bin\javac.exe Main.java` (5.0s timeout).
     * If compilation fails, returns `{ compile: { code: 1, stderr: "compilation error..." } }`.

3. **Execution with `stdin` & Timeout Watchdog**:
   * Spawns the binary or interpreter with piped `stdin`.
   * An active timeout timer terminates runaway or infinite loops:
     * If execution exceeds **3.5 seconds**, the server invokes Windows `taskkill /F /T /PID <child_pid>` to terminate the entire process tree.
     * Returns `{ run: { signal: "SIGTERM", stderr: "Time Limit Exceeded (3.5s)" } }`.
   * Captures `stdout` up to 500 KB to guard against runaway print loops.

4. **Result Packaging**:
   The runner returns a JSON response matching the Piston protocol:
   ```json
   {
     "language": "python",
     "version": "1.0.0",
     "run": {
       "stdout": "100\n",
       "stderr": "",
       "code": 0,
       "signal": null
     },
     "compile": {
       "code": 0,
       "output": "",
       "stderr": ""
     }
   }
   ```

5. **Cleanup**:
   * The temporary run directory is deleted from disk.

---

## 5. Test Case Verification & Accuracy Count

In [`src/app/api/submit/route.ts`](file:///d:/Projects/Code%20In%20The%20Dark/src/app/api/submit/route.ts):

1. **Normalization**:
   Windows `\r\n` and Linux `\n` line breaks are normalized to standard Unix `\n`.
   Leading and trailing whitespace is trimmed:
   ```typescript
   const normalizedActual = (res.stdout || '').replace(/\r\n/g, '\n').trim();
   const normalizedExpected = (tc.expectedOutput || '').replace(/\r\n/g, '\n').trim();
   const passed = res.isSuccess && normalizedActual === normalizedExpected;
   ```

2. **Passing Ratio**:
   * If a problem has 5 test cases and 4 match, `testCasesPassed = 4`, `totalTestCases = 5` (**4/5 passed**).
   * Hidden test case outputs are masked as `[HIDDEN IN TEST RUNNER]` so contestants cannot inspect hidden answers.

---

## 6. The Dynamic Speed vs Accuracy Metric (SAM)

The score is computed by [`src/lib/scoring.ts`](file:///d:/Projects/Code%20In%20The%20Dark/src/lib/scoring.ts):

### Mathematical Rules:
1. **Accuracy Base Points**:
   $$\text{Base Score} = \text{round}\left( \text{Points} \times \frac{\text{Passed}}{\text{Total}} \right)$$
   * 5/5 passed on 100 pt problem = **100 pts**
   * 4/5 passed on 100 pt problem = **80 pts**
   * 0/5 passed = **0 pts** *(0 passed always yields 0 speed bonus)*.

2. **Time Saved Below Benchmark ($T_{\text{bench}} = 180\text{s}$)**:
   For any question sealed in duration $T < 180$ seconds:
   $$\text{SpeedRaw} = (180 - T) \times 0.60 + \max(0, 60 - T) \times 0.50$$
   $$\text{SpeedBonus} = \text{round}\left( \text{SpeedRaw} \times (\text{PassRatio})^{0.3} \right)$$
   $$\text{Final Score} = \text{Base Score} + \text{Speed Bonus}$$

### Example Case Demonstration:
* **Participant A (4/5 passed in 50 seconds)**:
  * Base Score: $80$
  * Time Saved: $180 - 50 = 130$s
  * Sub-minute Boost: $60 - 50 = 10$s
  * $\text{SpeedRaw} = (130 \times 0.60) + (10 \times 0.50) = 78 + 5 = 83$
  * $\text{SpeedBonus} = \text{round}(83 \times (0.8)^{0.3}) = \mathbf{78}$
  * **Final Score: $80 + 78 = \mathbf{158 \text{ pts}}$**

* **Participant B (5/5 passed in 90 seconds / 1m 30s)**:
  * Base Score: $100$
  * Time Saved: $180 - 90 = 90$s
  * $\text{SpeedRaw} = 90 \times 0.60 = 54$
  * $\text{SpeedBonus} = \text{round}(54 \times (1.0)^{0.3}) = \mathbf{54}$
  * **Final Score: $100 + 54 = \mathbf{154 \text{ pts}}$**

> **Result**: Participant A achieves **158 points**, edging out Participant B (**154 points**) because Participant A solved the problem **40 seconds faster** in a rapid sub-minute sprint!

---

## 7. Leaderboard & Admiralty Stage Reveal

1. **Data Aggregation**:
   [`buildLeaderboard()`](file:///d:/Projects/Code%20In%20The%20Dark/src/lib/db.ts) sums the question scores for each participant and subtracts anti-cheat strike penalties ($-50$ pts per violation strike).

2. **Tiebreaking Hierarchy**:
   * **Criterion 1**: `totalScore` **DESC** (highest points ranks #1).
   * **Criterion 2**: `totalDurationMs` **ASC** (fastest cumulative question duration breaks ties).
   * **Criterion 3**: `firstSubmittedAt` **ASC** (earliest first seal timestamp breaks remaining ties).

3. **Stage Reveal Sequence**:
   When the admin activates **Stage Reveal Mode** (`phase: 'reveal'`):
   * `0.0s`: All podium positions are masked in theatrical fog.
   * `1.5s`: **1st Place** (Gold Champion) is revealed with celebration tone.
   * `3.0s`: **2nd Place** (Silver Medalist) is revealed.
   * `4.5s`: **3rd Place** (Bronze Medalist) is revealed.
   * `6.0s`: Complete rankings (1st to last) unlock for all spectators and contestants with victory fanfare audio.
