export type Language = 'c' | 'python' | 'java';

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  explanation?: string;
}

export interface Question {
  id: string;
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
  participantId: string;
  participantName: string;
  participantRoll: string;
  questionId: string;
  questionTitle: string;
  language: Language;
  code: string;
  submittedAt: number;
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

export interface ContestState {
  isActive: boolean;
  isPaused: boolean;
  startTime: number | null;
  durationMinutes: number; // e.g. 50
  endTime: number | null;
  title: string;
  announcement?: string;
  isRevealMode: boolean;
}

export interface Violation {
  id: string;
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
  questionsSolved: number; // count of 100% passed
  partialSolved: number;
  strikes: number;
  lastSubmissionTime: number;
  perQuestionScores: Record<string, {
    score: number;
    passedRatio: string;
    language: Language;
    submittedAt: number;
  }>;
}
