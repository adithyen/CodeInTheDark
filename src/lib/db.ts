import { supabase } from './supabase';
import { ContestSession, Question, Participant, Submission, Violation, Language } from '@/types';

// ─────────────────────────────────────────────────────────────────────
// SESSION HELPERS
// ─────────────────────────────────────────────────────────────────────

/**
 * Returns the currently active session: whichever is in
 * registration | active | paused. If none, returns the most recent setup session.
 */
export async function getActiveSession(): Promise<ContestSession | null> {
  // First try live phases
  const { data: live } = await supabase
    .from('contest_sessions')
    .select('*')
    .in('phase', ['registration', 'active', 'paused'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (live) return live as ContestSession;

  // Fallback: latest setup session
  const { data: setup } = await supabase
    .from('contest_sessions')
    .select('*')
    .eq('phase', 'setup')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return (setup as ContestSession) || null;
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
    .single();
  return data ? dbRowToParticipant(data) : null;
}

export async function getParticipantById(id: string): Promise<Participant | null> {
  const { data } = await supabase
    .from('participants')
    .select('*')
    .eq('id', id)
    .single();
  return data ? dbRowToParticipant(data) : null;
}

export async function upsertParticipant(sessionId: string, p: {
  name: string;
  rollNumber: string;
  terminalId?: string;
}): Promise<Participant> {
  const now = Date.now();
  const rollUpper = p.rollNumber.trim().toUpperCase();

  const existing = await getParticipantByRoll(sessionId, rollUpper);
  if (existing) {
    // Update last active
    await supabase
      .from('participants')
      .update({ last_active_at: now })
      .eq('id', existing.id);
    return { ...existing, lastActiveAt: now };
  }

  const terminalId = p.terminalId?.trim().toUpperCase() || `SEAT-${Math.floor(10 + Math.random() * 90)}`;

  const { data } = await supabase
    .from('participants')
    .insert({
      session_id: sessionId,
      name: p.name.trim(),
      roll_number: rollUpper,
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
    rollNumber: row.roll_number,
    terminalId: row.terminal_id,
    strikes: row.strikes,
    isLockedOut: row.is_locked_out,
    activeLanguage: row.active_language,
    currentQuestionId: row.current_question_id,
    registeredAt: row.registered_at,
    lastActiveAt: row.last_active_at,
  };
}

// ─────────────────────────────────────────────────────────────────────
// SUBMISSION HELPERS
// ─────────────────────────────────────────────────────────────────────

export async function getSubmissionsForSession(sessionId: string): Promise<Submission[]> {
  const { data } = await supabase
    .from('submissions')
    .select('*')
    .eq('session_id', sessionId)
    .order('submitted_at', { ascending: false });

  return (data || []).map(dbRowToSubmission);
}

export async function upsertSubmission(sub: Omit<Submission, 'id'> & { sessionId: string }): Promise<Submission> {
  // One submission per participant per question — upsert by participant + question
  const { data: existing } = await supabase
    .from('submissions')
    .select('id')
    .eq('participant_id', sub.participantId)
    .eq('question_id', sub.questionId)
    .single();

  const payload: any = {
    session_id: sub.sessionId,
    participant_id: sub.participantId,
    participant_name: sub.participantName,
    participant_roll: sub.participantRoll,
    question_id: sub.questionId,
    question_title: sub.questionTitle,
    language: sub.language,
    code: sub.code,
    submitted_at: sub.submittedAt,
    is_auto_submit: sub.isAutoSubmit ?? false,
    evaluation_status: sub.evaluationStatus,
    test_cases_passed: sub.testCasesPassed,
    total_test_cases: sub.totalTestCases,
    score: sub.score,
    speed_bonus: sub.speedBonus,
    exec_time_ms: sub.execTimeMs ?? null,
    status_message: sub.statusMessage ?? '',
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
    submittedAt: row.submitted_at,
    isAutoSubmit: row.is_auto_submit,
    evaluationStatus: row.evaluation_status,
    testCasesPassed: row.test_cases_passed,
    totalTestCases: row.total_test_cases,
    score: row.score,
    speedBonus: row.speed_bonus,
    execTimeMs: row.exec_time_ms,
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
      rollNumber: p.rollNumber,
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
    const entry = entriesMap.get(sub.participantId);
    if (!entry) continue;

    entry.perQuestionScores[sub.questionId] = {
      score: sub.score,
      passedRatio: `${sub.testCasesPassed}/${sub.totalTestCases}`,
      language: sub.language,
      submittedAt: sub.submittedAt,
      isAutoSubmit: sub.isAutoSubmit,
    };

    if (sub.testCasesPassed === sub.totalTestCases && sub.totalTestCases > 0) {
      entry.questionsSolved += 1;
    } else if (sub.testCasesPassed > 0) {
      entry.partialSolved += 1;
    }

    if (sub.submittedAt > entry.lastSubmissionTime) {
      entry.lastSubmissionTime = sub.submittedAt;
    }
  }

  const entries = Array.from(entriesMap.values()).map((entry) => {
    const questionScoreSum = Object.values(entry.perQuestionScores).reduce(
      (acc: number, qs: any) => acc + qs.score,
      0
    );
    const penalty = entry.strikes * 50;
    return { ...entry, totalScore: Math.max(0, (questionScoreSum as number) - penalty) };
  });

  entries.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a.lastSubmissionTime - b.lastSubmissionTime;
  });

  return entries;
}
