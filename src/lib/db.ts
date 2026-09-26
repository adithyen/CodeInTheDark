import { supabase } from './supabase';
import { ContestSession, Question, Participant, Submission, Violation, Language } from '@/types';

// ─────────────────────────────────────────────────────────────────────
// SESSION HELPERS
// ─────────────────────────────────────────────────────────────────────

/**
 * Returns the currently active/viewable session.
 * Priority order: registration → active → paused → reveal → ended → setup
 * 'ended' and 'reveal' are included so the leaderboard/lobby can still see them.
 */
export async function getActiveSession(): Promise<ContestSession | null> {
  // Priority: live phases first
  const { data: live } = await supabase
    .from('contest_sessions')
    .select('*')
    .in('phase', ['registration', 'active', 'paused', 'reveal'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (live) return live as ContestSession;

  // Fallback: most recent session regardless of phase
  const { data: latest } = await supabase
    .from('contest_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return (latest as ContestSession) || null;
}

export async function getSessionById(id: string): Promise<ContestSession | null> {
  const { data } = await supabase
    .from('contest_sessions')
    .select('*')
    .eq('id', id)
    .single();
  return (data as ContestSession) || null;
}

export async function getAllSessions(): Promise<ContestSession[]> {
  const { data } = await supabase
    .from('contest_sessions')
    .select('*')
    .order('created_at', { ascending: false });
  return (data as ContestSession[]) || [];
}

export async function updateSession(
  id: string,
  updates: Partial<ContestSession>
): Promise<ContestSession | null> {
  const { data } = await supabase
    .from('contest_sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  return (data as ContestSession) || null;
}

export async function createSession(
  label: string,
  notes: string,
  scheduledAt?: string
): Promise<ContestSession | null> {
  const { data } = await supabase
    .from('contest_sessions')
    .insert({
      label,
      notes,
      scheduled_at: scheduledAt || null,
      phase: 'setup',
    })
    .select()
    .single();
  return (data as ContestSession) || null;
}

/**
 * Renames a contest session and updates its notes.
 */
export async function renameSession(
  id: string,
  newLabel: string,
  newNotes?: string
): Promise<ContestSession | null> {
  const updates: Partial<ContestSession> = { label: newLabel.trim() };
  if (newNotes !== undefined) updates.notes = newNotes.trim();
  return updateSession(id, updates);
}

/**
 * Permanently deletes a contest session and ALL related information from EVERY table:
 * test_cases, questions, submissions, violations, participants, and contest_sessions.
 * If zero sessions remain, initializes a fresh clean default session.
 */
export async function deleteSession(id: string): Promise<boolean> {
  try {
    // 1. Find all question IDs for this session
    const { data: questions } = await supabase
      .from('questions')
      .select('id')
      .eq('session_id', id);

    const questionIds = (questions || []).map((q) => q.id);

    // 2. Delete test cases for those questions
    if (questionIds.length > 0) {
      const { error: tcErr } = await supabase
        .from('test_cases')
        .delete()
        .in('question_id', questionIds);
      if (tcErr) console.error('Error deleting test_cases for session:', tcErr);
    }

    // 3. Delete all submissions belonging to this session
    const { error: subErr } = await supabase
      .from('submissions')
      .delete()
      .eq('session_id', id);
    if (subErr) console.error('Error deleting submissions for session:', subErr);

    // 4. Delete all anti-cheat violations belonging to this session
    const { error: violErr } = await supabase
      .from('violations')
      .delete()
      .eq('session_id', id);
    if (violErr) console.error('Error deleting violations for session:', violErr);

    // 5. Delete all registered participants belonging to this session
    const { error: partErr } = await supabase
      .from('participants')
      .delete()
      .eq('session_id', id);
    if (partErr) console.error('Error deleting participants for session:', partErr);

    // 6. Delete all questions belonging to this session
    const { error: qErr } = await supabase
      .from('questions')
      .delete()
      .eq('session_id', id);
    if (qErr) console.error('Error deleting questions for session:', qErr);

    // 7. Delete the session row itself
    const { error: sessErr } = await supabase
      .from('contest_sessions')
      .delete()
      .eq('id', id);

    if (sessErr) {
      console.error('Error deleting session row:', sessErr);
      return false;
    }

    // 8. Fail-safe: If no sessions remain in database, create a fallback setup session
    const remaining = await getAllSessions();
    if (remaining.length === 0) {
      await createSession('11:11 Chapter 2 — Main Arena', 'Default session initialized', undefined);
    }

    return true;
  } catch (err) {
    console.error('Fatal error during deleteSession:', err);
    return false;
  }
}


/**
 * Auto-transition: if registration ended and auto_start is on, flip to active.
 * Called on every GET /api/contest so no cron is needed.
 */
export async function autoTransitionSession(session: ContestSession): Promise<ContestSession> {
  const now = Date.now();

  if (
    session.phase === 'registration' &&
    session.auto_start_on_reg_close &&
    session.registration_ends_at &&
    now >= session.registration_ends_at
  ) {
    const challengeEndsAt = now + (session.challenge_duration_ms ?? 3000000);
    const updated = await updateSession(session.id, {
      phase: 'active',
      challenge_starts_at: now,
      challenge_ends_at: challengeEndsAt,
    });
    return updated || session;
  }

  if (
    session.phase === 'active' &&
    !session.is_paused &&
    session.challenge_ends_at &&
    now >= session.challenge_ends_at
  ) {
    const updated = await updateSession(session.id, { phase: 'ended' });
    return updated || session;
  }

  return session;
}

// ─────────────────────────────────────────────────────────────────────
// QUESTION HELPERS
// ─────────────────────────────────────────────────────────────────────

export async function getQuestionsForSession(sessionId: string, includeHidden = false): Promise<Question[]> {
  const { data: rows } = await supabase
    .from('questions')
    .select('*, test_cases(*)')
    .eq('session_id', sessionId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (!rows) return [];

  return rows.map((q: any) => {
    const testCases = (q.test_cases || [])
      .sort((a: any, b: any) => a.display_order - b.display_order)
      .filter((tc: any) => includeHidden || !tc.is_hidden)
      .map((tc: any) => ({
        id: tc.id,
        input: tc.input,
        expectedOutput: tc.expected_output,
        isHidden: tc.is_hidden,
        explanation: tc.explanation,
      }));

    return {
      id: q.id,
      sessionId: q.session_id,
      title: q.title,
      category: q.category,
      difficulty: q.difficulty,
      points: q.points,
      order: q.display_order,
      scenario: q.scenario,
      inputFormat: q.input_format,
      outputFormat: q.output_format,
      constraints: q.constraints,
      starterTemplates: {
        c: q.starter_c,
        python: q.starter_python,
        java: q.starter_java,
      },
      testCases,
    } as Question;
  });
}

export async function upsertQuestion(sessionId: string, q: Partial<Question> & { id?: string }): Promise<Question | null> {
  const payload: any = {
    session_id: sessionId,
    title: q.title,
    category: q.category,
    difficulty: q.difficulty,
    points: q.points,
    display_order: q.order ?? 1,
    scenario: q.scenario,
    input_format: q.inputFormat,
    output_format: q.outputFormat,
    constraints: q.constraints,
    starter_c: q.starterTemplates?.c,
    starter_python: q.starterTemplates?.python,
    starter_java: q.starterTemplates?.java,
    updated_at: new Date().toISOString(),
  };

  if (q.id) payload.id = q.id;

  const { data } = await supabase
    .from('questions')
    .upsert(payload)
    .select()
    .single();

  if (!data) return null;

  // Handle test cases if provided
  if (q.testCases && q.testCases.length > 0) {
    // Delete existing and re-insert
    await supabase.from('test_cases').delete().eq('question_id', data.id);
    const tcRows = q.testCases.map((tc, idx) => ({
      id: tc.id || undefined,
      question_id: data.id,
      input: tc.input,
      expected_output: tc.expectedOutput,
      is_hidden: tc.isHidden,
      explanation: tc.explanation || '',
      display_order: idx + 1,
    }));
    await supabase.from('test_cases').insert(tcRows);
  }

  return (await getQuestionsForSession(sessionId, true)).find(x => x.id === data.id) || null;
}

export async function deleteQuestion(id: string): Promise<void> {
  await supabase.from('questions').delete().eq('id', id);
}

export async function bulkImportQuestions(sessionId: string, questions: Partial<Question>[]): Promise<void> {
  // Delete existing questions for this session
  await supabase.from('questions').delete().eq('session_id', sessionId);

  for (let i = 0; i < questions.length; i++) {
    await upsertQuestion(sessionId, { ...questions[i], order: i + 1 });
  }
}

export async function copyQuestionsToSession(fromSessionId: string, toSessionId: string): Promise<void> {
  const questions = await getQuestionsForSession(fromSessionId, true);
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await upsertQuestion(toSessionId, { ...q, id: undefined, order: i + 1 });
  }
}

// ─────────────────────────────────────────────────────────────────────
// PARTICIPANT HELPERS
// ─────────────────────────────────────────────────────────────────────

export async function getParticipantsForSession(sessionId: string): Promise<Participant[]> {
  const { data } = await supabase
    .from('participants')
    .select('*')
    .eq('session_id', sessionId)
    .order('registered_at', { ascending: true });

  return (data || []).map(dbRowToParticipant);
}

export async function getParticipantByRoll(sessionId: string, rollNumber: string): Promise<Participant | null> {
  const { data } = await supabase
    .from('participants')
    .select('*')
    .eq('session_id', sessionId)
    .eq('roll_number', rollNumber.toUpperCase())
    .maybeSingle();
  return data ? dbRowToParticipant(data) : null;
}

export async function getParticipantByPhone(sessionId: string, phone: string): Promise<Participant | null> {
  const cleanPhone = phone.trim();
  if (!cleanPhone) return null;
  const { data } = await supabase
    .from('participants')
    .select('*')
    .eq('session_id', sessionId)
    .eq('phone', cleanPhone)
    .maybeSingle();
  return data ? dbRowToParticipant(data) : null;
}

export async function getParticipantById(id: string): Promise<Participant | null> {
  const { data } = await supabase
    .from('participants')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ? dbRowToParticipant(data) : null;
}

export async function upsertParticipant(sessionId: string, p: {
  name: string;
  phone?: string;
  college?: string;
  rollNumber?: string;
  terminalId?: string;
}): Promise<Participant> {
  const now = Date.now();
  const phoneVal = (p.phone || '').trim();
  const collegeVal = (p.college || '').trim();
  const rollVal = (p.rollNumber || phoneVal || `NAV-${Math.floor(1000 + Math.random() * 9000)}`).trim().toUpperCase();

  // Check if participant already exists in this session
  let existing: Participant | null = null;
  if (phoneVal) {
    existing = await getParticipantByPhone(sessionId, phoneVal);
  }
  if (!existing && rollVal) {
    existing = await getParticipantByRoll(sessionId, rollVal);
  }

  if (existing) {
    // Update last active and update any missing fields
    const updates: any = { last_active_at: now };
    if (phoneVal) updates.phone = phoneVal;
    if (collegeVal) updates.college = collegeVal;

    await supabase
      .from('participants')
      .update(updates)
      .eq('id', existing.id);

    return {
      ...existing,
      phone: phoneVal || existing.phone,
      college: collegeVal || existing.college,
      lastActiveAt: now,
    };
  }

  const terminalId = p.terminalId?.trim().toUpperCase() || `SEAT-${Math.floor(10 + Math.random() * 90)}`;

  const { data } = await supabase
    .from('participants')
    .insert({
      session_id: sessionId,
      name: p.name.trim(),
      phone: phoneVal,
      college: collegeVal,
      roll_number: rollVal,
      terminal_id: terminalId,
      registered_at: now,
      last_active_at: now,
    })
    .select()
    .single();

  if (!data) throw new Error('Failed to create participant');
  return dbRowToParticipant(data);
}

export async function updateParticipant(id: string, updates: Partial<{
  strikes: number;
  isLockedOut: boolean;
  activeLanguage: Language;
  currentQuestionId: string;
  lastActiveAt: number;
}>): Promise<Participant | null> {
  const dbUpdates: any = {};
  if (updates.strikes !== undefined) dbUpdates.strikes = updates.strikes;
  if (updates.isLockedOut !== undefined) dbUpdates.is_locked_out = updates.isLockedOut;
  if (updates.activeLanguage !== undefined) dbUpdates.active_language = updates.activeLanguage;
  if (updates.currentQuestionId !== undefined) dbUpdates.current_question_id = updates.currentQuestionId;
  if (updates.lastActiveAt !== undefined) dbUpdates.last_active_at = updates.lastActiveAt;

  const { data } = await supabase
    .from('participants')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  return data ? dbRowToParticipant(data) : null;
}

export async function deleteParticipant(id: string): Promise<void> {
  await supabase.from('participants').delete().eq('id', id);
}

function dbRowToParticipant(row: any): Participant {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    phone: row.phone || '',
    college: row.college || '',
    rollNumber: row.roll_number || '',
    terminalId: row.terminal_id || '',
    strikes: row.strikes || 0,
    isLockedOut: row.is_locked_out || false,
    activeLanguage: row.active_language,
    currentQuestionId: row.current_question_id,
    registeredAt: row.registered_at,
    lastActiveAt: row.last_active_at,
  };
}

// ─────────────────────────────────────────────────────────────────────
// SUBMISSION HELPERS
// ─────────────────────────────────────────────────────────────────────

export async function getSubmissionsForSession(sessionId: string, includeDrafts: boolean = false): Promise<Submission[]> {
  let query = supabase
    .from('submissions')
    .select('*')
    .eq('session_id', sessionId);

  if (!includeDrafts) {
    query = query.neq('evaluation_status', 'draft');
  }

  const { data } = await query.order('submitted_at', { ascending: false });

  return (data || []).map(dbRowToSubmission);
}

export async function getParticipantSubmissions(participantId: string, sessionId?: string): Promise<Submission[]> {
  let query = supabase
    .from('submissions')
    .select('*')
    .eq('participant_id', participantId);

  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  const { data } = await query;
  return (data || []).map(dbRowToSubmission);
}

export async function hasParticipantSubmitted(participantId: string, sessionId?: string): Promise<boolean> {
  const submissions = await getParticipantSubmissions(participantId, sessionId);
  return submissions.some(s => s.evaluationStatus === 'completed' && !s.isAutoSubmit ? true : s.evaluationStatus === 'completed');
}

export async function upsertSubmission(sub: Omit<Submission, 'id'> & { sessionId: string }): Promise<Submission> {
  // Look up existing submission for this participant + question
  const { data: existing } = await supabase
    .from('submissions')
    .select('id, submitted_at, first_submitted_at, evaluation_status')
    .eq('participant_id', sub.participantId)
    .eq('question_id', sub.questionId)
    .single();

  const isDraft = sub.evaluationStatus === 'draft';
  const now = sub.submittedAt || Date.now();

  let firstSubmittedAt: number | null = null;
  if (!isDraft) {
    if (sub.firstSubmittedAt) {
      firstSubmittedAt = sub.firstSubmittedAt;
    } else if (existing && existing.evaluation_status !== 'draft' && (existing.first_submitted_at || existing.submitted_at)) {
      firstSubmittedAt = existing.first_submitted_at ?? existing.submitted_at;
    } else {
      firstSubmittedAt = now;
    }
  }

  let statusMessage = sub.statusMessage || '';
  if (sub.firstExecTimeMs !== undefined || sub.execTimeMs !== undefined) {
    try {
      const parsed = statusMessage.startsWith('{') ? JSON.parse(statusMessage) : {};
      parsed.firstExecTimeMs = sub.firstExecTimeMs ?? parsed.firstExecTimeMs ?? sub.execTimeMs;
      parsed.lastExecTimeMs = sub.execTimeMs ?? parsed.lastExecTimeMs;
      parsed.firstSealedAt = firstSubmittedAt ?? parsed.firstSealedAt ?? now;
      parsed.lastSealedAt = now;
      statusMessage = JSON.stringify(parsed);
    } catch {}
  }

  const payload: any = {
    session_id: sub.sessionId,
    participant_id: sub.participantId,
    participant_name: sub.participantName,
    participant_roll: sub.participantRoll,
    question_id: sub.questionId,
    question_title: sub.questionTitle,
    language: sub.language,
    code: sub.code,
    submitted_at: isDraft ? null : now,
    // Preserve the FIRST submission timestamp for tiebreaking.
    first_submitted_at: firstSubmittedAt,
    is_auto_submit: sub.isAutoSubmit ?? false,
    evaluation_status: sub.evaluationStatus,
    test_cases_passed: sub.testCasesPassed ?? 0,
    total_test_cases: sub.totalTestCases ?? 0,
    score: sub.score ?? 0,
    speed_bonus: sub.speedBonus ?? 0,
    exec_time_ms: sub.execTimeMs ?? null,
    status_message: statusMessage,
    test_case_details: sub.testCaseDetails ?? [],
  };

  if (existing?.id) {
    const { data } = await supabase
      .from('submissions')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    return dbRowToSubmission(data);
  }

  const { data } = await supabase
    .from('submissions')
    .insert(payload)
    .select()
    .single();
  return dbRowToSubmission(data);
}

function dbRowToSubmission(row: any): Submission {
  let firstExecTimeMs = row.exec_time_ms;
  let firstSealedAt = row.first_submitted_at ?? row.submitted_at;
  let lastSealedAt = row.submitted_at;

  if (row.status_message && typeof row.status_message === 'string' && row.status_message.startsWith('{')) {
    try {
      const meta = JSON.parse(row.status_message);
      if (meta.firstExecTimeMs !== undefined) firstExecTimeMs = meta.firstExecTimeMs;
      if (meta.firstSealedAt !== undefined) firstSealedAt = meta.firstSealedAt;
      if (meta.lastSealedAt !== undefined) lastSealedAt = meta.lastSealedAt;
    } catch {}
  }

  return {
    id: row.id,
    sessionId: row.session_id,
    participantId: row.participant_id,
    participantName: row.participant_name,
    participantRoll: row.participant_roll,
    questionId: row.question_id,
    questionTitle: row.question_title,
    language: row.language as Language,
    code: row.code,
    submittedAt: lastSealedAt,
    // firstSubmittedAt: the original timestamp — never overwritten on resubmit
    firstSubmittedAt: firstSealedAt,
    isAutoSubmit: row.is_auto_submit,
    evaluationStatus: row.evaluation_status,
    testCasesPassed: row.test_cases_passed,
    totalTestCases: row.total_test_cases,
    score: row.score,
    speedBonus: row.speed_bonus,
    execTimeMs: row.exec_time_ms,
    firstExecTimeMs,
    statusMessage: row.status_message,
    testCaseDetails: row.test_case_details,
  };
}

// ─────────────────────────────────────────────────────────────────────
// VIOLATION HELPERS
// ─────────────────────────────────────────────────────────────────────

export async function getViolationsForSession(sessionId: string): Promise<Violation[]> {
  const { data } = await supabase
    .from('violations')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  return (data || []).map((row: any) => ({
    id: row.id,
    sessionId: row.session_id,
    participantId: row.participant_id,
    participantName: row.participant_name,
    type: row.type,
    details: row.details,
    strikeCount: row.strike_count,
    timestamp: row.timestamp,
  }));
}

export async function insertViolation(v: {
  sessionId: string;
  participantId: string;
  participantName: string;
  type: string;
  details: string;
  strikeCount: number;
}): Promise<void> {
  await supabase.from('violations').insert({
    session_id: v.sessionId,
    participant_id: v.participantId,
    participant_name: v.participantName,
    type: v.type,
    details: v.details,
    strike_count: v.strikeCount,
    timestamp: Date.now(),
  });
}

// ─────────────────────────────────────────────────────────────────────
// LEADERBOARD AGGREGATION
// ─────────────────────────────────────────────────────────────────────

export async function buildLeaderboard(sessionId: string) {
  const [participants, submissions] = await Promise.all([
    getParticipantsForSession(sessionId),
    getSubmissionsForSession(sessionId),
  ]);

  const entriesMap = new Map<string, any>();
  for (const p of participants) {
    entriesMap.set(p.id, {
      participantId: p.id,
      name: p.name,
      college: p.college || '',
      rollNumber: p.rollNumber || '',
      terminalId: p.terminalId,
      totalScore: 0,
      questionsSolved: 0,
      partialSolved: 0,
      strikes: p.strikes,
      lastSubmissionTime: p.registeredAt,
      perQuestionScores: {},
    });
  }

  for (const sub of submissions) {
    if (sub.evaluationStatus === 'draft') continue;
    const entry = entriesMap.get(sub.participantId);
    if (!entry) continue;

    // Use firstSubmittedAt for tiebreaking (who solved it first)
    const firstTs = (sub as any).firstSubmittedAt ?? sub.submittedAt;

    entry.perQuestionScores[sub.questionId] = {
      score: sub.score,
      passedRatio: `${sub.testCasesPassed}/${sub.totalTestCases}`,
      language: sub.language,
      submittedAt: sub.submittedAt,
      firstSubmittedAt: firstTs,
      execTimeMs: sub.execTimeMs || 0,
      isAutoSubmit: sub.isAutoSubmit,
    };

    if (sub.testCasesPassed === sub.totalTestCases && sub.totalTestCases > 0) {
      entry.questionsSolved += 1;
    } else if (sub.testCasesPassed > 0) {
      entry.partialSolved += 1;
    }

    // Track earliest first-submission timestamp for tiebreaking
    if (firstTs < entry.lastSubmissionTime || entry.lastSubmissionTime === entry.registeredAt) {
      entry.lastSubmissionTime = firstTs;
    }
  }

  const entries = Array.from(entriesMap.values()).map((entry) => {
    const questionScoreSum = Object.values(entry.perQuestionScores).reduce(
      (acc: number, qs: any) => acc + qs.score,
      0
    );
    const totalDurationMs = Object.values(entry.perQuestionScores).reduce(
      (acc: number, qs: any) => acc + (qs.execTimeMs || 0),
      0
    );
    const penalty = entry.strikes * 50;
    return {
      ...entry,
      totalScore: Math.max(0, (questionScoreSum as number) - penalty),
      totalDurationMs,
    };
  });

  entries.sort((a, b) => {
    // 1. Total Score DESC (highest points first)
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    // 2. Lowest total question duration ASC (speed tie-breaker)
    if (a.totalDurationMs > 0 && b.totalDurationMs > 0 && a.totalDurationMs !== b.totalDurationMs) {
      return a.totalDurationMs - b.totalDurationMs;
    }
    // 3. Fallback: earliest submission timestamp
    return a.lastSubmissionTime - b.lastSubmissionTime;
  });

  return entries;
}
