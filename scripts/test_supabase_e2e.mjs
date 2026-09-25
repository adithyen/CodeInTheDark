/**
 * Full End-to-End Simulation Test against the local dev server backed by Supabase PostgreSQL.
 */

const BASE_URL = 'http://localhost:3000';
const PASSKEY = 'admin1111';

async function run() {
  console.log('───────────────────────────────────────────────────────');
  console.log('🧪 RUNNING FULL SUPABASE END-TO-END COMPETITION TEST');
  console.log('───────────────────────────────────────────────────────\n');

  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`  ✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Get contest state
  const contestRes = await fetch(`${BASE_URL}/api/contest`);
  const contestData = await contestRes.json();
  assert(contestRes.ok && contestData.session, 'Contest API returns valid active session from Supabase');
  const sessionId = contestData.session.id;
  console.log(`     Active Session: ${contestData.session.label} (ID: ${sessionId}, Phase: ${contestData.session.phase})`);

  // 2. Check questions from Supabase
  const qRes = await fetch(`${BASE_URL}/api/questions?sessionId=${sessionId}`);
  const qData = await qRes.json();
  assert(qRes.ok && qData.questions?.length === 4, `Questions API returns all 4 questions from Supabase (found ${qData.questions?.length})`);
  const q1 = qData.questions[0];
  console.log(`     Q1 Title: "${q1.title}" (${q1.points} pts)`);

  // 3. Reset session to setup
  await fetch(`${BASE_URL}/api/contest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateConfig', passkey: PASSKEY, sessionId, label: '11:11 Chapter 2 — Live Competition' }),
  });

  // 4. Open Registration Window (3 min, autoStart: true)
  const openRegRes = await fetch(`${BASE_URL}/api/contest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'openRegistration', passkey: PASSKEY, sessionId, durationMinutes: 3, autoStart: true }),
  });
  const openRegData = await openRegRes.json();
  assert(openRegRes.ok && openRegData.session?.phase === 'registration', 'Opened registration window (phase -> registration)');
  assert(openRegData.session?.registration_ends_at > Date.now(), 'Registration ends_at correctly calculated in future');

  // 5. Register Candidate 1 (Alice)
  const rollA = `E2E-ALICE-${Date.now().toString().slice(-4)}`;
  const regARes = await fetch(`${BASE_URL}/api/participants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Alice Engineer', rollNumber: rollA, terminalId: 'TERM-01' }),
  });
  const regAData = await regARes.json();
  assert(regARes.ok && regAData.participant?.id, `Registered candidate Alice (${rollA})`);
  const aliceId = regAData.participant.id;

  // 6. Register Candidate 2 (Bob)
  const rollB = `E2E-BOB-${Date.now().toString().slice(-4)}`;
  const regBRes = await fetch(`${BASE_URL}/api/participants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Bob Hacker', rollNumber: rollB, terminalId: 'TERM-02' }),
  });
  const regBData = await regBRes.json();
  assert(regBRes.ok && regBData.participant?.id, `Registered candidate Bob (${rollB})`);
  const bobId = regBData.participant.id;

  // 7. Verify participants listed in session
  const partsRes = await fetch(`${BASE_URL}/api/participants?passkey=${PASSKEY}&sessionId=${sessionId}`);
  const partsData = await partsRes.json();
  const foundAlice = partsData.participants?.some(p => p.id === aliceId);
  const foundBob = partsData.participants?.some(p => p.id === bobId);
  assert(foundAlice && foundBob, 'Both participants persistent in Supabase participants table');

  // 8. Start Challenge (transition to active)
  const startRes = await fetch(`${BASE_URL}/api/contest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'startChallenge', passkey: PASSKEY, sessionId, durationMinutes: 50 }),
  });
  const startData = await startRes.json();
  assert(startRes.ok && startData.session?.phase === 'active', 'Started challenge (phase -> active)');
  assert(startData.session?.challenge_ends_at > Date.now(), 'Challenge ends_at properly set for 50 minutes');

  // 9. Submit Correct Solution for Alice on Q1 (Drone Dispatcher)
  // Python solution that solves the two-pointer / two-sum drone weight balance
  const aliceCode = `import sys

def main():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    target = int(input_data[1])
    weights = [int(x) for x in input_data[2:2 + n]]
    
    seen = set()
    found = False
    for w in weights:
        if (target - w) in seen:
            found = True
            break
        seen.add(w)
        
    print("YES" if found else "NO")

if __name__ == '__main__':
    main()`;

  const subARes = await fetch(`${BASE_URL}/api/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      participantId: aliceId,
      participantName: 'Alice Engineer',
      participantRoll: rollA,
      terminalId: 'TERM-01',
      questionId: q1.id,
      language: 'python',
      code: aliceCode,
      sessionId,
      isAutoSubmit: false,
    }),
  });
  const subAData = await subARes.json();
  assert(subARes.ok && subAData.success, 'Alice submitted solution for Q1');

  // 10. Verify submission evaluation in admin endpoint
  const subsRes = await fetch(`${BASE_URL}/api/admin/submissions?passkey=${PASSKEY}&sessionId=${sessionId}`);
  const subsData = await subsRes.json();
  const aliceSub = subsData.submissions?.find(s => s.participantId === aliceId && s.questionId === q1.id);
  assert(aliceSub && aliceSub.testCasesPassed === aliceSub.totalTestCases, `Alice submission evaluated: ${aliceSub?.testCasesPassed}/${aliceSub?.totalTestCases} test cases passed (Score: ${aliceSub?.score})`);

  // 11. Record Anti-Cheat Violation for Bob
  const violRes = await fetch(`${BASE_URL}/api/violations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      participantId: bobId,
      participantName: 'Bob Hacker',
      type: 'tab_blur',
      details: 'Participant switched browser tab during active fullscreen lock',
      sessionId,
    }),
  });
  const violData = await violRes.json();
  assert(violRes.ok && violData.strikeCount === 1, 'Anti-cheat strike successfully recorded in Supabase (Strike 1)');

  // 12. Check Leaderboard
  const lbRes = await fetch(`${BASE_URL}/api/leaderboard?sessionId=${sessionId}`);
  const lbData = await lbRes.json();
  assert(lbRes.ok && lbData.leaderboard?.length > 0, `Leaderboard generated with ${lbData.leaderboard?.length} entries`);
  const topRank = lbData.leaderboard[0];
  assert(topRank?.name === 'Alice Engineer' && topRank?.totalScore > 0, `Alice holds Rank 1 with ${topRank?.totalScore} points`);

  // 13. Clean up test participants from Supabase
  await fetch(`${BASE_URL}/api/participants`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passkey: PASSKEY, participantId: aliceId, action: 'remove' }),
  });
  await fetch(`${BASE_URL}/api/participants`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passkey: PASSKEY, participantId: bobId, action: 'remove' }),
  });

  // 14. Reset session back to setup for the real contest
  await fetch(`${BASE_URL}/api/contest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'endChallenge', passkey: PASSKEY, sessionId }),
  });
  await fetch(`${BASE_URL}/api/contest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateConfig', passkey: PASSKEY, sessionId }),
  });

  console.log('\n───────────────────────────────────────────────────────');
  console.log(`📊 SIMULATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('───────────────────────────────────────────────────────\n');

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Fatal simulation error:', err);
  process.exit(1);
});
