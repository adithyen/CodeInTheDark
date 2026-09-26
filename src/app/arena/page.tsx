'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MonacoBlindEditor from '@/components/MonacoBlindEditor';
import AntiCheatShield from '@/components/AntiCheatShield';
import CountdownTimer from '@/components/CountdownTimer';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { Question, Language, Participant, ContestState, ContestPhase } from '@/types';
import {
  Send, RotateCcw, ShieldAlert, Terminal, Wifi, WifiOff,
  PanelLeftClose, PanelLeftOpen, ZoomIn, ZoomOut, X,
  Loader2, Lock, ChevronRight, Bookmark, BookmarkCheck,
  CheckCircle2, AlertCircle, Eye, FileWarning, ArrowRight,
  Clock, Code2
} from 'lucide-react';

// ─── Question status types ────────────────────────────────────────────────────
type QStatus = 'not_visited' | 'unanswered' | 'answered' | 'marked_review' | 'answered_marked';

// ─── Lobby result per question ────────────────────────────────────────────────
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

  // Per-question code + language (all kept in memory + localStorage)
  const [allCodes, setAllCodes] = useState<Record<string, string>>({});
  const [allLanguages, setAllLanguages] = useState<Record<string, Language>>({});

  // Question status tracking
  const [visitedSet, setVisitedSet] = useState<Set<string>>(new Set());
  const [markedSet, setMarkedSet] = useState<Set<string>>(new Set());

  // UI state
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showLobby, setShowLobby] = useState(false);
  const [lobbyResults, setLobbyResults] = useState<LobbyResult[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isContestOver, setIsContestOver] = useState(false);
  const [savedStatus, setSavedStatus] = useState('All responses auto-saved');
  const [isOnline, setIsOnline] = useState(true);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState(15);
  const [lobbyMessage, setLobbyMessage] = useState('Awaiting contest conclusion...');

  const contestStartRef = useRef<number | null>(null);
  const autoSubmitDoneRef = useRef(false);
  const lastSavedCodesRef = useRef<Record<string, string>>({});
  const hasUnsavedRef = useRef(false);

  const activeQuestion = questions[activeQuestionIndex];
  const activeQId = activeQuestion?.id ?? '';
  const currentCode = allCodes[activeQId] ?? '';
  const currentLanguage = allLanguages[activeQId] ?? 'python';

  // ── Status helper ────────────────────────────────────────────────────────────
  const getQStatus = useCallback((qId: string, qs: Question[]): QStatus => {
    const q = qs.find(x => x.id === qId);
    if (!visitedSet.has(qId)) return 'not_visited';
    const code = allCodes[qId] ?? '';
    const lang = allLanguages[qId] ?? 'python';
    const starter = q?.starterTemplates?.[lang] ?? '';
    const hasCode = code.trim().length > 0 && code.trim() !== starter.trim();
    const marked = markedSet.has(qId);
    if (marked && hasCode) return 'answered_marked';
    if (marked) return 'marked_review';
    if (hasCode) return 'answered';
    return 'unanswered';
  }, [visitedSet, markedSet, allCodes, allLanguages]);

  // ── Anti-cheat ───────────────────────────────────────────────────────────────
  const { isFullscreen, strikes, isLockedOut, warningModalOpen, warningMessage, hudWarning, requestFullscreen } =
    useAntiCheat({
      participantId: participant?.id || '',
      participantName: participant?.name || 'Participant',
      rollNumber: participant?.rollNumber || 'UNKNOWN',
      terminalId: participant?.terminalId || 'NODE-1',
      initialStrikes: participant?.strikes || 0,
      initialLockedOut: participant?.isLockedOut || false,
      enabled: !!participant && !showLobby,
      onStrikeUpdate: (s, l) => setParticipant(p => p ? { ...p, strikes: s, isLockedOut: l } : null),
    });

  // ── Network ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // ── Load participant ─────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('cid_participant');
    if (!saved) { router.push('/register'); return; }
    try {
      const parsed = JSON.parse(saved);
      setParticipant(parsed);
      if (parsed.sessionId) setSessionId(parsed.sessionId);
    } catch { router.push('/register'); }
  }, [router]);

  // ── Restore drafts on participant + questions load ────────────────────────────
  useEffect(() => {
    if (!participant || questions.length === 0) return;
    const restored: Record<string, string> = {};
    const restoredLangs: Record<string, Language> = {};
    questions.forEach(q => {
      // Try all languages for saved drafts
      let found = false;
      (['python', 'c', 'java'] as Language[]).forEach(lang => {
        const d = localStorage.getItem(`cid_draft_${participant.id}_${q.id}_${lang}`);
        if (d && !found) {
          restored[q.id] = d;
          restoredLangs[q.id] = lang;
          found = true;
        }
      });
      if (!found) {
        restored[q.id] = q.starterTemplates['python'] || '';
        restoredLangs[q.id] = 'python';
      }
    });
    setAllCodes(prev => ({ ...restored, ...prev }));
    setAllLanguages(prev => ({ ...restoredLangs, ...prev }));
  }, [participant?.id, questions.length]);

  // ── Auto-save to localStorage every 3 seconds ─────────────────────────────────
  useEffect(() => {
    if (!participant) return;
    const interval = setInterval(() => {
      if (!hasUnsavedRef.current) return;
      questions.forEach(q => {
        const code = allCodes[q.id];
        const lang = allLanguages[q.id] ?? 'python';
        if (code !== undefined && code !== lastSavedCodesRef.current[q.id]) {
          localStorage.setItem(`cid_draft_${participant.id}_${q.id}_${lang}`, code);
          lastSavedCodesRef.current[q.id] = code;
        }
      });
      hasUnsavedRef.current = false;
      setSavedStatus(`Auto-saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
    }, 3000);
    return () => clearInterval(interval);
  }, [participant, questions, allCodes, allLanguages]);

  // ── Mark active question as visited ─────────────────────────────────────────
  useEffect(() => {
    if (!activeQId) return;
    setVisitedSet(prev => { if (prev.has(activeQId)) return prev; const n = new Set(prev); n.add(activeQId); return n; });
  }, [activeQId]);

  // ── Fetch contest + questions ─────────────────────────────────────────────────
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
        if (cState?.endTime && Date.now() >= cState.endTime) setIsContestOver(true);
        if (phase === 'ended' || phase === 'reveal') setIsContestOver(true);
        if ((phase === 'reveal' || cState?.isRevealMode) && isSubmitted) { router.push('/leaderboard'); return; }
        if (phase === 'setup' || phase === 'registration') { router.push('/register'); }
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
    const interval = setInterval(fetchContest, 5000);
    return () => clearInterval(interval);
  }, [fetchContest]);

  // ── Show lobby after contest ends ────────────────────────────────────────────
  useEffect(() => {
    if (isContestOver && !showLobby && !isSubmitted) {
      setLobbyMessage('Time is up. Your code has been auto-submitted. Awaiting stage reveal...');
      setShowLobby(true);
    }
  }, [isContestOver, showLobby, isSubmitted]);

  // ── Code change handler ───────────────────────────────────────────────────────
  const handleCodeChange = (newCode: string) => {
    setAllCodes(prev => ({ ...prev, [activeQId]: newCode }));
    hasUnsavedRef.current = true;
  };

  // ── Language change handler ───────────────────────────────────────────────────
  const handleLanguageChange = (lang: Language) => {
    setAllLanguages(prev => ({ ...prev, [activeQId]: lang }));
    // Load saved draft for the new language, or load starter template
    if (participant) {
      const saved = localStorage.getItem(`cid_draft_${participant.id}_${activeQId}_${lang}`);
      setAllCodes(prev => ({ ...prev, [activeQId]: saved || activeQuestion?.starterTemplates?.[lang] || '' }));
    }
  };

  // ── Save & Next ───────────────────────────────────────────────────────────────
  const handleSaveAndNext = () => {
    if (!participant) return;
    // Force immediate localStorage save for current question
    localStorage.setItem(`cid_draft_${participant.id}_${activeQId}_${currentLanguage}`, currentCode);
    lastSavedCodesRef.current[activeQId] = currentCode;
    hasUnsavedRef.current = false;
    setSavedStatus(`Q${activeQuestionIndex + 1} saved`);
    if (activeQuestionIndex < questions.length - 1) {
      setActiveQuestionIndex(activeQuestionIndex + 1);
    }
  };

  // ── Mark for review toggle ────────────────────────────────────────────────────
  const handleMarkForReview = () => {
    setMarkedSet(prev => {
      const n = new Set(prev);
      if (n.has(activeQId)) n.delete(activeQId);
      else n.add(activeQId);
      return n;
    });
  };

  // ── Reset to starter ─────────────────────────────────────────────────────────
  const handleResetStarter = () => {
    const starter = activeQuestion?.starterTemplates?.[currentLanguage] || '';
    setAllCodes(prev => ({ ...prev, [activeQId]: starter }));
    hasUnsavedRef.current = true;
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!isFullscreen || isLockedOut || showLobby || isSubmitted) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (participant) localStorage.setItem(`cid_draft_${participant.id}_${activeQId}_${currentLanguage}`, currentCode);
        setSavedStatus(`Saved at ${new Date().toLocaleTimeString()}`);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!submitting && !isContestOver) setShowPreviewModal(true);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [submitting, isContestOver, isFullscreen, isLockedOut, showLobby, isSubmitted, participant, activeQId, currentLanguage, currentCode]);

  // ── Global submit: send all question codes ────────────────────────────────────
  const executeGlobalSubmit = useCallback(async (autoSubmit: boolean) => {
    if (!participant || isSubmitted) return;
    setSubmitting(true);
    const now = Date.now();
    const results: LobbyResult[] = [];

    // Submit all questions in parallel
    const submits = questions.map(async (q) => {
      const code = allCodes[q.id] ?? '';
      const lang = allLanguages[q.id] ?? 'python';
      // Skip completely empty / starter-template-only (still submit them as auto)
      try {
        const res = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId: participant.id,
            participantName: participant.name,
            participantRoll: participant.rollNumber,
            terminalId: participant.terminalId,
            strikes: participant.strikes,
            questionId: q.id,
            language: lang,
            code,
            sessionId,
            isAutoSubmit: autoSubmit,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          results.push({
            questionId: q.id,
            questionTitle: q.title,
            language: lang,
            submittedAt: now,
            elapsedMs: contestStartRef.current ? now - contestStartRef.current : 0,
            testCasesPassed: data.testCasesPassed ?? 0,
            totalTestCases: data.totalTestCases ?? 0,
            score: data.score ?? 0,
            speedBonus: data.speedBonus ?? 0,
            lines: code.split('\n').length,
            chars: code.length,
            isAutoSubmit: autoSubmit,
          });
        }
      } catch { /* network error, still continue */ }
    });

    await Promise.allSettled(submits);
    setLobbyResults(results);
    setIsSubmitted(true);
    setShowPreviewModal(false);
    setSubmitting(false);
    setLobbyMessage(autoSubmit
      ? 'Time expired — all answers auto-submitted. Waiting for stage reveal...'
      : 'All answers submitted. Waiting for the Admiralty stage reveal...');
    setShowLobby(true);
  }, [participant, isSubmitted, questions, allCodes, allLanguages, sessionId]);

  // ── Timer expiry ─────────────────────────────────────────────────────────────
  const handleTimerExpired = useCallback(() => {
    setIsContestOver(true);
    if (!autoSubmitDoneRef.current && !isSubmitted) {
      autoSubmitDoneRef.current = true;
      executeGlobalSubmit(true);
    }
  }, [isSubmitted, executeGlobalSubmit]);

  // ── Preview modal data ────────────────────────────────────────────────────────
  const previewData = questions.map(q => {
    const status = getQStatus(q.id, questions);
    const code = allCodes[q.id] ?? '';
    const lang = allLanguages[q.id] ?? 'python';
    const starter = q.starterTemplates?.[lang] ?? '';
    const hasCode = code.trim().length > 0 && code.trim() !== starter.trim();
    return { q, status, code, lang, lines: code.split('\n').filter(l => l.trim()).length, chars: code.length, hasCode };
  });

  const summaryAnswered = previewData.filter(d => d.status === 'answered' || d.status === 'answered_marked').length;
  const summaryMarked = previewData.filter(d => d.status === 'marked_review' || d.status === 'answered_marked').length;
  const summaryUnanswered = previewData.filter(d => d.status === 'unanswered').length;
  const summaryNotVisited = previewData.filter(d => d.status === 'not_visited').length;
  const hasWarnings = summaryUnanswered + summaryNotVisited > 0;

  // ── LOBBY SCREEN ─────────────────────────────────────────────────────────────
  if (showLobby) {
    const totalScore = lobbyResults.reduce((s, l) => s + l.score + l.speedBonus, 0);
    const totalPassed = lobbyResults.reduce((s, l) => s + l.testCasesPassed, 0);
    const totalTests = lobbyResults.reduce((s, l) => s + l.totalTestCases, 0);
    return (
      <div className="relative flex flex-1 flex-col overflow-hidden bg-[#050504] items-center justify-center p-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#d4af37]/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 w-full max-w-2xl space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#1c160e]/80 px-4 py-1.5 font-cinzel text-xs font-bold tracking-widest text-[#f3d38c]">
              <Lock className="h-3.5 w-3.5 text-[#d4af37]" /> SUBMISSION SEALED &middot; AWAITING REVEAL
            </div>
            <h1 className="font-cinzel text-3xl font-extrabold text-[#ebe4d5] tracking-tight">Navigator&apos;s <span className="text-[#d4af37]">Lounge</span></h1>
            <p className="font-nautical-mono text-sm text-[#a68a56] max-w-md mx-auto">{lobbyMessage}</p>
          </div>

          {contest?.endTime && !isContestOver && (
            <div className="rounded-2xl border border-[#a68a56]/25 bg-[#090704]/80 p-4 text-center">
              <p className="font-cinzel text-xs text-[#a68a56] uppercase tracking-wider mb-2">Contest Ends In</p>
              <CountdownTimer endTime={contest.endTime} isPaused={contest.isPaused} onExpire={handleTimerExpired} />
            </div>
          )}

          {lobbyResults.length > 0 && (
            <div className="rounded-2xl border border-[#a68a56]/25 bg-[#090704]/80 overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#a68a56]/20 bg-[#140f0a] px-5 py-3">
                <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#d4af37]">Your Sealed Results</span>
                <span className="font-nautical-mono text-xs text-[#a68a56]">{lobbyResults.length}/{questions.length} questions</span>
              </div>
              <div className="divide-y divide-[#a68a56]/10">
                {lobbyResults.map((r) => {
                  const pct = r.totalTestCases > 0 ? r.testCasesPassed / r.totalTestCases : 0;
                  const bar = pct === 1 ? 'bg-emerald-500' : pct > 0.5 ? 'bg-[#d4af37]' : 'bg-red-500/70';
                  const elapsed = r.elapsedMs > 0 ? `${Math.floor(r.elapsedMs / 60000)}m ${Math.floor((r.elapsedMs % 60000) / 1000)}s` : '—';
                  return (
                    <div key={r.questionId} className="px-5 py-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-cinzel text-sm font-bold text-[#ebe4d5]">{r.questionTitle}</div>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 font-nautical-mono text-xs text-[#a68a56]">
                            <span className="uppercase">{r.language}</span>
                            <span>·</span><span>{r.lines} lines</span>
                            <span>·</span><span>Submitted {new Date(r.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            <span>·</span><span>Took {elapsed}</span>
                            {r.isAutoSubmit && <span className="text-amber-400">[AUTO]</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-nautical-mono text-xl font-extrabold text-[#d4af37]">{r.score + r.speedBonus}<span className="text-xs text-[#a68a56] ml-1">pts</span></div>
                          {r.speedBonus > 0 && <div className="text-[10px] text-[#f3d38c]">+{r.speedBonus} speed bonus</div>}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between font-nautical-mono text-[11px] text-[#a68a56]">
                          <span>{r.testCasesPassed}/{r.totalTestCases} tests passed</span>
                          <span>{Math.round(pct * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[#1c160e] overflow-hidden">
                          <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between border-t border-[#a68a56]/20 bg-[#140f0a] px-5 py-3">
                <span className="font-cinzel text-xs text-[#a68a56]">{totalPassed}/{totalTests} tests total</span>
                <span className="font-nautical-mono text-lg font-extrabold text-[#f3d38c]">{totalScore} pts</span>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[#a68a56]/20 bg-[#090704]/60 p-5 text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#d4af37]" />
              <span className="font-nautical-mono text-xs text-[#a68a56]">Waiting for the Admiralty stage reveal...</span>
            </div>
            <p className="font-nautical-mono text-[11px] text-[#6b5535]">This page will automatically redirect when the reveal begins.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!participant || questions.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div className="flex flex-col items-center gap-3 font-mono text-sm text-gray-400">
          <Terminal className="h-8 w-8 animate-spin text-emerald-400" />
          <span>Synchronizing Arena Terminal...</span>
        </div>
      </div>
    );
  }

  // Status helpers
  const statusConfig: Record<QStatus, { label: string; dotClass: string; borderClass: string }> = {
    not_visited:     { label: 'Not Visited',        dotClass: 'bg-[#3a3128]', borderClass: 'border-[#3a3128]/50' },
    unanswered:      { label: 'Not Answered',        dotClass: 'bg-orange-500', borderClass: 'border-orange-500/50' },
    answered:        { label: 'Answered',            dotClass: 'bg-emerald-500', borderClass: 'border-emerald-500/60' },
    marked_review:   { label: 'Marked for Review',   dotClass: 'bg-amber-400', borderClass: 'border-amber-400/60' },
    answered_marked: { label: 'Answered + Review',   dotClass: 'bg-teal-400', borderClass: 'border-teal-400/60' },
  };

  const activeStatus = getQStatus(activeQId, questions);
  const isMarked = markedSet.has(activeQId);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[#050504]">
      <AntiCheatShield participantName={participant.name} rollNumber={participant.rollNumber} terminalId={participant.terminalId} strikes={strikes} isLockedOut={isLockedOut} isFullscreen={isFullscreen} warningModalOpen={warningModalOpen} warningMessage={warningMessage} hudWarning={hudWarning} onRequestFullscreen={requestFullscreen} />

      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#a68a56]/20 bg-[#090806]/95 px-4 py-2 sm:px-6 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[#a68a56]/30 bg-[#1c160e]/80 px-2.5 py-1 font-nautical-mono text-xs text-[#f3d38c]">
            <span className="h-2 w-2 rounded-full bg-[#d4af37] animate-pulse" />
            <span>{participant.name}</span>
            <span className="text-[#a68a56]">·</span>
            <span className="text-[#ebe4d5]/80">{participant.terminalId}</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 font-nautical-mono text-xs text-[#a68a56]">
            <ShieldAlert className="h-3.5 w-3.5 text-[#d4af37]" />
            <span>Strikes: <strong className={strikes > 0 ? 'text-red-400' : 'text-[#f3d38c]'}>{strikes}/3</strong></span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 font-nautical-mono text-xs">
            {isOnline ? <span className="flex items-center gap-1 text-[#d4af37] text-[11px]"><Wifi className="h-3 w-3" /> Online</span>
              : <span className="flex items-center gap-1 text-amber-400 text-[11px] animate-pulse"><WifiOff className="h-3 w-3" /> Offline</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden lg:inline-block font-nautical-mono text-[11px] text-[#a68a56]">{savedStatus}</span>
          <div className="hidden sm:flex items-center border border-[#a68a56]/20 rounded-lg bg-[#050504]/60 p-0.5">
            <button onClick={() => setEditorFontSize(p => Math.max(12, p - 1))} className="p-1 text-[#a68a56] hover:text-[#f3d38c]"><ZoomOut className="h-3.5 w-3.5" /></button>
            <span className="px-1.5 text-[11px] text-[#ebe4d5] font-nautical-mono">{editorFontSize}px</span>
            <button onClick={() => setEditorFontSize(p => Math.min(20, p + 1))} className="p-1 text-[#a68a56] hover:text-[#f3d38c]"><ZoomIn className="h-3.5 w-3.5" /></button>
          </div>
          <CountdownTimer endTime={contest?.endTime || null} isPaused={contest?.isPaused} onExpire={handleTimerExpired} />
          <button
            onClick={() => setShowPreviewModal(true)}
            disabled={submitting || isLockedOut || isContestOver || isSubmitted}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-4 py-1.5 font-cinzel text-xs font-bold tracking-wider text-[#050504] shadow-[0_0_20px_rgba(212,175,55,0.25)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 bouncy-btn"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span>SUBMIT ALL</span>
          </button>
        </div>
      </div>

      {/* ── Two-panel layout ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">

        {/* Left: Problem panel */}
        {!isDrawerCollapsed && (
          <div className="w-full lg:w-[450px] xl:w-[500px] flex flex-col border-b lg:border-b-0 lg:border-r border-[#a68a56]/20 bg-[#090806]/95 overflow-y-auto">
            {/* Question tabs */}
            <div className="sticky top-0 z-10 border-b border-[#a68a56]/20 bg-[#090806]">
              <div className="flex items-center gap-1.5 p-2 overflow-x-auto justify-between">
                <div className="flex gap-1.5 overflow-x-auto">
                  {questions.map((q, idx) => {
                    const st = getQStatus(q.id, questions);
                    const cfg = statusConfig[st];
                    const isSel = idx === activeQuestionIndex;
                    return (
                      <button key={q.id} onClick={() => setActiveQuestionIndex(idx)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-nautical-mono text-xs transition-all whitespace-nowrap bouncy-btn border ${
                          isSel ? 'border-[#d4af37] bg-[#1c160e] text-[#f3d38c] font-bold shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                            : `${cfg.borderClass} bg-[#050504]/50 text-[#a68a56] hover:bg-[#1c160e]/30`}`}>
                        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
                        <span>Q{idx + 1}</span>
                        <span className="text-[10px] opacity-70">({q.points}p)</span>
                        {markedSet.has(q.id) && <Bookmark className="h-3 w-3 text-amber-400 fill-amber-400/40" />}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setIsDrawerCollapsed(true)} className="hidden lg:flex p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/5 shrink-0">
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-2 px-3 pb-2">
                {Object.entries(statusConfig).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1 font-nautical-mono text-[10px] text-[#6b5535]">
                    <span className={`h-1.5 w-1.5 rounded-full ${v.dotClass}`} />
                    <span>{v.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Problem content */}
            <div className="p-5 space-y-5">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded border border-[#d4af37]/30 bg-[#1c160e] px-2 py-0.5 font-cinzel text-[10px] font-semibold text-[#f3d38c]">{activeQuestion.difficulty}</span>
                  <span className="font-nautical-mono text-xs text-[#a68a56]">{activeQuestion.category} · {activeQuestion.points} pts</span>
                  <span className={`ml-auto rounded px-2 py-0.5 font-cinzel text-[10px] font-semibold border ${statusConfig[activeStatus].borderClass} text-[#ebe4d5]`}>
                    {statusConfig[activeStatus].label}
                  </span>
                </div>
                <h2 className="mt-2 font-cinzel text-xl font-bold tracking-tight text-[#ebe4d5]">{activeQuestion.title}</h2>
              </div>

              <div className="space-y-2">
                <h3 className="font-cinzel text-xs font-semibold uppercase tracking-wider text-[#d4af37]">Scenario Charter</h3>
                <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/60 p-4 font-sans text-sm leading-relaxed text-[#ebe4d5]/90 whitespace-pre-line">{activeQuestion.scenario}</div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/40 p-3"><h4 className="font-cinzel text-xs font-semibold text-[#f3d38c]">Input Inscription</h4><p className="mt-1 font-nautical-mono text-xs text-[#ebe4d5]/80 whitespace-pre-line">{activeQuestion.inputFormat}</p></div>
                <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/40 p-3"><h4 className="font-cinzel text-xs font-semibold text-[#f3d38c]">Output Vessel</h4><p className="mt-1 font-nautical-mono text-xs text-[#ebe4d5]/80 whitespace-pre-line">{activeQuestion.outputFormat}</p></div>
                <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/40 p-3"><h4 className="font-cinzel text-xs font-semibold text-[#d4af37]">Constraints</h4><p className="mt-1 font-nautical-mono text-xs text-[#ebe4d5]/80 whitespace-pre-line">{activeQuestion.constraints}</p></div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-cinzel text-xs font-semibold uppercase tracking-wider text-[#d4af37]">Public Trials</h3>
                  <span className="font-nautical-mono text-[10px] text-[#a68a56]">Hidden tests run on submission</span>
                </div>
                {activeQuestion.testCases.filter(tc => !tc.isHidden).map((tc, idx) => (
                  <div key={tc.id} className="rounded-xl border border-[#a68a56]/25 bg-[#0e0b07] p-3 font-nautical-mono text-xs space-y-2 select-none">
                    <div className="text-[11px] font-cinzel font-bold text-[#f3d38c]">Trial {idx + 1}</div>
                    <div><span className="text-[#a68a56]">Input:</span><pre className="mt-0.5 rounded border border-[#a68a56]/15 bg-[#050504] p-2 text-[#f3d38c] overflow-x-auto">{tc.input}</pre></div>
                    <div><span className="text-[#a68a56]">Expected Output:</span><pre className="mt-0.5 rounded border border-[#a68a56]/15 bg-[#050504] p-2 text-[#d4af37] overflow-x-auto">{tc.expectedOutput}</pre></div>
                    {tc.explanation && <div className="text-[11px] text-[#a68a56] italic">Note: {tc.explanation}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Right: Editor panel */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Editor toolbar */}
          <div className="flex items-center justify-between border-b border-[#a68a56]/20 bg-[#0c0906] px-4 py-2">
            <div className="flex items-center gap-3">
              {isDrawerCollapsed && (
                <button onClick={() => setIsDrawerCollapsed(false)} className="flex items-center gap-1.5 rounded-lg border border-[#a68a56]/30 bg-[#1c160e]/50 px-2.5 py-1 font-cinzel text-xs text-[#f3d38c] hover:border-[#d4af37]">
                  <PanelLeftOpen className="h-4 w-4" /><span>Scroll</span>
                </button>
              )}
              <div className="flex items-center gap-2">
                <label className="font-cinzel text-xs text-[#a68a56]">Cipher:</label>
                <select value={currentLanguage} onChange={e => handleLanguageChange(e.target.value as Language)}
                  className="rounded-lg border border-[#a68a56]/30 bg-[#050504] px-3 py-1 font-nautical-mono text-xs font-semibold text-[#f3d38c] focus:border-[#d4af37] focus:outline-none">
                  <option value="python">Python 3</option>
                  <option value="c">C (GCC 14)</option>
                  <option value="java">Java 17</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleMarkForReview}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-cinzel text-xs transition-all bouncy-btn ${
                  isMarked ? 'border-amber-400/60 bg-amber-400/10 text-amber-400' : 'border-[#a68a56]/30 bg-[#1c160e]/50 text-[#a68a56] hover:text-[#f3d38c]'}`}>
                {isMarked ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{isMarked ? 'Marked' : 'Mark Review'}</span>
              </button>
              <button onClick={handleResetStarter}
                className="flex items-center gap-1.5 rounded-lg border border-[#a68a56]/30 bg-[#1c160e]/50 px-2.5 py-1 font-nautical-mono text-xs text-[#a68a56] hover:text-[#f3d38c] hover:border-[#d4af37] transition-all bouncy-btn">
                <RotateCcw className="h-3.5 w-3.5" /><span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="relative flex-1 p-2 bg-[#050504]">
            {!isFullscreen && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#050504]/95 backdrop-blur-md select-none">
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                  <ShieldAlert className="h-8 w-8 animate-pulse text-[#d4af37]" />
                  <span className="font-cinzel font-bold text-sm tracking-wider text-[#d4af37]">FULLSCREEN REQUIRED</span>
                  <span className="font-nautical-mono text-xs text-[#a68a56] max-w-xs">Editing is only permitted in fullscreen sanctuary.</span>
                </div>
              </div>
            )}
            <MonacoBlindEditor language={currentLanguage} value={currentCode} onChange={handleCodeChange}
              disabled={!isFullscreen || isLockedOut || isSubmitted} fontSize={editorFontSize} />
          </div>

          {/* Bottom action bar: code stats + Save & Next */}
          <div className="flex items-center justify-between border-t border-[#a68a56]/20 bg-[#090806] px-4 py-2">
            <div className="flex items-center gap-3 font-nautical-mono text-[11px] text-[#6b5535]">
              <span className="flex items-center gap-1"><Code2 className="h-3 w-3" />{currentCode.split('\n').length} lines</span>
              <span>·</span>
              <span>{currentCode.length} chars</span>
              <span className="hidden sm:inline">· Ctrl+Enter to preview &amp; submit</span>
            </div>
            <button onClick={handleSaveAndNext} disabled={activeQuestionIndex >= questions.length - 1}
              className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/40 bg-[#1c160e] px-4 py-1.5 font-cinzel text-xs font-bold text-[#f3d38c] hover:border-[#d4af37] hover:bg-[#1c160e]/80 transition-all disabled:opacity-40 bouncy-btn">
              Save &amp; Next <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Preview / Confirmation Modal ─────────────────────────────────────── */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-[#d4af37]/40 bg-[#0c0906] shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-[#a68a56]/20 bg-[#140f0a] px-6 py-4">
              <div>
                <h2 className="font-cinzel text-lg font-extrabold text-[#f3d38c] tracking-wide">Submission Preview</h2>
                <p className="mt-0.5 font-nautical-mono text-xs text-[#a68a56]">Confirm what will be sent to the Admiralty for evaluation</p>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="text-[#a68a56] hover:text-[#ebe4d5]"><X className="h-5 w-5" /></button>
            </div>

            {/* Summary grid */}
            <div className="grid grid-cols-4 gap-px border-b border-[#a68a56]/20 bg-[#a68a56]/10">
              {[
                { label: 'Answered', count: summaryAnswered, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'Marked Review', count: summaryMarked, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                { label: 'Unanswered', count: summaryUnanswered, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                { label: 'Not Visited', count: summaryNotVisited, color: 'text-[#6b5535]', bg: 'bg-[#1c160e]' },
              ].map(({ label, count, color, bg }) => (
                <div key={label} className={`${bg} flex flex-col items-center justify-center py-4 gap-1`}>
                  <span className={`font-nautical-mono text-2xl font-extrabold ${color}`}>{count}</span>
                  <span className="font-cinzel text-[10px] uppercase tracking-wider text-[#a68a56]">{label}</span>
                </div>
              ))}
            </div>

            {/* Per-question list */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#a68a56]/10 px-0">
              {previewData.map(({ q, status, lang, lines, chars, hasCode }, idx) => {
                const cfg = statusConfig[status];
                const icons: Record<QStatus, React.ReactNode> = {
                  answered: <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />,
                  answered_marked: <BookmarkCheck className="h-4 w-4 text-teal-400 flex-shrink-0" />,
                  marked_review: <Bookmark className="h-4 w-4 text-amber-400 flex-shrink-0" />,
                  unanswered: <AlertCircle className="h-4 w-4 text-orange-400 flex-shrink-0" />,
                  not_visited: <Eye className="h-4 w-4 text-[#6b5535] flex-shrink-0" />,
                };
                return (
                  <div key={q.id} className="flex items-center gap-3 px-6 py-3">
                    <span className="font-cinzel text-xs font-bold text-[#a68a56] w-5 shrink-0">Q{idx + 1}</span>
                    {icons[status]}
                    <div className="flex-1 min-w-0">
                      <div className="font-cinzel text-xs font-bold text-[#ebe4d5] truncate">{q.title}</div>
                      <div className="font-nautical-mono text-[10px] text-[#a68a56]">{cfg.label} · {lang.toUpperCase()}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      {hasCode ? (
                        <>
                          <div className="font-nautical-mono text-xs font-bold text-[#f3d38c]">{lines} lines</div>
                          <div className="font-nautical-mono text-[10px] text-[#6b5535]">{chars} chars</div>
                        </>
                      ) : (
                        <span className="font-nautical-mono text-[10px] text-[#6b5535]">No code</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Warning */}
            {hasWarnings && (
              <div className="flex items-center gap-2 border-t border-orange-500/20 bg-orange-500/10 px-6 py-3">
                <FileWarning className="h-4 w-4 text-orange-400 flex-shrink-0" />
                <p className="font-nautical-mono text-xs text-orange-300">
                  {summaryNotVisited > 0 && `${summaryNotVisited} question(s) not visited. `}
                  {summaryUnanswered > 0 && `${summaryUnanswered} question(s) unanswered. `}
                  These will receive 0 points.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-[#a68a56]/20 bg-[#140f0a] px-6 py-4">
              <div className="font-nautical-mono text-xs text-[#a68a56]">
                <Clock className="inline h-3 w-3 mr-1" />
                <span>Submission is <strong className="text-red-400">permanent</strong> — no changes after confirm</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowPreviewModal(false)} disabled={submitting}
                  className="rounded-xl border border-[#a68a56]/30 px-4 py-2 font-cinzel text-xs text-[#ebe4d5] hover:bg-[#1c160e] disabled:opacity-50">
                  Back to Editor
                </button>
                <button onClick={() => executeGlobalSubmit(false)} disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-5 py-2 font-cinzel text-xs font-bold text-[#050504] shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:brightness-110 active:scale-95 disabled:opacity-60 bouncy-btn">
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Confirm &amp; Submit All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
