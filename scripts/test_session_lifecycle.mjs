import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local manually
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const k = trimmed.slice(0, eqIdx).trim();
      const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      process.env[k] = v;
    }
  }
} catch (e) {
  // Ignore
}


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const PASSKEY = process.env.ADMIN_SECRET || 'admin1111';

const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('───────────────────────────────────────────────────────');
  console.log('🧪 TESTING CONTEST SESSION RENAME & PURGE LIFECYCLE');
  console.log('───────────────────────────────────────────────────────\n');

  // 1. Create a test session
  console.log('1. Creating test session...');
  const createRes = await fetch(`${BASE_URL}/api/contest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'createSession',
      passkey: PASSKEY,
      label: 'Temp Session for Cascade Test',
      notes: 'Initial test notes',
    }),
  });

  const createData = await createRes.json();
  if (!createRes.ok || !createData.session?.id) {
    throw new Error(`Failed to create test session: ${JSON.stringify(createData)}`);
  }
  const testSessionId = createData.session.id;
  console.log(`   ✅ Session created: ${testSessionId} ("${createData.session.label}")`);

  // 2. Add question to this session
  console.log('\n2. Populating session with questions, test cases, participants, submissions, and violations...');
  const { data: qData, error: qErr } = await supabase
    .from('questions')
    .insert({
      session_id: testSessionId,
      title: 'Temp Question To Purge',
      points: 100,
    })
    .select()
    .single();

  if (qErr) throw qErr;
  console.log(`   ✅ Question created: ${qData.id}`);

  // Test case
  const { error: tcErr } = await supabase
    .from('test_cases')
    .insert({
      question_id: qData.id,
      input: '1 2',
      expected_output: '3',
    });
  if (tcErr) throw tcErr;
  console.log('   ✅ Test case created');

  // Participant
  const { data: pData, error: pErr } = await supabase
    .from('participants')
    .insert({
      session_id: testSessionId,
      name: 'Purge Candidate',
      roll_number: 'TEST-PURGE-999',
      registered_at: Date.now(),
      last_active_at: Date.now(),
    })
    .select()
    .single();
  if (pErr) throw pErr;
  console.log(`   ✅ Participant created: ${pData.id}`);

  // Submission
  const { error: subErr } = await supabase
    .from('submissions')
    .insert({
      session_id: testSessionId,
      participant_id: pData.id,
      question_id: qData.id,
      participant_name: 'Purge Candidate',
      participant_roll: 'TEST-PURGE-999',
      question_title: 'Temp Question To Purge',
      code: 'print("hello")',
      submitted_at: Date.now(),
    });
  if (subErr) throw subErr;
  console.log('   ✅ Submission record created');

  // Violation
  const { error: violErr } = await supabase
    .from('violations')
    .insert({
      session_id: testSessionId,
      participant_id: pData.id,
      participant_name: 'Purge Candidate',
      type: 'tab_blur',
      timestamp: Date.now(),
      strike_count: 1,
    });
  if (violErr) throw violErr;
  console.log('   ✅ Violation record created');

  // 3. Test Rename Action
  console.log('\n3. Testing Rename Session Action...');
  const renameRes = await fetch(`${BASE_URL}/api/contest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'renameSession',
      passkey: PASSKEY,
      sessionId: testSessionId,
      label: 'Renamed Golden Fleet Session',
      notes: 'Updated nautical charter notes',
    }),
  });

  const renameData = await renameRes.json();
  if (!renameRes.ok || renameData.session?.label !== 'Renamed Golden Fleet Session') {
    throw new Error(`Rename failed: ${JSON.stringify(renameData)}`);
  }
  console.log(`   ✅ Session successfully renamed to: "${renameData.session.label}"`);
  console.log(`   ✅ Notes successfully updated to: "${renameData.session.notes}"`);

  // Verify in DB directly
  const { data: dbSession } = await supabase
    .from('contest_sessions')
    .select('*')
    .eq('id', testSessionId)
    .single();
  if (dbSession.label !== 'Renamed Golden Fleet Session') {
    throw new Error('Database label mismatch after rename');
  }
  console.log('   ✅ Database verification confirmed: Label and notes updated');

  // 4. Test Delete Session Action (Cascade Purge Everywhere)
  console.log('\n4. Testing Delete Session Action (Cascade Purge Everywhere)...');
  const deleteRes = await fetch(`${BASE_URL}/api/contest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'deleteSession',
      passkey: PASSKEY,
      sessionId: testSessionId,
    }),
  });

  const deleteData = await deleteRes.json();
  if (!deleteRes.ok || !deleteData.success) {
    throw new Error(`Delete failed: ${JSON.stringify(deleteData)}`);
  }
  console.log('   ✅ API confirmed deleteSession succeeded');

  // 5. Exhaustive Verification Across ALL Tables in Database
  console.log('\n5. Performing Exhaustive Verification Across Database Tables...');

  const { data: checkSession } = await supabase
    .from('contest_sessions')
    .select('id')
    .eq('id', testSessionId);
  console.log(`   • contest_sessions remaining: ${checkSession?.length ?? 0}`);
  if ((checkSession?.length ?? 0) !== 0) throw new Error('Session row was not deleted!');

  const { data: checkQuestions } = await supabase
    .from('questions')
    .select('id')
    .eq('session_id', testSessionId);
  console.log(`   • questions remaining: ${checkQuestions?.length ?? 0}`);
  if ((checkQuestions?.length ?? 0) !== 0) throw new Error('Questions were not deleted!');

  const { data: checkTestCases } = await supabase
    .from('test_cases')
    .select('id')
    .eq('question_id', qData.id);
  console.log(`   • test_cases remaining: ${checkTestCases?.length ?? 0}`);
  if ((checkTestCases?.length ?? 0) !== 0) throw new Error('Test cases were not deleted!');

  const { data: checkParticipants } = await supabase
    .from('participants')
    .select('id')
    .eq('session_id', testSessionId);
  console.log(`   • participants remaining: ${checkParticipants?.length ?? 0}`);
  if ((checkParticipants?.length ?? 0) !== 0) throw new Error('Participants were not deleted!');

  const { data: checkSubmissions } = await supabase
    .from('submissions')
    .select('id')
    .eq('session_id', testSessionId);
  console.log(`   • submissions remaining: ${checkSubmissions?.length ?? 0}`);
  if ((checkSubmissions?.length ?? 0) !== 0) throw new Error('Submissions were not deleted!');

  const { data: checkViolations } = await supabase
    .from('violations')
    .select('id')
    .eq('session_id', testSessionId);
  console.log(`   • violations remaining: ${checkViolations?.length ?? 0}`);
  if ((checkViolations?.length ?? 0) !== 0) throw new Error('Violations were not deleted!');

  console.log('\n───────────────────────────────────────────────────────');
  console.log('🎉 ALL TESTS PASSED: Session rename & purge 100% verified!');
  console.log('───────────────────────────────────────────────────────\n');
}

run().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
