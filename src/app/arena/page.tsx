'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import MonacoBlindEditor from '@/components/MonacoBlindEditor';
import AntiCheatShield from '@/components/AntiCheatShield';
import CountdownTimer from '@/components/CountdownTimer';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { Question, Language, Participant, ContestState, ContestPhase } from '@/types';
import {
  Send, RotateCcw, ShieldAlert, Terminal, Wifi, WifiOff,
  PanelLeftClose, PanelLeftOpen, ZoomIn, ZoomOut, X,
  Loader2, Lock, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Bookmark, BookmarkCheck, CheckCircle2, AlertCircle, Eye, FileWarning,
  ArrowRight, Clock, Code2, Cloud, Check, AlertTriangle, RefreshCw
} from 'lucide-react';

// ─── 5 Standard Exam Question Statuses ─────────────────────────────────────────
export type QStatus =
  | 'not_visited'       // Question never opened
  | 'unanswered'        // Visited, but no meaningful code written
  | 'answered'          // Meaningful code written
  | 'marked_review'     // Visited, no code, but marked for review
  | 'answered_marked';  // Code written AND marked for review

// ─── Sealed Lobby Result Per Question ─────────────────────────────────────────
interface LobbyResult {
  questionId: string;
  questionTitle: string;
  language: Language;
  submittedAt: number;
  elapsedMs: number;
  testCasesPassed: number;
  totalTestCases: number;
  score: number;
  speedBonus: number;
  lines: number;
  chars: number;
  isAutoSubmit: boolean;
}

export default function ArenaPage() {
  const router = useRouter();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [contest, setContest] = useState<ContestState | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Per-question code + language
  const [allCodes, setAllCodes] = useState<Record<string, string>>({});
  const [allLanguages, setAllLanguages] = useState<Record<string, Language>>({});

  // Question navigation and status tracking
  const [visitedSet, setVisitedSet] = useState<Set<string>>(new Set());
  const [markedSet, setMarkedSet] = useState<Set<string>>(new Set());

  // Cloud Auto-Save Sync State
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'saved' | 'saving' | 'offline' | 'idle'>('saved');
  const [lastSavedTimeStr, setLastSavedTimeStr] = useState<string>('All changes saved');

  // Submission & Confirmation UI State
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [expandedPreviewQId, setExpandedPreviewQId] = useState<string | null>(null);
  const [showLobby, setShowLobby] = useState(false);
  const [lobbyResults, setLobbyResults] = useState<LobbyResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isContestOver, setIsContestOver] = useState(false);
  const [autoSubmitBanner, setAutoSubmitBanner] = useState(false);

  // Remaining time warning tracking
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // Network & UI preferences
  const [isOnline, setIsOnline] = useState(true);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState(15);
  const [lobbyMessage, setLobbyMessage] = useState('Awaiting contest conclusion...');

  const contestStartRef = useRef<number | null>(null);
  const autoSubmitDoneRef = useRef(false);
  const lastSavedCodesRef = useRef<Record<string, string>>({});
  const hasUnsavedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeQuestion = questions[activeQuestionIndex];
  const activeQId = activeQuestion?.id ?? '';
  const currentCode = allCodes[activeQId] ?? '';
  const currentLanguage = allLanguages[activeQId] ?? 'python';

  // ── Per-Question Stopwatch & Sealing State ──────────────────────────────────
  const [firstVisitedAt, setFirstVisitedAt] = useState<Record<string, number>>({});
  const [questionDurations, setQuestionDurations] = useState<Record<string, number>>({});
  const [questionSealed, setQuestionSealed] = useState<Record<string, boolean>>({});
  const [lastSealedCodes, setLastSealedCodes] = useState<Record<string, string>>({});
  const [currentQElapsedMs, setCurrentQElapsedMs] = useState(0);

  // Re-save warning confirmation modal state
  const [showResaveModal, setShowResaveModal] = useState(false);
  const [pendingResaveInfo, setPendingResaveInfo] = useState<{
    qId: string;
    qTitle: string;
    oldDurationMs: number;
    newDurationMs: number;
  } | null>(null);

  const fmtDuration = (ms: number): string => {
    if (!ms || ms <= 0) return '0s';
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  // ── 5-State Status Helper ───────────────────────────────────────────────────
  const getQStatus = useCallback((qId: string, qs: Question[]): QStatus => {
    const q = qs.find(x => x.id === qId);
    if (!visitedSet.has(qId)) return 'not_visited';
    const code = (allCodes[qId] ?? '').trim();
    const lang = allLanguages[qId] ?? 'python';
    const starter = (q?.starterTemplates?.[lang] ?? '').trim();
    const hasMeaningfulCode = code.length > 0 && code !== starter;
    const isMarked = markedSet.has(qId);

    if (isMarked && hasMeaningfulCode) return 'answered_marked';
    if (isMarked) return 'marked_review';
    if (hasMeaningfulCode) return 'answered';
    return 'unanswered';
  }, [visitedSet, markedSet, allCodes, allLanguages]);

  // Status configuration styling
  const statusConfig: Record<QStatus, { label: string; dotClass: string; borderClass: string; bgClass: string; textClass: string }> = {
    not_visited:     { label: 'Not Visited',        dotClass: 'bg-[#4a3f35]',   borderClass: 'border-[#4a3f35]/50',   bgClass: 'bg-[#1c160e]/50', textClass: 'text-[#8c7456]' },
    unanswered:      { label: 'Not Answered',       dotClass: 'bg-orange-500',  borderClass: 'border-orange-500/60',  bgClass: 'bg-orange-500/10', textClass: 'text-orange-400' },
    answered:        { label: 'Answered',           dotClass: 'bg-emerald-500', borderClass: 'border-emerald-500/60', bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-400' },
    marked_review:   { label: 'Marked Review',      dotClass: 'bg-amber-400',   borderClass: 'border-amber-400/60',   bgClass: 'bg-amber-400/10', textClass: 'text-amber-400' },
    answered_marked: { label: 'Answered + Review',  dotClass: 'bg-teal-400',    borderClass: 'border-teal-400/60',    bgClass: 'bg-teal-400/10', textClass: 'text-teal-300' },
  };

  // ── Anti-Cheat Integration ──────────────────────────────────────────────────
  const { isFullscreen, strikes, isLockedOut, warningModalOpen, warningMessage, hudWarning, requestFullscreen } =
    useAntiCheat({
      participantId: participant?.id || '',
      participantName: participant?.name || 'Participant',
      rollNumber: participant?.rollNumber || 'UNKNOWN',
      terminalId: participant?.terminalId || 'NODE-1',
      initialStrikes: participant?.strikes || 0,
      initialLockedOut: participant?.isLockedOut || false,
      enabled: !!participant && !showLobby && !isSubmitted,
      onStrikeUpdate: (s, l) => setParticipant(p => p ? { ...p, strikes: s, isLockedOut: l } : null),
    });

  // ── Network Status ──────────────────────────────────────────────────────────
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => { setIsOnline(true); setCloudSyncStatus('saved'); };
    const off = () => { setIsOnline(false); setCloudSyncStatus('offline'); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // ── Load Participant Session ────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('cid_participant');
    if (!saved) { router.push('/register'); return; }
    try {
      const parsed = JSON.parse(saved);
      setParticipant(parsed);
      if (parsed.sessionId) setSessionId(parsed.sessionId);

      // Check if participant already completed submission earlier
      const alreadySub = localStorage.getItem(`cid_submitted_${parsed.id}`);
      if (alreadySub === 'true') {
        setIsSubmitted(true);
        setShowLobby(true);
      }
    } catch { router.push('/register'); }
  }, [router]);

  // ── Restore Drafts from LocalStorage & Cloud Backend ────────────────────────
  useEffect(() => {
    if (!participant || questions.length === 0) return;

    // 1. Initial quick restore from localStorage (instant, no flicker)
    const localCodes: Record<string, string> = {};
    const localLangs: Record<string, Language> = {};

    questions.forEach(q => {
      let found = false;
      (['python', 'c', 'java'] as Language[]).forEach(lang => {
        const d = localStorage.getItem(`cid_draft_${participant.id}_${q.id}_${lang}`);
        if (d && !found) {
          localCodes[q.id] = d;
          localLangs[q.id] = lang;
          found = true;
        }
      });
      if (!found) {
        localCodes[q.id] = q.starterTemplates['python'] || '';
        localLangs[q.id] = 'python';
      }
    });

    setAllCodes(prev => ({ ...localCodes, ...prev }));
    setAllLanguages(prev => ({ ...localLangs, ...prev }));

    // 2. Fetch server-side saved drafts / check if already submitted on server
    const restoreFromCloud = async () => {
      try {
        const res = await fetch(`/api/submit?participantId=${participant.id}&sessionId=${sessionId || ''}`);
        if (res.ok) {
          const data = await res.json();
          if (data.isSubmitted) {
            setIsSubmitted(true);
            setShowLobby(true);
            localStorage.setItem(`cid_submitted_${participant.id}`, 'true');
            if (data.submissions && data.submissions.length > 0) {
              const restoredResults: LobbyResult[] = data.submissions
                .filter((s: any) => s.evaluationStatus === 'completed')
                .map((s: any) => ({
                  questionId: s.questionId,
                  questionTitle: s.questionTitle,
                  language: s.language,
                  submittedAt: s.submittedAt,
                  elapsedMs: 0,
                  testCasesPassed: s.testCasesPassed || 0,
                  totalTestCases: s.totalTestCases || 0,
                  score: s.score || 0,
                  speedBonus: s.speedBonus || 0,
                  lines: (s.code || '').split('\n').length,
                  chars: (s.code || '').length,
                  isAutoSubmit: s.isAutoSubmit || false,
                }));
              setLobbyResults(restoredResults);
            }
            return;
          }

          // Restore cloud drafts if available
          if (data.submissions && Array.isArray(data.submissions)) {
            const cloudCodes: Record<string, string> = {};
            const cloudLangs: Record<string, Language> = {};
            data.submissions.forEach((sub: any) => {
              if (sub.code) {
                cloudCodes[sub.questionId] = sub.code;
                cloudLangs[sub.questionId] = sub.language;
                // Also update localStorage
                localStorage.setItem(`cid_draft_${participant.id}_${sub.questionId}_${sub.language}`, sub.code);
              }
            });
            if (Object.keys(cloudCodes).length > 0) {
              setAllCodes(prev => ({ ...prev, ...cloudCodes }));
              setAllLanguages(prev => ({ ...prev, ...cloudLangs }));
            }
          }
        }
      } catch (err) {
        console.error('Failed to sync cloud drafts:', err);
      }
    };

    restoreFromCloud();
  }, [participant?.id, questions.length, sessionId]);

  // ── Restore Stopwatch & Sealed States from LocalStorage ─────────────────────
  useEffect(() => {
    if (!participant || questions.length === 0) return;

    const restoredDurations: Record<string, number> = {};
    const restoredSealed: Record<string, boolean> = {};
    const restoredFirstVisit: Record<string, number> = {};
    const restoredCodes: Record<string, string> = {};

    questions.forEach(q => {
      const d = localStorage.getItem(`cid_q_duration_${participant.id}_${q.id}`);
      if (d) restoredDurations[q.id] = Number(d);

      const s = localStorage.getItem(`cid_q_sealed_${participant.id}_${q.id}`);
      if (s === 'true') restoredSealed[q.id] = true;

      const v = localStorage.getItem(`cid_first_visit_${participant.id}_${q.id}`);
      if (v) restoredFirstVisit[q.id] = Number(v);

      const c = localStorage.getItem(`cid_q_code_${participant.id}_${q.id}`);
      if (c !== null) restoredCodes[q.id] = c;
    });

    if (Object.keys(restoredDurations).length > 0) setQuestionDurations(restoredDurations);
    if (Object.keys(restoredSealed).length > 0) setQuestionSealed(restoredSealed);
    if (Object.keys(restoredFirstVisit).length > 0) setFirstVisitedAt(restoredFirstVisit);
    if (Object.keys(restoredCodes).length > 0) setLastSealedCodes(restoredCodes);
  }, [participant?.id, questions.length]);

  // ── Mark Active Question as Visited & Initialize Stopwatch ──────────────────
  useEffect(() => {
    if (!activeQId || !participant) return;

    setVisitedSet(prev => {
      if (prev.has(activeQId)) return prev;
      const n = new Set(prev);
      n.add(activeQId);
      return n;
    });

    setFirstVisitedAt(prev => {
      if (prev[activeQId]) return prev;
      const contestStart = contestStartRef.current || contest?.startTime || Date.now();
      // For Q1 at contest start, stopwatch starts with contest; for subsequent questions, stopwatch starts on first visit
      const visitTime = activeQuestionIndex === 0 ? contestStart : Date.now();
      localStorage.setItem(`cid_first_visit_${participant.id}_${activeQId}`, String(visitTime));
      return { ...prev, [activeQId]: visitTime };
    });
  }, [activeQId, participant, contest?.startTime, activeQuestionIndex]);

  // ── Live Stopwatch Ticker for Currently Active Question ─────────────────────
  useEffect(() => {
    if (!activeQId || !participant || isSubmitted) return;

    const tick = () => {
      const contestStart = contestStartRef.current || contest?.startTime || Date.now();
      const firstVisit = firstVisitedAt[activeQId] || contestStart;
      const isSealed = Boolean(questionSealed[activeQId]);

      if (isSealed) {
        const lastSaved = lastSealedCodes[activeQId] ?? '';
        const isModified = (allCodes[activeQId] ?? '').trim() !== lastSaved.trim();
        if (isModified) {
          // If code was modified after sealing, live timer shows total contest elapsed time
          setCurrentQElapsedMs(Math.max(1000, Date.now() - contestStart));
        } else {
          setCurrentQElapsedMs(questionDurations[activeQId] || 0);
        }
      } else {
        // Not sealed: stopwatch starts from when this question was first opened
        setCurrentQElapsedMs(Math.max(0, Date.now() - firstVisit));
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeQId, participant, isSubmitted, firstVisitedAt, questionSealed, questionDurations, lastSealedCodes, allCodes, contest?.startTime]);

  // ── Fetch Contest & Auto-Transition Status ──────────────────────────────────
  const fetchContest = useCallback(async () => {
    if (!participant) return;
    try {
      const sid = sessionId ? `?sessionId=${sessionId}` : '';
      const [cRes, qRes] = await Promise.all([
        fetch(`/api/contest${sid}`),
        fetch(`/api/questions${sid}`),
      ]);
      if (cRes.ok) {
        const cData = await cRes.json();
        const cState: ContestState = cData.contest;
        setContest(cState);
        if (cState?.startTime && !contestStartRef.current) contestStartRef.current = cState.startTime;
        const phase: ContestPhase = cData.session?.phase;

        // Check if contest is over
        if (cState?.endTime && Date.now() >= cState.endTime) {
          setIsContestOver(true);
        }
        if (phase === 'ended' || phase === 'reveal') {
          setIsContestOver(true);
        }

        // Auto-redirect to leaderboard when Admiralty triggers Stage Reveal
        if ((phase === 'reveal' || cState?.isRevealMode) && isSubmitted) {
          router.push('/leaderboard');
          return;
        }

        if (phase === 'setup' || phase === 'registration') {
          router.push('/register');
        }
      }
      if (qRes.ok) {
        const qData = await qRes.json();
        const qs: Question[] = qData.questions || [];
        setQuestions(qs);
      }
    } catch (err) { console.error('Arena fetch error:', err); }
  }, [sessionId, participant, router, isSubmitted]);

  useEffect(() => {
    fetchContest();
    const interval = setInterval(fetchContest, 4000);
    return () => clearInterval(interval);
  }, [fetchContest]);

  // ── Real-Time Cloud Auto-Save (Every 3 seconds or Debounced) ────────────────
  const saveDraftToCloud = useCallback(async (qIdToSave?: string, codeToSave?: string, langToSave?: Language) => {
    if (!participant || isSubmitted) return;

    const targetQId = qIdToSave || activeQId;
    const targetCode = codeToSave !== undefined ? codeToSave : (allCodes[targetQId] ?? '');
    const targetLang = langToSave || (allLanguages[targetQId] ?? 'python');

    if (!targetQId) return;

    // 1. Instant local persistence
    localStorage.setItem(`cid_draft_${participant.id}_${targetQId}_${targetLang}`, targetCode);
    lastSavedCodesRef.current[targetQId] = targetCode;

    if (!navigator.onLine) {
      setCloudSyncStatus('offline');
      setLastSavedTimeStr('Saved locally (Offline)');
      return;
    }

    setCloudSyncStatus('saving');

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participant.id,
          questionId: targetQId,
          language: targetLang,
          code: targetCode,
          isDraft: true,
          sessionId,
        }),
      });

      if (res.ok) {
        hasUnsavedRef.current = false;
        setCloudSyncStatus('saved');
        const now = new Date();
        setLastSavedTimeStr(`Cloud synced ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
      } else {
        setCloudSyncStatus('saved');
      }
    } catch {
      setCloudSyncStatus('offline');
      setLastSavedTimeStr('Saved locally');
    }
  }, [participant, isSubmitted, activeQId, allCodes, allLanguages, sessionId]);

  // Periodic 3-second auto-save effect
  useEffect(() => {
    if (!participant || isSubmitted) return;
    const interval = setInterval(() => {
      if (hasUnsavedRef.current) {
        saveDraftToCloud();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [participant, isSubmitted, saveDraftToCloud]);

  // Code change handler with debounced cloud save
  const handleCodeChange = (newCode: string) => {
    setAllCodes(prev => ({ ...prev, [activeQId]: newCode }));
    hasUnsavedRef.current = true;
    setCloudSyncStatus('saving');

    // Immediate local save
    if (participant && activeQId) {
      localStorage.setItem(`cid_draft_${participant.id}_${activeQId}_${currentLanguage}`, newCode);
    }

    // Debounce cloud auto-save by 2 seconds of inactivity
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveDraftToCloud(activeQId, newCode, currentLanguage);
    }, 2000);
  };

  // Language change handler
  const handleLanguageChange = (lang: Language) => {
    // Save current language draft before switching
    if (participant && activeQId) {
      saveDraftToCloud(activeQId, currentCode, currentLanguage);
    }

    setAllLanguages(prev => ({ ...prev, [activeQId]: lang }));

    // Load saved draft for the new language, or starter template
    if (participant && activeQId) {
      const saved = localStorage.getItem(`cid_draft_${participant.id}_${activeQId}_${lang}`);
      const starter = activeQuestion?.starterTemplates?.[lang] || '';
      const codeForNewLang = saved !== null ? saved : starter;
      setAllCodes(prev => ({ ...prev, [activeQId]: codeForNewLang }));
    }
  };

  // ── Save Question with Recorded Stopwatch Duration ──────────────────────────
  const saveQuestionWithDuration = useCallback((qId: string, isResave: boolean) => {
    if (!participant || !qId) return;
    const contestStart = contestStartRef.current || contest?.startTime || Date.now();
    let durationMs: number;

    if (isResave) {
      // Re-saving modified question: Duration updates to total contest elapsed time (45s + 95s + review/edit time)
      durationMs = Math.max(1000, Date.now() - contestStart);
    } else {
      // First save of this question: Stopwatch duration from when question was first visited
      const firstVisit = firstVisitedAt[qId] || contestStart;
      durationMs = Math.max(1000, Date.now() - firstVisit);
    }

    const codeToSave = allCodes[qId] ?? '';
    const langToSave = allLanguages[qId] ?? 'python';

    // 1. Force immediate cloud save
    saveDraftToCloud(qId, codeToSave, langToSave);

    // 2. Persist sealed duration & code snapshot
    setQuestionDurations(prev => {
      const next = { ...prev, [qId]: durationMs };
      localStorage.setItem(`cid_q_duration_${participant.id}_${qId}`, String(durationMs));
      return next;
    });

    setQuestionSealed(prev => {
      const next = { ...prev, [qId]: true };
      localStorage.setItem(`cid_q_sealed_${participant.id}_${qId}`, 'true');
      return next;
    });

    setLastSealedCodes(prev => {
      const next = { ...prev, [qId]: codeToSave };
      localStorage.setItem(`cid_q_code_${participant.id}_${qId}`, codeToSave);
      return next;
    });

    // 3. Navigate to next question or open preview if last
    if (activeQuestionIndex < questions.length - 1) {
      setActiveQuestionIndex(activeQuestionIndex + 1);
    } else {
      setShowPreviewModal(true);
    }
  }, [participant, contest?.startTime, firstVisitedAt, allCodes, allLanguages, saveDraftToCloud, activeQuestionIndex, questions.length]);

  // Save & Next Button
  const handleSaveAndNext = () => {
    if (!participant || !activeQId) return;

    const isAlreadySealed = Boolean(questionSealed[activeQId]);
    const prevSavedCode = lastSealedCodes[activeQId] ?? '';
    const codeChanged = currentCode.trim() !== prevSavedCode.trim();

    // Case 1: Already sealed, and code was NOT modified:
    if (isAlreadySealed && !codeChanged) {
      if (activeQuestionIndex < questions.length - 1) {
        setActiveQuestionIndex(activeQuestionIndex + 1);
      } else {
        setShowPreviewModal(true);
      }
      return;
    }

    // Case 2: Already sealed, and code WAS modified -> Prompt warning modal!
    if (isAlreadySealed && codeChanged) {
      const contestStart = contestStartRef.current || contest?.startTime || Date.now();
      const newDurationMs = Math.max(1000, Date.now() - contestStart);
      const oldDurationMs = questionDurations[activeQId] || 0;

      setPendingResaveInfo({
        qId: activeQId,
        qTitle: activeQuestion?.title || `Question ${activeQuestionIndex + 1}`,
        oldDurationMs,
        newDurationMs,
      });
      setShowResaveModal(true);
      return;
    }

    // Case 3: First time saving this question:
    saveQuestionWithDuration(activeQId, false);
  };

  // Confirm Resave Handler (Modal)
  const confirmResave = () => {
    if (!pendingResaveInfo) return;
    saveQuestionWithDuration(pendingResaveInfo.qId, true);
    setShowResaveModal(false);
    setPendingResaveInfo(null);
  };

  // Mark for Review & Next Button
  const handleMarkForReviewAndNext = () => {
    setMarkedSet(prev => {
      const n = new Set(prev);
      if (n.has(activeQId)) n.delete(activeQId);
      else n.add(activeQId);
      return n;
    });

    if (activeQuestionIndex < questions.length - 1) {
      setActiveQuestionIndex(activeQuestionIndex + 1);
    }
  };

  // Mark for Review toggle (toolbar)
  const handleToggleMarkReview = () => {
    setMarkedSet(prev => {
      const n = new Set(prev);
      if (n.has(activeQId)) n.delete(activeQId);
      else n.add(activeQId);
      return n;
    });
  };

  // Clear Code / Reset to Starter
  const handleResetStarter = () => {
    const starter = activeQuestion?.starterTemplates?.[currentLanguage] || '';
    setAllCodes(prev => ({ ...prev, [activeQId]: starter }));
    hasUnsavedRef.current = true;
    saveDraftToCloud(activeQId, starter, currentLanguage);
  };

  // ── Global Final Submission Execution ───────────────────────────────────────
  const executeGlobalSubmit = useCallback(async (autoSubmit: boolean) => {
    if (!participant || isSubmitted || submitting) return;
    setSubmitting(true);
    setShowPreviewModal(false);

    if (autoSubmit) {
      setAutoSubmitBanner(true);
    }

    const now = Date.now();
    const contestStart = contestStartRef.current || contest?.startTime || now;

    // Prepare global payload with all questions including recorded question elapsed durations
    const submissionsPayload = questions.map((q) => {
      const code = allCodes[q.id] ?? q.starterTemplates['python'] ?? '';
      const lang = allLanguages[q.id] ?? 'python';
      const elapsed = questionDurations[q.id] || (firstVisitedAt[q.id] ? now - firstVisitedAt[q.id] : now - contestStart);

      return {
        questionId: q.id,
        language: lang,
        code,
        elapsedMs: elapsed,
        isSealed: Boolean(questionSealed[q.id]),
      };
    });

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participant.id,
          sessionId,
          submissions: submissionsPayload,
          isAutoSubmit: autoSubmit,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const results: LobbyResult[] = (data.results || []).map((r: any) => ({
          questionId: r.questionId,
          questionTitle: r.questionTitle,
          language: r.language,
          submittedAt: r.submittedAt || now,
          elapsedMs: r.elapsedMs || questionDurations[r.questionId] || (contestStartRef.current ? (r.submittedAt || now) - contestStartRef.current : 0),
          testCasesPassed: r.testCasesPassed ?? 0,
          totalTestCases: r.totalTestCases ?? 0,
          score: r.baseScore ?? r.score ?? 0,
          speedBonus: r.speedBonus ?? 0,
          lines: r.lines || 0,
          chars: r.chars || 0,
          isAutoSubmit: autoSubmit,
        }));

        setLobbyResults(results);
        setIsSubmitted(true);
        localStorage.setItem(`cid_submitted_${participant.id}`, 'true');
        setLobbyMessage(autoSubmit
          ? 'Contest duration expired — all question responses have been auto-submitted and locked for evaluation.'
          : 'All answers sealed and submitted. Output remains sealed until Admiralty Stage Reveal.');
        setShowLobby(true);
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.isSubmitted) {
          setIsSubmitted(true);
          setShowLobby(true);
          localStorage.setItem(`cid_submitted_${participant.id}`, 'true');
        } else {
          alert(`Submission Notice: ${errData.error || 'Failed to submit'}`);
        }
      }
    } catch (err: any) {
      console.error('Global submit error:', err);
    } finally {
      setSubmitting(false);
      setAutoSubmitBanner(false);
    }
  }, [participant, isSubmitted, submitting, questions, allCodes, allLanguages, sessionId, questionDurations, firstVisitedAt, questionSealed, contest?.startTime]);

  // ── Timer Expiry Auto-Submit ────────────────────────────────────────────────
  const handleTimerExpired = useCallback(() => {
    setIsContestOver(true);
    if (!autoSubmitDoneRef.current && !isSubmitted) {
      autoSubmitDoneRef.current = true;
      executeGlobalSubmit(true);
    }
  }, [isSubmitted, executeGlobalSubmit]);

  // ── Keyboard Shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!isFullscreen || isLockedOut || showLobby || isSubmitted) return;

      // Ctrl + S: Force Immediate Cloud Save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveDraftToCloud();
      }

      // Ctrl + Enter: Open Global Submit Preview Confirmation Modal
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!submitting && !isContestOver) {
          setShowPreviewModal(true);
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [submitting, isContestOver, isFullscreen, isLockedOut, showLobby, isSubmitted, saveDraftToCloud]);

  // ── Track remaining time for warnings ───────────────────────────────────────
  useEffect(() => {
    if (!contest?.endTime || isContestOver || isSubmitted) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((contest.endTime! - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining === 0) {
        setIsContestOver(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [contest?.endTime, isContestOver, isSubmitted]);

  // ── Preview Data Calculation ────────────────────────────────────────────────
  const previewData = useMemo(() => {
    return questions.map(q => {
      const status = getQStatus(q.id, questions);
      const code = allCodes[q.id] ?? '';
      const lang = allLanguages[q.id] ?? 'python';
      const starter = q.starterTemplates?.[lang] ?? '';
      const hasMeaningfulCode = code.trim().length > 0 && code.trim() !== starter.trim();
      const lines = code.split('\n').length;
      const chars = code.length;
      return { q, status, code, lang, lines, chars, hasMeaningfulCode };
    });
  }, [questions, getQStatus, allCodes, allLanguages]);

  const summaryAnswered = previewData.filter(d => d.status === 'answered' || d.status === 'answered_marked').length;
  const summaryMarked = previewData.filter(d => d.status === 'marked_review' || d.status === 'answered_marked').length;
  const summaryUnanswered = previewData.filter(d => d.status === 'unanswered').length;
  const summaryNotVisited = previewData.filter(d => d.status === 'not_visited').length;
  const totalVerifiedLines = previewData.reduce((sum, d) => sum + (d.hasMeaningfulCode ? d.lines : 0), 0);
  const totalVerifiedChars = previewData.reduce((sum, d) => sum + (d.hasMeaningfulCode ? d.chars : 0), 0);
  const hasIncompleteWarnings = summaryUnanswered + summaryNotVisited > 0;

  // ── NAVIGATOR'S LOUNGE (LOBBY SCREEN AFTER SUBMISSION) ───────────────────────
  if (showLobby || isSubmitted) {
    const grandScore = lobbyResults.reduce((s, l) => s + l.score + l.speedBonus, 0);
    const grandPassed = lobbyResults.reduce((s, l) => s + l.testCasesPassed, 0);
    const grandTests = lobbyResults.reduce((s, l) => s + l.totalTestCases, 0);

    return (
      <div className="relative flex flex-1 flex-col overflow-hidden bg-[#050504] items-center justify-center p-4 sm:p-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-[#d4af37]/5 rounded-full blur-[140px]" />
        </div>

        <div className="relative z-10 w-full max-w-3xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/40 bg-[#1c160e]/90 px-4 py-1.5 font-cinzel text-xs font-bold tracking-widest text-[#f3d38c] shadow-[0_0_20px_rgba(212,175,55,0.2)]">
              <Lock className="h-3.5 w-3.5 text-[#d4af37]" /> ALL RESPONSES SEALED &middot; LOCKED
            </div>
            <h1 className="font-cinzel text-3xl sm:text-4xl font-extrabold text-[#ebe4d5] tracking-tight">
              Navigator&apos;s <span className="text-[#d4af37]">Lounge</span>
            </h1>
            <p className="font-nautical-mono text-sm text-[#a68a56] max-w-lg mx-auto">
              {lobbyMessage}
            </p>
          </div>

          {/* Live countdown until contest officially ends */}
          {contest?.endTime && !isContestOver && (
            <div className="rounded-2xl border border-[#a68a56]/25 bg-[#090704]/80 p-5 text-center shadow-lg">
              <p className="font-cinzel text-xs text-[#a68a56] uppercase tracking-wider mb-2">Contest Concludes In</p>
              <CountdownTimer endTime={contest.endTime} isPaused={contest.isPaused} onExpire={handleTimerExpired} />
            </div>
          )}

          {/* Results Summary Card */}
          {lobbyResults.length > 0 && (
            <div className="rounded-2xl border border-[#a68a56]/30 bg-[#090704]/90 overflow-hidden shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-[#a68a56]/20 bg-[#140f0a] px-6 py-3.5">
                <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#d4af37]">
                  Sealed Evaluation Record
                </span>
                <span className="font-nautical-mono text-xs text-[#a68a56]">
                  {lobbyResults.length} / {questions.length} questions submitted
                </span>
              </div>

              <div className="divide-y divide-[#a68a56]/15 max-h-[45vh] overflow-y-auto">
                {lobbyResults.map((r, idx) => {
                  const pct = r.totalTestCases > 0 ? r.testCasesPassed / r.totalTestCases : 0;
                  const bar = pct === 1 ? 'bg-emerald-500' : pct > 0.5 ? 'bg-[#d4af37]' : 'bg-red-500/70';
                  const elapsed = r.elapsedMs > 0 ? `${Math.floor(r.elapsedMs / 60000)}m ${Math.floor((r.elapsedMs % 60000) / 1000)}s` : '—';

                  return (
                    <div key={r.questionId} className="px-6 py-4 space-y-2 hover:bg-[#1c160e]/30 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-nautical-mono text-xs font-bold text-[#a68a56]">Q{idx + 1}.</span>
                            <span className="font-cinzel text-sm font-bold text-[#ebe4d5]">{r.questionTitle}</span>
                            {r.isAutoSubmit && (
                              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-nautical-mono text-[10px] text-amber-300 border border-amber-500/30">
                                AUTO-SUBMIT
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 font-nautical-mono text-xs text-[#a68a56]">
                            <span className="uppercase text-[#f3d38c]">{r.language}</span>
                            <span>·</span><span>{r.lines} lines</span>
                            <span>·</span><span>{r.chars} chars</span>
                            <span>·</span><span>Time taken: {elapsed}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-nautical-mono text-xl font-extrabold text-[#d4af37]">
                            {r.score + r.speedBonus}
                            <span className="text-xs text-[#a68a56] ml-1">pts</span>
                          </div>
                          {r.speedBonus > 0 && (
                            <div className="text-[10px] text-[#f3d38c]">+{r.speedBonus} speed bonus</div>
                          )}
                        </div>
                      </div>

                      {/* Tests bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between font-nautical-mono text-[11px] text-[#a68a56]">
                          <span>{r.testCasesPassed}/{r.totalTestCases} test cases passed</span>
                          <span>{Math.round(pct * 100)}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#1c160e] overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${bar}`} style={{ width: `${pct * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grand Total Footer */}
              <div className="flex items-center justify-between border-t border-[#a68a56]/20 bg-[#140f0a] px-6 py-4">
                <span className="font-cinzel text-xs text-[#a68a56]">
                  Total Tests Passed: <strong className="text-[#ebe4d5]">{grandPassed}/{grandTests}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-cinzel text-xs text-[#a68a56] uppercase tracking-wider">Final Score:</span>
                  <span className="font-nautical-mono text-2xl font-extrabold text-[#f3d38c]">{grandScore} pts</span>
                </div>
              </div>
            </div>
          )}

          {/* Reveal Waiting Notification */}
          <div className="rounded-2xl border border-[#a68a56]/20 bg-[#090704]/70 p-5 text-center space-y-2 shadow-lg">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#d4af37]" />
              <span className="font-nautical-mono text-xs text-[#d4af37] font-semibold">
                Awaiting Admiralty Stage Reveal Ceremony
              </span>
            </div>
            <p className="font-nautical-mono text-xs text-[#8c7456]">
              All participants will be automatically transitioned to the Leaderboard when the stage reveal commences.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!participant || questions.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center bg-[#050504]">
        <div className="flex flex-col items-center gap-3 font-mono text-sm text-[#a68a56]">
          <Terminal className="h-8 w-8 animate-spin text-[#d4af37]" />
          <span>Synchronizing Arena Terminal Sanctuary...</span>
        </div>
      </div>
    );
  }

  const activeStatus = getQStatus(activeQId, questions);
  const isMarked = markedSet.has(activeQId);

  return (
    <div className="fixed inset-0 z-30 flex flex-col h-screen w-screen overflow-hidden bg-[#050504]">
      <AntiCheatShield
        participantName={participant.name}
        rollNumber={participant.college || participant.rollNumber || 'NAVIGATOR'}
        terminalId={participant.terminalId}
        strikes={strikes}
        isLockedOut={isLockedOut}
        isFullscreen={isFullscreen}
        warningModalOpen={warningModalOpen}
        warningMessage={warningMessage}
        hudWarning={hudWarning}
        onRequestFullscreen={requestFullscreen}
      />

      {/* ── Auto-Submit Imminent Overlay ────────────────────────────────────── */}
      {autoSubmitBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-500/50 bg-[#120707] p-8 text-center shadow-2xl">
            <Loader2 className="h-10 w-10 animate-spin text-red-400" />
            <h2 className="font-cinzel text-xl font-bold text-red-300">Contest Duration Expired</h2>
            <p className="font-nautical-mono text-xs text-[#a68a56] max-w-sm">
              Automatically collecting and submitting all your question responses to the Admiralty...
            </p>
          </div>
        </div>
      )}

      {/* ── Urgent Timer Countdown Warning Banners ──────────────────────────── */}
      {remainingSeconds !== null && remainingSeconds > 0 && remainingSeconds <= 60 && (
        <div className="shrink-0 flex items-center justify-center gap-2 border-b border-red-500/60 bg-red-950/80 px-4 py-1.5 text-center animate-pulse">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <span className="font-nautical-mono text-xs font-bold text-red-200">
            🚨 FINAL COUNTDOWN: Auto-submitting all answers in {remainingSeconds}s! All responses will be locked.
          </span>
        </div>
      )}
      {remainingSeconds !== null && remainingSeconds > 60 && remainingSeconds <= 120 && (
        <div className="shrink-0 flex items-center justify-center gap-2 border-b border-amber-500/40 bg-amber-950/60 px-4 py-1.5 text-center">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <span className="font-nautical-mono text-xs font-semibold text-amber-200">
            ⚠️ 2 Minutes Remaining: Global contest auto-submit will execute when timer expires.
          </span>
        </div>
      )}

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-wrap items-center justify-between border-b border-[#a68a56]/20 bg-[#090806]/95 px-4 py-2 sm:px-6 gap-2 select-none">
        {/* Left: Participant status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[#a68a56]/30 bg-[#1c160e]/80 px-2.5 py-1 font-nautical-mono text-xs text-[#f3d38c]">
            <span className="h-2 w-2 rounded-full bg-[#d4af37] animate-pulse" />
            <span>{participant.name}</span>
            {participant.college && (
              <>
                <span className="text-[#a68a56]">·</span>
                <span className="text-[#d4af37] max-w-[180px] truncate">{participant.college}</span>
              </>
            )}
            <span className="text-[#a68a56]">·</span>
            <span className="text-[#ebe4d5]/80">{participant.terminalId}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 font-nautical-mono text-xs text-[#a68a56]">
            <ShieldAlert className="h-3.5 w-3.5 text-[#d4af37]" />
            <span>Strikes: <strong className={strikes > 0 ? 'text-red-400' : 'text-[#f3d38c]'}>{strikes}/3</strong></span>
          </div>

          {/* Cloud Sync Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 font-nautical-mono text-xs">
            {cloudSyncStatus === 'saving' ? (
              <span className="flex items-center gap-1 text-[#f3d38c] text-[11px]">
                <RefreshCw className="h-3 w-3 animate-spin text-[#d4af37]" /> Saving to cloud...
              </span>
            ) : cloudSyncStatus === 'offline' ? (
              <span className="flex items-center gap-1 text-amber-400 text-[11px]">
                <WifiOff className="h-3 w-3" /> Offline (Local backup)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400/90 text-[11px]">
                <Cloud className="h-3 w-3 text-emerald-400" /> Cloud Synced
              </span>
            )}
          </div>
        </div>

        {/* Right: Controls & Global Submit Button */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center border border-[#a68a56]/20 rounded-lg bg-[#050504]/60 p-0.5">
            <button onClick={() => setEditorFontSize(p => Math.max(12, p - 1))} className="p-1 text-[#a68a56] hover:text-[#f3d38c]">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-1.5 text-[11px] text-[#ebe4d5] font-nautical-mono">{editorFontSize}px</span>
            <button onClick={() => setEditorFontSize(p => Math.min(20, p + 1))} className="p-1 text-[#a68a56] hover:text-[#f3d38c]">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          <CountdownTimer endTime={contest?.endTime || null} isPaused={contest?.isPaused} onExpire={handleTimerExpired} />

          {/* Global Submit Contest Button */}
          <button
            onClick={() => setShowPreviewModal(true)}
            disabled={submitting || isLockedOut || isContestOver || isSubmitted}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-4 py-1.5 font-cinzel text-xs font-bold tracking-wider text-[#050504] shadow-[0_0_20px_rgba(212,175,55,0.25)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 bouncy-btn"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span>SUBMIT CONTEST</span>
          </button>
        </div>
      </div>

      {/* ── Two-Panel Arena Layout ───────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden">

        {/* Left: Problem Statement & Question Palette */}
        {!isDrawerCollapsed && (
          <div className="w-full lg:w-[440px] xl:w-[480px] shrink-0 flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-[#a68a56]/20 bg-[#090806]/95 overflow-hidden">
            {/* Question Selector Tabs */}
            <div className="shrink-0 border-b border-[#a68a56]/20 bg-[#090806]">
              <div className="flex items-center gap-1.5 p-2 overflow-x-auto justify-between">
                <div className="flex gap-1.5 overflow-x-auto py-1">
                  {questions.map((q, idx) => {
                    const st = getQStatus(q.id, questions);
                    const cfg = statusConfig[st];
                    const isSel = idx === activeQuestionIndex;
                    const isQSealed = questionSealed[q.id];
                    const qDur = questionDurations[q.id];

                    return (
                      <button
                        key={q.id}
                        onClick={() => setActiveQuestionIndex(idx)}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-nautical-mono text-xs transition-all whitespace-nowrap bouncy-btn border ${
                          isSel
                            ? 'border-[#d4af37] bg-[#1c160e] text-[#f3d38c] font-bold shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                            : `${cfg.borderClass} ${cfg.bgClass} text-[#a68a56] hover:bg-[#1c160e]/50`
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
                        <span>Q{idx + 1}</span>
                        <span className="text-[10px] opacity-70">({q.points}p)</span>
                        {isQSealed && qDur && (
                          <span className="rounded bg-[#d4af37]/20 border border-[#d4af37]/40 px-1 py-0.2 text-[9px] font-bold text-[#f3d38c]">
                            🔒 {fmtDuration(qDur)}
                          </span>
                        )}
                        {markedSet.has(q.id) && (
                          <Bookmark className="h-3 w-3 text-amber-400 fill-amber-400/40" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setIsDrawerCollapsed(true)}
                  className="hidden lg:flex p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/5 shrink-0"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>

              {/* Status Legend Bar */}
              <div className="flex flex-wrap gap-2 px-3 pb-2 pt-1 border-t border-[#a68a56]/10">
                {Object.entries(statusConfig).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1 font-nautical-mono text-[10px] text-[#8c7456]">
                    <span className={`h-1.5 w-1.5 rounded-full ${v.dotClass}`} />
                    <span>{v.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Problem Details Scroll Area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded border border-[#d4af37]/30 bg-[#1c160e] px-2 py-0.5 font-cinzel text-[10px] font-semibold text-[#f3d38c]">
                    {activeQuestion.difficulty}
                  </span>
                  <span className="font-nautical-mono text-xs text-[#a68a56]">
                    {activeQuestion.category} · {activeQuestion.points} pts
                  </span>
                  <span className={`ml-auto rounded px-2 py-0.5 font-cinzel text-[10px] font-semibold border ${statusConfig[activeStatus].borderClass} ${statusConfig[activeStatus].textClass}`}>
                    {statusConfig[activeStatus].label}
                  </span>
                </div>
                <h2 className="mt-2 font-cinzel text-xl font-bold tracking-tight text-[#ebe4d5]">
                  {activeQuestion.title}
                </h2>
              </div>

              <div className="space-y-2">
                <h3 className="font-cinzel text-xs font-semibold uppercase tracking-wider text-[#d4af37]">Scenario Charter</h3>
                <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/60 p-4 font-sans text-sm leading-relaxed text-[#ebe4d5]/90 whitespace-pre-line">
                  {activeQuestion.scenario}
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/40 p-3">
                  <h4 className="font-cinzel text-xs font-semibold text-[#f3d38c]">Input Inscription</h4>
                  <p className="mt-1 font-nautical-mono text-xs text-[#ebe4d5]/80 whitespace-pre-line">{activeQuestion.inputFormat}</p>
                </div>
                <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/40 p-3">
                  <h4 className="font-cinzel text-xs font-semibold text-[#f3d38c]">Output Vessel</h4>
                  <p className="mt-1 font-nautical-mono text-xs text-[#ebe4d5]/80 whitespace-pre-line">{activeQuestion.outputFormat}</p>
                </div>
                <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/40 p-3">
                  <h4 className="font-cinzel text-xs font-semibold text-[#d4af37]">Constraints</h4>
                  <p className="mt-1 font-nautical-mono text-xs text-[#ebe4d5]/80 whitespace-pre-line">{activeQuestion.constraints}</p>
                </div>
              </div>

              {/* Public Trials */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-cinzel text-xs font-semibold uppercase tracking-wider text-[#d4af37]">Public Trials</h3>
                  <span className="font-nautical-mono text-[10px] text-[#a68a56]">Hidden test cases evaluated on submission</span>
                </div>
                {activeQuestion.testCases.filter(tc => !tc.isHidden).map((tc, idx) => (
                  <div key={tc.id} className="rounded-xl border border-[#a68a56]/25 bg-[#0e0b07] p-3 font-nautical-mono text-xs space-y-2 select-none">
                    <div className="text-[11px] font-cinzel font-bold text-[#f3d38c]">Trial {idx + 1}</div>
                    <div>
                      <span className="text-[#a68a56]">Input:</span>
                      <pre className="mt-0.5 rounded border border-[#a68a56]/15 bg-[#050504] p-2 text-[#f3d38c] overflow-x-auto">{tc.input}</pre>
                    </div>
                    <div>
                      <span className="text-[#a68a56]">Expected Output:</span>
                      <pre className="mt-0.5 rounded border border-[#a68a56]/15 bg-[#050504] p-2 text-[#d4af37] overflow-x-auto">{tc.expectedOutput}</pre>
                    </div>
                    {tc.explanation && <div className="text-[11px] text-[#a68a56] italic">Note: {tc.explanation}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Right: Monaco Blind Editor & Action Bar */}
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden bg-[#050504]">
          {/* Editor Toolbar */}
          <div className="shrink-0 flex flex-wrap items-center justify-between border-b border-[#a68a56]/20 bg-[#0c0906] px-4 py-2 gap-2">
            <div className="flex items-center gap-3">
              {isDrawerCollapsed && (
                <button
                  onClick={() => setIsDrawerCollapsed(false)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#a68a56]/30 bg-[#1c160e]/50 px-2.5 py-1 font-cinzel text-xs text-[#f3d38c] hover:border-[#d4af37]"
                >
                  <PanelLeftOpen className="h-4 w-4" /><span>Scroll</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <label className="font-cinzel text-xs text-[#a68a56]">Cipher:</label>
                <select
                  value={currentLanguage}
                  onChange={e => handleLanguageChange(e.target.value as Language)}
                  className="rounded-lg border border-[#a68a56]/30 bg-[#050504] px-3 py-1 font-nautical-mono text-xs font-semibold text-[#f3d38c] focus:border-[#d4af37] focus:outline-none"
                >
                  <option value="python">Python 3</option>
                  <option value="c">C (GCC 14)</option>
                  <option value="java">Java 17</option>
                </select>
              </div>

              {/* Live Question Stopwatch */}
              <div className="flex items-center gap-1.5 rounded-lg border border-[#a68a56]/30 bg-[#1c160e]/70 px-2.5 py-1 font-nautical-mono text-xs shadow-inner">
                <Clock className="h-3 w-3 text-[#d4af37]" />
                <span className="text-[#a68a56] hidden sm:inline">Q Stopwatch:</span>
                <span className="text-[#f3d38c] font-bold">{fmtDuration(currentQElapsedMs)}</span>
              </div>

              {/* Sealed Status Indicator Badge */}
              {questionSealed[activeQId] && (
                currentCode.trim() !== (lastSealedCodes[activeQId] ?? '').trim() ? (
                  <div className="hidden md:flex items-center gap-1 rounded border border-amber-500/40 bg-amber-950/40 px-2 py-0.5 font-nautical-mono text-[10px] text-amber-300 animate-pulse">
                    <AlertTriangle className="h-3 w-3 text-amber-400" />
                    <span>Modified (saving updates time)</span>
                  </div>
                ) : (
                  <div className="hidden md:flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-950/40 px-2 py-0.5 font-nautical-mono text-[10px] text-emerald-400">
                    <Check className="h-3 w-3" />
                    <span>Sealed ({fmtDuration(questionDurations[activeQId])})</span>
                  </div>
                )
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMarkReview}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-cinzel text-xs transition-all bouncy-btn ${
                  isMarked
                    ? 'border-amber-400/60 bg-amber-400/10 text-amber-400'
                    : 'border-[#a68a56]/30 bg-[#1c160e]/50 text-[#a68a56] hover:text-[#f3d38c]'
                }`}
              >
                {isMarked ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{isMarked ? 'Marked for Review' : 'Mark for Review'}</span>
              </button>

              <button
                onClick={handleResetStarter}
                className="flex items-center gap-1.5 rounded-lg border border-[#a68a56]/30 bg-[#1c160e]/50 px-2.5 py-1 font-nautical-mono text-xs text-[#a68a56] hover:text-[#f3d38c] hover:border-[#d4af37] transition-all bouncy-btn"
                title="Reset code to default starter template"
              >
                <RotateCcw className="h-3.5 w-3.5" /><span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>

          {/* Editor Area */}
          <div className="relative flex-1 min-h-0 p-2 bg-[#050504] overflow-hidden">
            {!isFullscreen && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#050504]/95 backdrop-blur-md select-none">
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                  <ShieldAlert className="h-8 w-8 animate-pulse text-[#d4af37]" />
                  <span className="font-cinzel font-bold text-sm tracking-wider text-[#d4af37]">FULLSCREEN REQUIRED</span>
                  <span className="font-nautical-mono text-xs text-[#a68a56] max-w-xs">
                    Editing is only permitted in the fullscreen exam sanctuary.
                  </span>
                </div>
              </div>
            )}

            <MonacoBlindEditor
              language={currentLanguage}
              value={currentCode}
              onChange={handleCodeChange}
              disabled={!isFullscreen || isLockedOut || isSubmitted}
              fontSize={editorFontSize}
            />
          </div>

          {/* ── Exam Bottom Action Bar: Code Stats + Navigation Controls ──────── */}
          <div className="shrink-0 z-20 flex flex-wrap items-center justify-between border-t border-[#a68a56]/30 bg-[#090806] px-4 py-2.5 gap-2 select-none shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
            {/* Left: Code Stats & Cloud Save Status */}
            <div className="flex items-center gap-3 font-nautical-mono text-[11px] text-[#a68a56]">
              <span className="flex items-center gap-1 text-[#ebe4d5]">
                <Code2 className="h-3 w-3 text-[#d4af37]" />
                {currentCode.split('\n').length} lines
              </span>
              <span>·</span>
              <span>{currentCode.length} chars</span>
              <span>·</span>
              <span className="hidden sm:inline text-[#8c7456]">{lastSavedTimeStr}</span>
              {questionSealed[activeQId] && questionDurations[activeQId] && (
                <>
                  <span>·</span>
                  <span className="text-emerald-400 font-bold hidden sm:inline">
                    Sealed: {fmtDuration(questionDurations[activeQId])}
                  </span>
                </>
              )}
            </div>

            {/* Right: Question Navigation & Save Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveQuestionIndex(Math.max(0, activeQuestionIndex - 1))}
                disabled={activeQuestionIndex === 0}
                className="flex items-center gap-1 rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 px-3.5 py-1.5 font-cinzel text-xs text-[#ebe4d5] hover:border-[#d4af37] disabled:opacity-30 disabled:pointer-events-none transition-all bouncy-btn"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>

              <button
                onClick={handleMarkForReviewAndNext}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/20 px-3.5 py-1.5 font-cinzel text-xs text-amber-300 hover:border-amber-400 hover:bg-amber-950/40 transition-all bouncy-btn"
              >
                <Bookmark className="h-3.5 w-3.5 text-amber-400" />
                <span>Mark &amp; Next</span>
              </button>

              <button
                onClick={handleSaveAndNext}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#d4af37] px-5 py-2 font-cinzel text-xs font-black text-[#050504] shadow-[0_0_20px_rgba(212,175,55,0.35)] hover:brightness-110 active:scale-95 transition-all bouncy-btn"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                <span>{activeQuestionIndex === questions.length - 1 ? 'SAVE & REVIEW' : 'SAVE & NEXT'}</span>
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </button>

              <button
                onClick={() => setActiveQuestionIndex(Math.min(questions.length - 1, activeQuestionIndex + 1))}
                disabled={activeQuestionIndex >= questions.length - 1}
                className="flex items-center gap-1 rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 px-3.5 py-1.5 font-cinzel text-xs text-[#ebe4d5] hover:border-[#d4af37] disabled:opacity-30 disabled:pointer-events-none transition-all bouncy-btn"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Submission Preview & Verification Modal ──────────────────────────── */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-[#d4af37]/50 bg-[#0c0906] shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#a68a56]/20 bg-[#140f0a] px-6 py-4">
              <div>
                <h2 className="font-cinzel text-lg font-extrabold text-[#f3d38c] tracking-wide flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#d4af37]" />
                  Contest Submission &amp; Sealing Preview
                </h2>
                <p className="mt-0.5 font-nautical-mono text-xs text-[#a68a56]">
                  Visual verification of all question responses received by the server before final locking
                </p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-[#a68a56] hover:text-[#ebe4d5] p-1 rounded-lg hover:bg-white/5 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 5-Status Metrics Grid */}
            <div className="grid grid-cols-5 gap-px border-b border-[#a68a56]/20 bg-[#a68a56]/10 text-center">
              <div className="bg-[#090806] py-3 px-1">
                <span className="font-nautical-mono text-xl font-extrabold text-emerald-400">{summaryAnswered}</span>
                <p className="font-cinzel text-[10px] uppercase text-[#a68a56]">Answered</p>
              </div>
              <div className="bg-[#090806] py-3 px-1">
                <span className="font-nautical-mono text-xl font-extrabold text-teal-300">
                  {previewData.filter(d => d.status === 'answered_marked').length}
                </span>
                <p className="font-cinzel text-[10px] uppercase text-[#a68a56]">Ans + Review</p>
              </div>
              <div className="bg-[#090806] py-3 px-1">
                <span className="font-nautical-mono text-xl font-extrabold text-amber-400">
                  {previewData.filter(d => d.status === 'marked_review').length}
                </span>
                <p className="font-cinzel text-[10px] uppercase text-[#a68a56]">Review Only</p>
              </div>
              <div className="bg-[#090806] py-3 px-1">
                <span className="font-nautical-mono text-xl font-extrabold text-orange-400">{summaryUnanswered}</span>
                <p className="font-cinzel text-[10px] uppercase text-[#a68a56]">Unanswered</p>
              </div>
              <div className="bg-[#090806] py-3 px-1">
                <span className="font-nautical-mono text-xl font-extrabold text-[#6b5535]">{summaryNotVisited}</span>
                <p className="font-cinzel text-[10px] uppercase text-[#a68a56]">Not Visited</p>
              </div>
            </div>

            {/* Visual Confirmation Banner */}
            <div className="flex items-center justify-between border-b border-[#a68a56]/20 bg-[#1c160e]/50 px-6 py-2.5 font-nautical-mono text-xs">
              <span className="text-[#ebe4d5]">
                Verified: <strong className="text-[#f3d38c]">{totalVerifiedLines} lines of code</strong> ({totalVerifiedChars} chars) across {summaryAnswered} questions
              </span>
              <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                <Check className="h-3.5 w-3.5" /> Ready for evaluation
              </span>
            </div>

            {/* Question Breakdown List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#a68a56]/15 px-6 py-2 max-h-[42vh]">
              {previewData.map(({ q, status, lang, lines, chars, hasMeaningfulCode, code }, idx) => {
                const cfg = statusConfig[status];
                const isExpanded = expandedPreviewQId === q.id;

                return (
                  <div key={q.id} className="py-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-cinzel text-xs font-bold text-[#a68a56] w-6 shrink-0">Q{idx + 1}</span>
                        <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
                        <div className="min-w-0">
                          <div className="font-cinzel text-xs font-bold text-[#ebe4d5] truncate">{q.title}</div>
                          <div className="font-nautical-mono text-[10px] text-[#a68a56]">
                            <span className={cfg.textClass}>{cfg.label}</span> · {lang.toUpperCase()} · {q.points} pts
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {hasMeaningfulCode ? (
                          <div className="text-right">
                            <span className="font-nautical-mono text-xs font-bold text-[#f3d38c]">{lines} lines</span>
                            <span className="text-[10px] text-[#8c7456] block">{chars} chars</span>
                          </div>
                        ) : (
                          <span className="font-nautical-mono text-[11px] text-[#6b5535]">No code written</span>
                        )}

                        <button
                          onClick={() => setExpandedPreviewQId(isExpanded ? null : q.id)}
                          className="p-1 rounded text-[#a68a56] hover:text-[#f3d38c] hover:bg-white/5 transition-all text-xs flex items-center gap-1 font-nautical-mono"
                          title="Inspect submitted code"
                        >
                          <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Code Inspector */}
                    {isExpanded && (
                      <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504] p-3 text-xs font-nautical-mono overflow-hidden">
                        <div className="flex items-center justify-between text-[10px] text-[#8c7456] pb-1.5 border-b border-[#a68a56]/15 mb-2">
                          <span>Exact code buffer passed to test runner ({lang})</span>
                          <span>{lines} lines</span>
                        </div>
                        {code.trim().length > 0 ? (
                          <pre className="text-[#ebe4d5]/90 max-h-40 overflow-y-auto overflow-x-auto text-[11px] leading-relaxed">
                            {code}
                          </pre>
                        ) : (
                          <div className="text-orange-400 italic text-[11px]">
                            Empty buffer. This question will score 0 points.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Incomplete Warning */}
            {hasIncompleteWarnings && (
              <div className="flex items-center gap-2 border-t border-orange-500/30 bg-orange-500/10 px-6 py-2.5">
                <FileWarning className="h-4 w-4 text-orange-400 flex-shrink-0" />
                <p className="font-nautical-mono text-xs text-orange-200">
                  {summaryNotVisited > 0 && `${summaryNotVisited} unvisited question(s). `}
                  {summaryUnanswered > 0 && `${summaryUnanswered} unanswered question(s). `}
                  Unanswered questions receive 0 points.
                </p>
              </div>
            )}

            {/* Permanent Submission Warning & Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[#a68a56]/20 bg-[#140f0a] px-6 py-4 gap-3">
              <div className="font-nautical-mono text-xs text-[#a68a56]">
                <Clock className="inline h-3 w-3 mr-1 text-red-400" />
                <span>
                  Permanent Submission: <strong className="text-red-300">Responses cannot be modified</strong> after confirmation.
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  disabled={submitting}
                  className="rounded-xl border border-[#a68a56]/30 px-4 py-2 font-cinzel text-xs text-[#ebe4d5] hover:bg-[#1c160e] disabled:opacity-50 transition-all bouncy-btn"
                >
                  Back to Editor
                </button>

                <button
                  onClick={() => executeGlobalSubmit(false)}
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-5 py-2 font-cinzel text-xs font-bold text-[#050504] shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:brightness-110 active:scale-95 disabled:opacity-60 bouncy-btn"
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                  Confirm &amp; Final Submit All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Re-Save Confirmation Modal ────────────────────────────────────────── */}
      {showResaveModal && pendingResaveInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/60 bg-[#120c07] p-6 shadow-[0_0_50px_rgba(245,158,11,0.25)] space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="font-cinzel text-lg font-bold text-[#f3d38c]">Update Sealed Question?</h3>
            </div>
            <p className="font-sans text-xs text-[#ebe4d5]/90 leading-relaxed">
              You previously sealed <strong className="text-[#f3d38c]">{pendingResaveInfo.qTitle}</strong> with a duration of <strong className="text-emerald-400 font-nautical-mono">{fmtDuration(pendingResaveInfo.oldDurationMs)}</strong>.
            </p>
            <div className="rounded-xl border border-amber-500/30 bg-[#1c140a] p-3 text-xs font-nautical-mono text-[#f3d38c] space-y-2">
              <div className="flex justify-between items-center pb-1.5 border-b border-amber-500/20">
                <span className="text-[#a68a56]">Original Sealed Time:</span>
                <span className="text-emerald-400 font-bold">{fmtDuration(pendingResaveInfo.oldDurationMs)}</span>
              </div>
              <div className="flex justify-between items-center text-amber-300 font-bold">
                <span>New Evaluated Time (Contest Elapsed):</span>
                <span className="text-[#f3d38c] text-sm">{fmtDuration(pendingResaveInfo.newDurationMs)}</span>
              </div>
            </div>
            <p className="font-nautical-mono text-[11px] text-[#a68a56] leading-relaxed">
              Because you modified your solution, saving now will update your official recorded duration to the total elapsed contest time (<strong className="text-amber-300">{fmtDuration(pendingResaveInfo.newDurationMs)}</strong>), which will be used for scoring and tie-breaking.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowResaveModal(false);
                  setPendingResaveInfo(null);
                }}
                className="rounded-xl border border-[#a68a56]/30 px-4 py-2 font-cinzel text-xs text-[#ebe4d5] hover:bg-white/5 transition-all bouncy-btn"
              >
                Cancel
              </button>
              <button
                onClick={confirmResave}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#d4af37] px-4 py-2 font-cinzel text-xs font-bold text-[#050504] shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:brightness-110 active:scale-95 transition-all bouncy-btn"
              >
                <Check className="h-4 w-4" />
                Update &amp; Re-Seal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
