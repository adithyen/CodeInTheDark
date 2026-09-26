import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BASE_URL = 'http://localhost:3000';
const ADMIN_PASSKEY = process.env.ADMIN_SECRET || 'admin1111';

async function run() {
  console.log('--- STARTING DURATION & RULES VERIFICATION SUITE ---');

  // 1. Create a dedicated test session
  const testLabel = `TestRules_${Date.now()}`;
  console.log(`\n1. Creating test session: ${testLabel}`);
  const createRes = await fetch(`${BASE_URL}/api/contest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'createSession',
      passkey: ADMIN_PASSKEY,
      label: testLabel,
      notes: 'Automated test session for duration and rules',
    }),
  });
  const createData = await createRes.json();
  if (!createRes.ok || !createData.session) {
    throw new Error(`Failed to create session: ${JSON.stringify(createData)}`);
  }
  const sessionId = createData.session.id;
  console.log(`✓ Session created: ${sessionId}`);

  try {
    // 2. Start challenge with 50 minutes
    console.log('\n2. Starting challenge with 50 minutes duration...');
    const startRes = await fetch(`${BASE_URL}/api/contest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'startChallenge',
        passkey: ADMIN_PASSKEY,
        sessionId,
        durationMinutes: 50,
      }),
    });
    const startData = await startRes.json();
    const sessionAfterStart = startData.session;
    const initialDuration = sessionAfterStart.challenge_ends_at - sessionAfterStart.challenge_starts_at;
    console.log(`  Initial starts_at: ${sessionAfterStart.challenge_starts_at}`);
    console.log(`  Initial ends_at:   ${sessionAfterStart.challenge_ends_at}`);
    console.log(`  Initial duration:  ${initialDuration / 60000} mins`);
    if (Math.round(initialDuration / 60000) !== 50) {
      throw new Error(`Expected initial duration 50 mins, got ${initialDuration / 60000}`);
    }
    console.log('✓ Challenge started at 50 mins');

    // 3. EDIT CHALLENGE DURATION FROM 50 TO 20 MINS WHILE ACTIVE
    console.log('\n3. Editing challenge duration from 50 to 20 mins while active...');
    const editRes = await fetch(`${BASE_URL}/api/contest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateConfig',
        passkey: ADMIN_PASSKEY,
        sessionId,
        durationMinutes: 20,
      }),
    });
    const editData = await editRes.json();
    const sessionAfterEdit = editData.session;
    const updatedDuration = sessionAfterEdit.challenge_ends_at - sessionAfterEdit.challenge_starts_at;
    console.log(`  Updated starts_at:   ${sessionAfterEdit.challenge_starts_at}`);
    console.log(`  Updated ends_at:     ${sessionAfterEdit.challenge_ends_at}`);
    console.log(`  Updated duration_ms: ${sessionAfterEdit.challenge_duration_ms}`);
    console.log(`  Updated duration:    ${updatedDuration / 60000} mins`);
    if (Math.round(updatedDuration / 60000) !== 20) {
      throw new Error(`Expected updated duration 20 mins, got ${updatedDuration / 60000}`);
    }
    console.log('✓ CHALLENGE DURATION EDIT VERIFIED: Timer ends_at immediately shifted from 50m to 20m!');

    // 4. TEST ALLOW LATE JOIN = FALSE (DURING ACTIVE CONTEST)
    console.log('\n4. Testing Allow Late Join = FALSE during active contest...');
    await fetch(`${BASE_URL}/api/contest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateConfig',
        passkey: ADMIN_PASSKEY,
        sessionId,
        allowLateJoin: false,
      }),
    });

    const regRejectRes = await fetch(`${BASE_URL}/api/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Late Navigator 1',
        rollNumber: 'ROLL_LATE_1',
        terminalId: 'SEAT-99',
        sessionId,
      }),
    });
    const regRejectData = await regRejectRes.json();
    console.log(`  Response status: ${regRejectRes.status}, error: ${regRejectData.error}`);
    if (regRejectRes.status !== 403 || !regRejectData.error?.includes('late joining is disabled')) {
      throw new Error(`Expected 403 late join disabled error, got: ${JSON.stringify(regRejectData)}`);
    }
    console.log('✓ Late candidate properly BLOCKED when allow_late_join is false');

    // 5. TEST ALLOW LATE JOIN = TRUE (DURING ACTIVE CONTEST)
    console.log('\n5. Testing Allow Late Join = TRUE during active contest...');
    await fetch(`${BASE_URL}/api/contest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateConfig',
        passkey: ADMIN_PASSKEY,
        sessionId,
        allowLateJoin: true,
      }),
    });

    const regAllowRes = await fetch(`${BASE_URL}/api/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Late Navigator 1',
        rollNumber: 'ROLL_LATE_1',
        terminalId: 'SEAT-99',
        sessionId,
      }),
    });
    const regAllowData = await regAllowRes.json();
    if (!regAllowRes.ok || !regAllowData.participant) {
      throw new Error(`Expected registration to succeed, got: ${JSON.stringify(regAllowData)}`);
    }
    console.log(`✓ Late candidate successfully ACCEPTED: ${regAllowData.participant.name}`);

    // Reconnection of same participant during active contest
    const reconnectRes = await fetch(`${BASE_URL}/api/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Late Navigator 1 Updated',
        rollNumber: 'ROLL_LATE_1',
        terminalId: 'SEAT-99',
        sessionId,
      }),
    });
    const reconnectData = await reconnectRes.json();
    if (!reconnectRes.ok) {
      throw new Error(`Expected existing participant reconnect to succeed, got: ${JSON.stringify(reconnectData)}`);
    }
    console.log('✓ Existing participant successfully reconnected');

    // 6. TEST MAX NAVIGATORS CAPACITY ENFORCEMENT
    console.log('\n6. Testing Max Navigators Capacity Enforcement (max = 2)...');
    await fetch(`${BASE_URL}/api/contest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateConfig',
        passkey: ADMIN_PASSKEY,
        sessionId,
        maxParticipants: 2,
      }),
    });

    // Currently 1 participant (ROLL_LATE_1). Register 2nd participant (fills capacity to 2/2)
    const reg2Res = await fetch(`${BASE_URL}/api/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Navigator Two',
        rollNumber: 'ROLL_2',
        terminalId: 'SEAT-02',
        sessionId,
      }),
    });
    const reg2Data = await reg2Res.json();
    if (!reg2Res.ok) throw new Error(`Participant 2 should succeed: ${JSON.stringify(reg2Data)}`);
    console.log('✓ Participant 2 registered (Capacity: 2/2)');

    // Attempt to register 3rd participant (should exceed capacity and be rejected with 403)
    const reg3Res = await fetch(`${BASE_URL}/api/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Navigator Three',
        rollNumber: 'ROLL_3',
        terminalId: 'SEAT-03',
        sessionId,
      }),
    });
    const reg3Data = await reg3Res.json();
    console.log(`  Response status: ${reg3Res.status}, error: ${reg3Data.error}`);
    if (reg3Res.status !== 403 || !reg3Data.error?.includes('Maximum capacity')) {
      throw new Error(`Expected 403 capacity full error, got: ${JSON.stringify(reg3Data)}`);
    }
    console.log('✓ 3rd Participant REJECTED due to capacity limit (2/2 full)');

    // Existing participant 2 can still reconnect without capacity blockage
    const recon2Res = await fetch(`${BASE_URL}/api/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Navigator Two Reconnect',
        rollNumber: 'ROLL_2',
        terminalId: 'SEAT-02',
        sessionId,
      }),
    });
    if (!recon2Res.ok) throw new Error('Existing participant 2 should reconnect cleanly');
    console.log('✓ Existing participant 2 reconnected cleanly despite full capacity');

    console.log('\n======================================================');
    console.log('ALL VERIFICATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================');
  } finally {
    // 7. Clean up test session
    console.log('\n7. Cleaning up test session...');
    const delRes = await fetch(`${BASE_URL}/api/contest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'deleteSession',
        passkey: ADMIN_PASSKEY,
        sessionId,
      }),
    });
    const delData = await delRes.json();
    console.log(`✓ Test session purged: ${delData.success}`);
  }
}

run().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
