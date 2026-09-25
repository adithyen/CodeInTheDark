export type Language = 'c' | 'python' | 'java';

export type ContestPhase = 'setup' | 'registration' | 'active' | 'paused' | 'ended' | 'reveal';

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  explanation?: string;
}

export interface Question {
  id: string;
  sessionId?: string;
  title: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  points: number;
  scenario: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  starterTemplates: {
    c: string;
    python: string;
    java: string;
  };
  testCases: TestCase[];
  order: number;
}

export interface Participant {
  id: string;
  sessionId?: string;
  name: string;
  rollNumber: string;
  terminalId: string;
  registeredAt: number;
  strikes: number;
  isLockedOut: boolean;
  activeLanguage?: Language;
  currentQuestionId?: string;
  lastActiveAt: number;
}

export interface Submission {
  id: string;
  sessionId?: string;
  participantId: string;
  participantName: string;
  participantRoll: string;
  questionId: string;
  questionTitle: string;
  language: Language;
  code: string;
  submittedAt: number;
  isAutoSubmit?: boolean;
  evaluationStatus: 'pending' | 'evaluating' | 'completed' | 'error';
  testCasesPassed: number;
  totalTestCases: number;
  score: number;
  speedBonus: number;
  execTimeMs?: number;
  statusMessage?: string;
  testCaseDetails?: {
    testCaseId: string;
    passed: boolean;
    actualOutput?: string;
    expectedOutput?: string;
    isHidden: boolean;
    error?: string;
  }[];
}

export interface ContestSession {
  id: string;
  label: string;
  scheduled_at?: string | null;
  notes?: string;

  phase: ContestPhase;

  // Registration window (epoch ms)
  registration_opens_at?: number | null;
  registration_duration_ms?: number;
  registration_ends_at?: number | null;
  auto_start_on_reg_close?: boolean;

  // Challenge window (epoch ms)
  challenge_duration_ms?: number;
  challenge_starts_at?: number | null;
  challenge_ends_at?: number | null;
  pause_started_at?: number | null;

  // Live state
  is_paused?: boolean;
  announcement?: string;
  is_reveal_mode?: boolean;
  max_participants?: number;
  allow_late_join?: boolean;

  created_at?: string;
  updated_at?: string;
}

// Legacy alias kept for backward compat in arena/leaderboard pages
export interface ContestState {
  isActive: boolean;
  isPaused: boolean;
  startTime: number | null;
  durationMinutes: number;
  endTime: number | null;
  title: string;
  announcement?: string;
  isRevealMode: boolean;
  // New session fields
  phase?: ContestPhase;
  sessionId?: string;
  registrationEndsAt?: number | null;
}

export interface Violation {
  id: string;
  sessionId?: string;
  participantId: string;
  participantName: string;
  type: 'fullscreen_exit' | 'tab_blur' | 'window_leave' | 'devtools_attempt' | 'clipboard_attempt' | 'keystroke_anomaly';
  timestamp: number;
  strikeCount: number;
  details?: string;
}

export interface LeaderboardEntry {
  participantId: string;
  name: string;
  rollNumber: string;
  terminalId: string;
  totalScore: number;
  questionsSolved: number;
  partialSolved: number;
  strikes: number;
  lastSubmissionTime: number;
  perQuestionScores: Record<string, {
    score: number;
    passedRatio: string;
    language: Language;
    submittedAt: number;
    isAutoSubmit?: boolean;
  }>;
}
