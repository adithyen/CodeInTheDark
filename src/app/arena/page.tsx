'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MonacoBlindEditor from '@/components/MonacoBlindEditor';
import AntiCheatShield from '@/components/AntiCheatShield';
import CountdownTimer from '@/components/CountdownTimer';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { Question, Language, Participant, ContestState, ContestPhase } from '@/types';
import {
  Send, RotateCcw, CheckCircle2, ShieldAlert, Terminal,
  Wifi, WifiOff, PanelLeftClose, PanelLeftOpen, ZoomIn, ZoomOut, X,
  Loader2, Lock, ChevronRight,
} from 'lucide-react';

interface LockedSubmission {
  questionId: string;
  questionTitle: string;
  language: Language;
  submittedAt: number;
  elapsedMs: number;
  testCasesPassed: number;
  totalTestCases: number;
  score: number;
  speedBonus: number;
  charCount: number;
  lineCount: number;
}

export default function ArenaPage() {
  const router = useRouter();
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [contest, setContest] = useState<ContestState | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [language, setLanguage] = useState<Language>('python');
  const [code, setCode] = useState('');
  const [savedStatus, setSavedStatus] = useState('Draft saved locally');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);
  const [isContestOver, setIsContestOver] = useState(false);
  const [lockedSubmissions, setLockedSubmissions] = useState<Record<string, LockedSubmission>>({});
  const [showLobby, setShowLobby] = useState(false);
  const [lobbyMessage, setLobbyMessage] = useState('Awaiting contest conclusion...');
  const [isOnline, setIsOnline] = useState(true);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState(15);
  const contestStartRef = useRef<number | null>(null);
  const autoSubmitDoneRef = useRef(false);

  const activeQuestion = questions[activeQuestionIndex];
  const isQuestionLocked = activeQuestion ? !!lockedSubmissions[activeQuestion.id] : false;

  const { isFullscreen, strikes, isLockedOut, warningModalOpen, warningMessage, hudWarning, requestFullscreen } =
    useAntiCheat({
      participantId: participant?.id || '',
      participantName: participant?.name || 'Participant',
      rollNumber: participant?.rollNumber || 'UNKNOWN',
      terminalId: participant?.terminalId || 'NODE-1',
      initialStrikes: participant?.strikes || 0,
      initialLockedOut: participant?.isLockedOut || false,
      enabled: !!participant && !showLobby,
      onStrikeUpdate: (s, l) => setParticipant((p) => p ? { ...p, strikes: s, isLockedOut: l } : null),
    });

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('cid_participant');
    if (!saved) { router.push('/register'); return; }
    try {
      const parsed = JSON.parse(saved);
      setParticipant(parsed);
      if (parsed.sessionId) setSessionId(parsed.sessionId);
    } catch { router.push('/register'); }
  }, [router]);

  useEffect(() => {
    if (!participant) return;
    const stored = localStorage.getItem(`cid_locked_${participant.id}`);
    if (stored) { try { setLockedSubmissions(JSON.parse(stored)); } catch {} }
  }, [participant]);

  const fetchContestAndQuestions = useCallback(async () => {
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
        if (phase === 'reveal' || cState?.isRevealMode) { router.push('/leaderboard'); return; }
        if (phase === 'setup' || phase === 'registration') { router.push('/register'); }
      }
      if (qRes.ok) {
        const qData = await qRes.json();
        setQuestions(qData.questions || []);
      }
    } catch (err) { console.error('Arena fetch error:', err); }
  }, [sessionId, participant, router]);

  useEffect(() => {
    fetchContestAndQuestions();
    const interval = setInterval(fetchContestAndQuestions, 5000);
    return () => clearInterval(interval);
  }, [fetchContestAndQuestions]);

  // Show lobby when contest ends
  useEffect(() => {
    if (isContestOver && !showLobby) {
      setLobbyMessage('Time is up. Your code has been sealed. Waiting for the stage reveal...');
      setShowLobby(true);
    }
  }, [isContestOver, showLobby]);

  useEffect(() => {
    if (!activeQuestion || !participant) return;
    if (lockedSubmissions[activeQuestion.id]) { setCode(''); return; }
    const dk = `cid_draft_${participant.id}_${activeQuestion.id}_${language}`;
    const d = localStorage.getItem(dk);
    setCode(d || activeQuestion.starterTemplates[language] || '');
  }, [activeQuestion?.id, language, participant?.id]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (!activeQuestion || !participant || isQuestionLocked) return;
    localStorage.setItem(`cid_draft_${participant.id}_${activeQuestion.id}_${language}`, newCode);
    setSavedStatus(`Auto-saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!isFullscreen || isLockedOut || showLobby) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); setSavedStatus(`Saved at ${new Date().toLocaleTimeString()}`); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (!submitting && !isContestOver && !isQuestionLocked && activeQuestion) setShowConfirmModal(true); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [submitting, isContestOver, isQuestionLocked, activeQuestion, isFullscreen, isLockedOut, showLobby]);

  const doAutoSubmits = useCallback((currentParticipant: Participant, currentActiveQuestion: Question | undefined, currentCode: string, currentLanguage: Language, currentLockedSubmissions: Record<string, LockedSubmission>, currentQuestions: Question[], currentSessionId: string | null) => {
    if (autoSubmitDoneRef.current) return;
    autoSubmitDoneRef.current = true;
    if (currentActiveQuestion && !currentLockedSubmissions[currentActiveQuestion.id] && currentCode.trim()) {
      fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participantId: currentParticipant.id, participantName: currentParticipant.name, participantRoll: currentParticipant.rollNumber, terminalId: currentParticipant.terminalId, strikes: currentParticipant.strikes, questionId: currentActiveQuestion.id, language: currentLanguage, code: currentCode, sessionId: currentSessionId, isAutoSubmit: true }) }).catch(() => {});
    }
    currentQuestions.forEach((q) => {
      if (q.id === currentActiveQuestion?.id || currentLockedSubmissions[q.id]) return;
      (['python', 'c', 'java'] as Language[]).forEach((lang) => {
        const d = localStorage.getItem(`cid_draft_${currentParticipant.id}_${q.id}_${lang}`);
        if (d?.trim()) fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participantId: currentParticipant.id, participantName: currentParticipant.name, participantRoll: currentParticipant.rollNumber, terminalId: currentParticipant.terminalId, strikes: currentParticipant.strikes, questionId: q.id, language: lang, code: d, sessionId: currentSessionId, isAutoSubmit: true }) }).catch(() => {});
      });
    });
  }, []);

  const handleTimerExpired = useCallback(() => {
    setIsContestOver(true);
    if (participant) doAutoSubmits(participant, activeQuestion, code, language, lockedSubmissions, questions, sessionId);
  }, [participant, activeQuestion, code, language, lockedSubmissions, questions, sessionId, doAutoSubmits]);

  const handleSubmitSolution = async () => {
    if (!activeQuestion || !participant || submitting || isQuestionLocked) return;
    setSubmitting(true);
    setShowConfirmModal(false);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: participant.id, participantName: participant.name, participantRoll: participant.rollNumber, terminalId: participant.terminalId, strikes: participant.strikes, questionId: activeQuestion.id, language, code, sessionId, isAutoSubmit: false }),
      });
      const data = await res.json();
      if (res.ok) {
        const elapsedMs = contestStartRef.current ? Date.now() - contestStartRef.current : 0;
        const locked: LockedSubmission = { questionId: activeQuestion.id, questionTitle: activeQuestion.title, language, submittedAt: Date.now(), elapsedMs, testCasesPassed: data.testCasesPassed ?? 0, totalTestCases: data.totalTestCases ?? 0, score: data.score ?? 0, speedBonus: data.speedBonus ?? 0, charCount: code.length, lineCount: code.split('\n').length };
        const newLocked = { ...lockedSubmissions, [activeQuestion.id]: locked };
        setLockedSubmissions(newLocked);
        localStorage.setItem(`cid_locked_${participant.id}`, JSON.stringify(newLocked));
        if (questions.length > 0 && Object.keys(newLocked).length >= questions.length) {
          setLobbyMessage('All answers sealed. Waiting for other navigators and the stage reveal...');
          setShowLobby(true);
        } else {
          setSubmissionFeedback(`✓ ${activeQuestion.title} sealed. Move to the next question.`);
          setTimeout(() => setSubmissionFeedback(null), 5000);
        }
      } else { alert(data.error || 'Submission failed'); }
    } catch { alert('Network error. Please retry.'); }
    finally { setSubmitting(false); }
  };

  const handleResetStarter = () => {
    if (!activeQuestion || isQuestionLocked) return;
    const s = activeQuestion.starterTemplates[language] || '';
    setCode(s);
    if (participant) localStorage.setItem(`cid_draft_${participant.id}_${activeQuestion.id}_${language}`, s);
  };

  // ── LOBBY SCREEN ───────────────────────────────────────────────────────────
  if (showLobby) {
    const allLocked = Object.values(lockedSubmissions);
    const totalScore = allLocked.reduce((s, l) => s + l.score + l.speedBonus, 0);
    const totalPassed = allLocked.reduce((s, l) => s + l.testCasesPassed, 0);
    const totalTests = allLocked.reduce((s, l) => s + l.totalTestCases, 0);
    return (
      <div className="relative flex flex-1 flex-col overflow-hidden bg-[#050504] items-center justify-center p-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#d4af37]/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 w-full max-w-2xl space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#1c160e]/80 px-4 py-1.5 font-cinzel text-xs font-bold tracking-widest text-[#f3d38c]">
              <Lock className="h-3.5 w-3.5 text-[#d4af37]" />
              SUBMISSION SEALED &middot; AWAITING REVEAL
            </div>
            <h1 className="font-cinzel text-3xl font-extrabold text-[#ebe4d5] tracking-tight">
              Navigator&apos;s <span className="text-[#d4af37]">Lounge</span>
            </h1>
            <p className="font-nautical-mono text-sm text-[#a68a56] max-w-md mx-auto">{lobbyMessage}</p>
          </div>

          {contest?.endTime && !isContestOver && (
            <div className="rounded-2xl border border-[#a68a56]/25 bg-[#090704]/80 p-4 text-center">
              <p className="font-cinzel text-xs text-[#a68a56] uppercase tracking-wider mb-2">Contest Ends In</p>
              <CountdownTimer endTime={contest.endTime} isPaused={contest.isPaused} onExpire={handleTimerExpired} />
            </div>
          )}

          {allLocked.length > 0 && (
            <div className="rounded-2xl border border-[#a68a56]/25 bg-[#090704]/80 overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#a68a56]/20 bg-[#140f0a] px-5 py-3">
                <span className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#d4af37]">Your Sealed Results</span>
                <span className="font-nautical-mono text-xs text-[#a68a56]">{allLocked.length}/{questions.length} sealed</span>
              </div>
              <div className="divide-y divide-[#a68a56]/10">
                {allLocked.map((sub) => {
                  const pct = sub.totalTestCases > 0 ? sub.testCasesPassed / sub.totalTestCases : 0;
                  const bar = pct === 1 ? 'bg-emerald-500' : pct > 0.5 ? 'bg-[#d4af37]' : 'bg-red-500/70';
                  const elapsed = sub.elapsedMs > 0 ? `${Math.floor(sub.elapsedMs / 60000)}m ${Math.floor((sub.elapsedMs % 60000) / 1000)}s` : '—';
                  return (
                    <div key={sub.questionId} className="px-5 py-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-cinzel text-sm font-bold text-[#ebe4d5]">{sub.questionTitle}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-nautical-mono text-xs text-[#a68a56]">
                            <span className="uppercase">{sub.language}</span>
                            <span>·</span>
                            <span>Sealed {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            <span>·</span>
                            <span>Took {elapsed}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-nautical-mono text-xl font-extrabold text-[#d4af37]">{sub.score + sub.speedBonus}<span className="text-xs text-[#a68a56] ml-1">pts</span></div>
                          {sub.speedBonus > 0 && <div className="text-[10px] text-[#f3d38c]">+{sub.speedBonus} speed bonus</div>}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between font-nautical-mono text-[11px] text-[#a68a56]">
                          <span>{sub.testCasesPassed}/{sub.totalTestCases} tests passed</span>
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
                <span className="font-cinzel text-xs text-[#a68a56]">Total: {totalPassed}/{totalTests} tests passed</span>
                <span className="font-nautical-mono text-lg font-extrabold text-[#f3d38c]">{totalScore} pts</span>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[#a68a56]/20 bg-[#090704]/60 p-5 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-[#a68a56]">
              <Loader2 className="h-4 w-4 animate-spin text-[#d4af37]" />
              <span className="font-nautical-mono text-xs">Waiting for the Admiralty to reveal scores...</span>
            </div>
            <p className="font-nautical-mono text-[11px] text-[#6b5535]">This page will automatically redirect to the leaderboard when the stage reveal begins.</p>
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

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[#050504]">
      <AntiCheatShield participantName={participant.name} rollNumber={participant.rollNumber} terminalId={participant.terminalId} strikes={strikes} isLockedOut={isLockedOut} isFullscreen={isFullscreen} warningModalOpen={warningModalOpen} warningMessage={warningMessage} hudWarning={hudWarning} onRequestFullscreen={requestFullscreen} />

      <div className="flex flex-wrap items-center justify-between border-b border-[#a68a56]/20 bg-[#090806]/95 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[#a68a56]/30 bg-[#1c160e]/80 px-2.5 py-1 font-nautical-mono text-xs text-[#f3d38c]">
            <span className="h-2 w-2 rounded-full bg-[#d4af37] animate-pulse" />
            <span>{participant.name} ({participant.rollNumber})</span>
            <span className="text-[#a68a56]">·</span>
            <span className="text-[#ebe4d5]/80">{participant.terminalId}</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 font-nautical-mono text-xs text-[#a68a56]">
            <ShieldAlert className="h-3.5 w-3.5 text-[#d4af37]" />
            <span>Strikes: <strong className={strikes > 0 ? 'text-red-400' : 'text-[#f3d38c]'}>{strikes}/3</strong></span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 font-nautical-mono text-xs">
            {isOnline ? <span className="flex items-center gap-1 text-[#d4af37] text-[11px]"><Wifi className="h-3 w-3" /> Online</span> : <span className="flex items-center gap-1 text-amber-400 text-[11px] animate-pulse"><WifiOff className="h-3 w-3" /> Offline</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden lg:inline-block font-nautical-mono text-[11px] text-[#a68a56]">{savedStatus}</span>
          <div className="hidden sm:flex items-center border border-[#a68a56]/20 rounded-lg bg-[#050504]/60 p-0.5">
            <button onClick={() => setEditorFontSize((p) => Math.max(12, p - 1))} className="p-1 text-[#a68a56] hover:text-[#f3d38c]"><ZoomOut className="h-3.5 w-3.5" /></button>
            <span className="px-1.5 text-[11px] text-[#ebe4d5] font-nautical-mono">{editorFontSize}px</span>
            <button onClick={() => setEditorFontSize((p) => Math.min(20, p + 1))} className="p-1 text-[#a68a56] hover:text-[#f3d38c]"><ZoomIn className="h-3.5 w-3.5" /></button>
          </div>
          <CountdownTimer endTime={contest?.endTime || null} isPaused={contest?.isPaused} onExpire={handleTimerExpired} />
          <button onClick={() => setShowConfirmModal(true)} disabled={submitting || isLockedOut || isContestOver || !isFullscreen || isQuestionLocked} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-4 py-1.5 font-cinzel text-xs font-bold tracking-wider text-[#050504] shadow-[0_0_20px_rgba(212,175,55,0.25)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 bouncy-btn">
            {isQuestionLocked ? <><Lock className="h-3.5 w-3.5" /><span>SEALED</span></> : <><Send className="h-3.5 w-3.5" /><span>LOCK &amp; SUBMIT</span></>}
          </button>
        </div>
      </div>

      {submissionFeedback && (
        <div className="flex items-center justify-between border-b border-[#d4af37]/40 bg-[#1c160e]/95 px-4 py-2 font-nautical-mono text-xs text-[#f3d38c] animate-fade-in">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#d4af37]" /><span>{submissionFeedback}</span></div>
          <button onClick={() => setSubmissionFeedback(null)}><X className="h-3.5 w-3.5 text-[#a68a56] hover:text-white" /></button>
        </div>
      )}

      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {!isDrawerCollapsed && (
          <div className="w-full lg:w-[450px] xl:w-[500px] flex flex-col border-b lg:border-b-0 lg:border-r border-[#a68a56]/20 bg-[#090806]/95 overflow-y-auto">
            <div className="sticky top-0 z-10 flex border-b border-[#a68a56]/20 bg-[#090806] p-2 gap-1.5 overflow-x-auto justify-between items-center">
              <div className="flex gap-1.5 overflow-x-auto">
                {questions.map((q, idx) => {
                  const isSel = idx === activeQuestionIndex;
                  const isDone = !!lockedSubmissions[q.id];
                  return (
                    <button key={q.id} onClick={() => setActiveQuestionIndex(idx)} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-nautical-mono text-xs transition-all whitespace-nowrap bouncy-btn ${isSel ? 'border border-[#d4af37] bg-[#1c160e] text-[#f3d38c] font-bold' : isDone ? 'border border-[#d4af37]/50 bg-[#1c160e]/50 text-[#d4af37]' : 'border border-[#a68a56]/15 bg-[#050504]/50 text-[#a68a56] hover:bg-[#1c160e]/30'}`}>
                      {isDone ? <Lock className="h-3.5 w-3.5 text-[#d4af37]" /> : <span className="h-2 w-2 rounded-full bg-[#6b5535]" />}
                      <span>Q{idx + 1} ({q.points}pts)</span>
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setIsDrawerCollapsed(true)} className="hidden lg:flex p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/5"><PanelLeftClose className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded border border-[#d4af37]/30 bg-[#1c160e] px-2 py-0.5 font-cinzel text-[10px] font-semibold text-[#f3d38c]">{activeQuestion.difficulty}</span>
                  <span className="font-nautical-mono text-xs text-[#a68a56]">{activeQuestion.category} · {activeQuestion.points} Points</span>
                </div>
                <h2 className="mt-2 font-cinzel text-xl font-bold tracking-tight text-[#ebe4d5]">{activeQuestion.title}</h2>
                {isQuestionLocked && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#d4af37]/40 bg-[#1c160e]/80 px-3 py-2 font-cinzel text-xs text-[#f3d38c]">
                    <Lock className="h-3.5 w-3.5 text-[#d4af37]" />
                    <span>Sealed · {new Date(lockedSubmissions[activeQuestion.id]?.submittedAt ?? 0).toLocaleTimeString()}</span>
                    <span className="ml-auto text-[#d4af37] font-bold">{(lockedSubmissions[activeQuestion.id]?.score ?? 0) + (lockedSubmissions[activeQuestion.id]?.speedBonus ?? 0)} pts</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="font-cinzel text-xs font-semibold uppercase tracking-wider text-[#d4af37]">Scenario Charter</h3>
                <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/60 p-4 font-sans text-sm leading-relaxed text-[#ebe4d5]/90 whitespace-pre-line">{activeQuestion.scenario}</div>
              </div>
              <div className="grid gap-3">
                <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/40 p-3"><h4 className="font-cinzel text-xs font-semibold text-[#f3d38c]">Input Inscription</h4><p className="mt-1 font-nautical-mono text-xs text-[#ebe4d5]/80 whitespace-pre-line">{activeQuestion.inputFormat}</p></div>
                <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/40 p-3"><h4 className="font-cinzel text-xs font-semibold text-[#f3d38c]">Output Vessel</h4><p className="mt-1 font-nautical-mono text-xs text-[#ebe4d5]/80 whitespace-pre-line">{activeQuestion.outputFormat}</p></div>
                <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/40 p-3"><h4 className="font-cinzel text-xs font-semibold text-[#d4af37]">Voyage Constraints</h4><p className="mt-1 font-nautical-mono text-xs text-[#ebe4d5]/80 whitespace-pre-line">{activeQuestion.constraints}</p></div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-cinzel text-xs font-semibold uppercase tracking-wider text-[#d4af37]">Public Trials</h3>
                  <span className="font-nautical-mono text-[10px] text-[#a68a56]">Hidden seals tested upon reveal</span>
                </div>
                {activeQuestion.testCases.filter((tc) => !tc.isHidden).map((tc, idx) => (
                  <div key={tc.id} className="rounded-xl border border-[#a68a56]/25 bg-[#0e0b07] p-3 font-nautical-mono text-xs space-y-2 select-none">
                    <div className="text-[11px] font-cinzel font-bold text-[#f3d38c]">Trial {idx + 1}</div>
                    <div><span className="text-[#a68a56]">Input:</span><pre className="mt-0.5 rounded border border-[#a68a56]/15 bg-[#050504] p-2 text-[#f3d38c] overflow-x-auto">{tc.input}</pre></div>
                    <div><span className="text-[#a68a56]">Expected Output:</span><pre className="mt-0.5 rounded border border-[#a68a56]/15 bg-[#050504] p-2 text-[#d4af37] overflow-x-auto">{tc.expectedOutput}</pre></div>
                    {tc.explanation && <div className="text-[11px] text-[#a68a56] italic">Log: {tc.explanation}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#a68a56]/20 bg-[#0c0906] px-4 py-2">
            <div className="flex items-center gap-3">
              {isDrawerCollapsed && <button onClick={() => setIsDrawerCollapsed(false)} className="flex items-center gap-1.5 rounded-lg border border-[#a68a56]/30 bg-[#1c160e]/50 px-2.5 py-1 font-cinzel text-xs text-[#f3d38c] hover:border-[#d4af37]"><PanelLeftOpen className="h-4 w-4" /><span>Inspect Scroll</span></button>}
              <div className="flex items-center gap-2">
                <label className="font-cinzel text-xs text-[#a68a56]">Cipher:</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} disabled={isQuestionLocked} className="rounded-lg border border-[#a68a56]/30 bg-[#050504] px-3 py-1 font-nautical-mono text-xs font-semibold text-[#f3d38c] focus:border-[#d4af37] focus:outline-none disabled:opacity-50">
                  <option value="python">Python 3 (3.12)</option>
                  <option value="c">C (GCC 14)</option>
                  <option value="java">Java (OpenJDK 17)</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline font-nautical-mono text-[11px] text-[#a68a56]">Keys: <code className="text-[#f3d38c]">Ctrl+S</code> save · <code className="text-[#f3d38c]">Ctrl+Enter</code> submit</span>
              <button onClick={handleResetStarter} disabled={isQuestionLocked} className="flex items-center gap-1.5 rounded-lg border border-[#a68a56]/30 bg-[#1c160e]/50 px-2.5 py-1 font-nautical-mono text-xs text-[#a68a56] hover:bg-[#1c160e] hover:text-[#f3d38c] hover:border-[#d4af37] transition-all disabled:opacity-40 bouncy-btn">
                <RotateCcw className="h-3.5 w-3.5" /><span>Reset</span>
              </button>
            </div>
          </div>
          <div className="relative flex-1 p-2 bg-[#050504]">
            {isQuestionLocked && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#050504]/90 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/30">
                    <Lock className="h-8 w-8 text-[#d4af37]" />
                  </div>
                  <div className="font-cinzel text-sm font-bold text-[#f3d38c]">SUBMISSION SEALED</div>
                  <div className="font-nautical-mono text-xs text-[#a68a56] max-w-xs">
                    Locked in the archive. Score: <strong className="text-[#d4af37]">{(lockedSubmissions[activeQuestion?.id ?? '']?.score ?? 0) + (lockedSubmissions[activeQuestion?.id ?? '']?.speedBonus ?? 0)} pts</strong>
                  </div>
                  {questions.length > 1 && activeQuestionIndex < questions.length - 1 && !lockedSubmissions[questions[activeQuestionIndex + 1]?.id] && (
                    <button onClick={() => setActiveQuestionIndex(activeQuestionIndex + 1)} className="mt-2 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f3d38c] px-4 py-2 font-cinzel text-xs font-bold text-[#050504] hover:brightness-110 bouncy-btn">
                      Next Question <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
            {!isFullscreen && !isQuestionLocked && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#050504]/95 backdrop-blur-md select-none pointer-events-auto">
                <div className="flex flex-col items-center gap-3 p-6 text-center font-cinzel text-xs text-[#d4af37]">
                  <ShieldAlert className="h-8 w-8 animate-pulse text-[#d4af37]" />
                  <span className="font-bold text-sm tracking-wider">CHAMBER SEALED · FULLSCREEN REQUIRED</span>
                  <span className="text-[#a68a56] max-w-xs font-nautical-mono text-xs">Editing is only permitted in fullscreen sanctuary.</span>
                </div>
              </div>
            )}
            <MonacoBlindEditor language={language} value={code} onChange={handleCodeChange} disabled={!isFullscreen || isLockedOut || isContestOver || isQuestionLocked} fontSize={editorFontSize} />
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-md">
          <div className="max-w-md rounded-2xl border border-[#d4af37]/40 bg-[#0c0906] p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37]"><Send className="h-5 w-5" /></div>
              <div>
                <h3 className="font-cinzel text-lg font-bold text-[#f3d38c]">Seal and Submit Solution</h3>
                <p className="text-xs font-nautical-mono text-[#a68a56]">{activeQuestion?.title} ({language.toUpperCase()})</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[#ebe4d5]/90">
              Under <strong>Code In The Dark rules</strong>, once submitted this answer is <strong className="text-red-400">permanently locked</strong>. You cannot resubmit or update it. Ready?
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="rounded-xl border border-[#a68a56]/30 px-4 py-2 font-cinzel text-xs text-[#ebe4d5] hover:bg-[#1c160e]">Return</button>
              <button onClick={handleSubmitSolution} className="rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-5 py-2 font-cinzel text-xs font-bold text-[#050504] shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:brightness-110 active:scale-95 bouncy-btn">
                Confirm &amp; Seal Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
