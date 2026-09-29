import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*([^\r\n]+)/);
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*([^\r\n]+)/);
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

const BASE_URL = 'http://localhost:3000';

async function testPerfectSolve() {
  console.log('--- TESTING 5/5 PERFECT SOLVE VIA METHOD 3 ---');

  const { data: session } = await supabase
    .from('contest_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const { data: q1 } = await supabase
    .from('questions')
    .select('id, title')
    .eq('session_id', session.id)
    .order('display_order', { ascending: true })
    .limit(1)
    .single();

  const roll = `GOLD-${Date.now().toString().slice(-5)}`;
  const regRes = await fetch(`${BASE_URL}/api/participants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Grand Champion Navigator',
      rollNumber: roll,
      college: 'CET Trivandrum',
      phone: '9876543211',
      sessionId: session.id,
    }),
  });
  const regData = await regRes.json();
  const participant = regData.participant;
  console.log(`Registered: ${participant.name} (${participant.id})`);

  const code5of5 = `import sys
def solve():
    raw = sys.stdin.read().split()
    if not raw: return
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
solve()`;

  console.log('Sending instant seal submit...');
  const t0 = Date.now();
  const submitRes = await fetch(`${BASE_URL}/api/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      participantId: participant.id,
      sessionId: session.id,
      submissions: [{
        questionId: q1.id,
        language: 'python',
        code: code5of5,
        elapsedMs: 45000,
        firstDurationMs: 45000,
        firstSealedAt: Date.now() - 45000,
        lastSealedAt: Date.now(),
        isSealed: true,
      }],
      isAutoSubmit: false,
    }),
  });
  const sealTime = Date.now() - t0;
  const submitData = await submitRes.json();
  console.log(`Instant seal response in ${sealTime}ms: Status=${submitData.status}, isSubmitted=${submitData.isSubmitted}`);

  // Wait for background worker
  let done = false;
  let attempts = 0;
  let finalSub;

  while (!done && attempts < 15) {
    attempts++;
    await new Promise(r => setTimeout(r, 1000));
    const res = await fetch(`${BASE_URL}/api/submit?participantId=${participant.id}&sessionId=${session.id}`);
    const data = await res.json();
    finalSub = (data.submissions || []).find(s => s.questionId === q1.id);
    if (finalSub && finalSub.evaluationStatus === 'completed') {
      done = true;
    }
  }

  if (!done) {
    throw new Error('Background evaluation not finished');
  }

  console.log(`\nResults for ${finalSub.questionTitle}:`);
  console.log(`Passed: ${finalSub.testCasesPassed}/${finalSub.totalTestCases}`);
  console.log(`Base Score: ${finalSub.score - finalSub.speedBonus}`);
  console.log(`Speed Bonus: ${finalSub.speedBonus}`);
  console.log(`Final Score: ${finalSub.score}`);

  if (finalSub.testCasesPassed !== 5) {
    throw new Error(`Expected 5/5, got ${finalSub.testCasesPassed}/${finalSub.totalTestCases}`);
  }
  if (finalSub.score <= 100) {
    throw new Error(`Expected score > 100 with speed bonus, got ${finalSub.score}`);
  }

  console.log('\n🏆 5/5 PERFECT SCORE WITH SPEED BONUS VERIFIED!');
}

testPerfectSolve().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
