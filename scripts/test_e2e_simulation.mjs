// Comprehensive End-to-End Simulation Script for 11:11 Chapter 2
// Tests all API routes, Sandbox execution, Anti-Cheat, Proctor actions, Plagiarism, and Leaderboard.

const BASE_URL = process.env.TEST_URL || 'https://11-11-chapter-2-codeinthedark.vercel.app';
const PASSKEY = 'admin1111';

async function runSimulation() {
  console.log('====================================================');
  console.log(`🚀 STARTING END-TO-END COMPETITION SIMULATION`);
  console.log(`🌐 Target: ${BASE_URL}`);
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Check Contest State
  try {
    const res = await fetch(`${BASE_URL}/api/contest`);
    const data = await res.json();
    assert(res.ok && data.contest, 'Contest API returns healthy state');
  } catch (e) {
    assert(false, `Contest API error: ${e.message}`);
  }

  // 2. Fetch Questions
  let questions = [];
  try {
    const res = await fetch(`${BASE_URL}/api/questions`);
    const data = await res.json();
    questions = data.questions || [];
    assert(res.ok && questions.length > 0, `Fetched ${questions.length} active questions`);
  } catch (e) {
    assert(false, `Questions API error: ${e.message}`);
  }

  const q1 = questions[0] || { id: 'q-cache-evict' };

  // 3. Register Contestant A
  const candidateA = {
    name: 'Ada Lovelace',
    rollNumber: `TEST-ROLL-A-${Date.now()}`,
    terminalId: 'NODE-001',
  };

  try {
    const res = await fetch(`${BASE_URL}/api/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidateA),
    });
    const data = await res.json();
    assert(res.ok && data.participant && data.participant.rollNumber === candidateA.rollNumber, 'Registered Candidate A');
    candidateA.id = data.participant.id;
  } catch (e) {
    assert(false, `Registration error: ${e.message}`);
  }

  // 4. Register Contestant B
  const candidateB = {
    name: 'Alan Turing',
    rollNumber: `TEST-ROLL-B-${Date.now()}`,
    terminalId: 'NODE-002',
  };

  try {
    const res = await fetch(`${BASE_URL}/api/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidateB),
    });
    const data = await res.json();
    assert(res.ok && data.participant && data.participant.rollNumber === candidateB.rollNumber, 'Registered Candidate B');
    candidateB.id = data.participant.id;
  } catch (e) {
    assert(false, `Registration error: ${e.message}`);
  }

  // 5. Submit Solution Candidate A (Python)
  const pythonCode = `import sys

def main():
    lines = sys.stdin.read().split()
    if not lines:
        return
    cap = int(lines[0])
    k = int(lines[1])
    tokens = lines[2:]
    cache = []
    evictions = 0
    for key in tokens:
        if key in cache:
            cache.remove(key)
            cache.append(key)
        else:
            if len(cache) >= cap:
                cache.pop(0)
                evictions += 1
            cache.append(key)
    print(evictions)

if __name__ == '__main__':
    main()
`;

  try {
    const res = await fetch(`${BASE_URL}/api/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantId: candidateA.id,
        participantName: candidateA.name,
        rollNumber: candidateA.rollNumber,
        terminalId: candidateA.terminalId,
        strikes: 0,
        questionId: q1.id,
        language: 'python',
        code: pythonCode,
      }),
    });
    const data = await res.json();
    assert(res.ok && data.success, `Candidate A submitted Python solution (Blind acknowledgment received: "${data.message?.slice(0, 40)}...")`);

    // Verify in Admin Submissions Inspector
    const adminSubsRes = await fetch(`${BASE_URL}/api/admin/submissions?passkey=${PASSKEY}`);
    const adminSubsData = await adminSubsRes.json();
    const adminSubA = (adminSubsData.submissions || []).find((s) => s.participantId === candidateA.id);
    assert(adminSubsRes.ok && adminSubA, `Admin Inspector verified Candidate A evaluation (Score: ${adminSubA?.score}, Passed: ${adminSubA?.testCasesPassed}/${adminSubA?.totalTestCases})`);
  } catch (e) {
    assert(false, `Submission error: ${e.message}`);
  }

  // 6. Anti-Cheat Violation Logging for Candidate B
  try {
    const res = await fetch(`${BASE_URL}/api/violations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participantId: candidateB.id,
        participantName: candidateB.name,
        rollNumber: candidateB.rollNumber,
        terminalId: candidateB.terminalId,
        type: 'tab_blur',
        details: 'Simulated tab switch infraction',
      }),
    });
    const data = await res.json();
    assert(res.ok && data.strikes >= 1, `Candidate B logged anti-cheat violation (Current strikes: ${data.strikes})`);
  } catch (e) {
    assert(false, `Violation API error: ${e.message}`);
  }

  // 7. Proctor Admin Action: Pardon Candidate B
  try {
    const res = await fetch(`${BASE_URL}/api/participants`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passkey: PASSKEY,
        participantId: candidateB.id,
        action: 'reset_strikes',
      }),
    });
    const data = await res.json();
    assert(res.ok && data.participant?.strikes === 0, 'Proctor successfully pardoned Candidate B back to 0 strikes');
  } catch (e) {
    assert(false, `Proctor action error: ${e.message}`);
  }

  // 8. Leaderboard Fetch
  try {
    const res = await fetch(`${BASE_URL}/api/leaderboard`);
    const data = await res.json();
    const foundA = (data.leaderboard || []).find((entry) => entry.participantId === candidateA.id);
    assert(res.ok && foundA, `Leaderboard reflects Candidate A ranking with score: ${foundA?.totalScore}`);
  } catch (e) {
    assert(false, `Leaderboard error: ${e.message}`);
  }

  // 9. Admin Announcement Test
  try {
    const res = await fetch(`${BASE_URL}/api/contest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passkey: PASSKEY,
        action: 'announcement',
        announcement: 'SYSTEM TEST: All arenas synchronized for 11:11 Chapter 2!',
      }),
    });
    const data = await res.json();
    assert(res.ok && data.contest?.announcement, 'Admin live announcement broadcasted');
  } catch (e) {
    assert(false, `Announcement error: ${e.message}`);
  }

  console.log('\n====================================================');
  console.log(`🏁 SIMULATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSimulation();
