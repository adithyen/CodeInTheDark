'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MonacoBlindEditor from '@/components/MonacoBlindEditor';
import AntiCheatShield from '@/components/AntiCheatShield';
import CountdownTimer from '@/components/CountdownTimer';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { Question, Language, Participant, ContestState, ContestPhase } from '@/types';
import { 
  Send, 
  RotateCcw, 
  CheckCircle2, 
  ShieldAlert, 
  Terminal,
  Wifi,
  WifiOff,
  FileCheck,
  PanelLeftClose,
  PanelLeftOpen,
  ZoomIn,
  ZoomOut,
  Save,
  Download,
  X
} from 'lucide-react';

interface SubmissionReceipt {
  receiptId: string;
  questionTitle: string;
  language: Language;
  submittedAt: string;
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
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<string, boolean>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);
  const [isContestOver, setIsContestOver] = useState(false);

  // Phase 4 Ergonomics & Features
  const [isOnline, setIsOnline] = useState(true);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState(15);
  const [activeReceipt, setActiveReceipt] = useState<SubmissionReceipt | null>(null);

  const activeQuestion = questions[activeQuestionIndex];

  // Anti-Cheat Engine strictly controlling fullscreen, strikes, and input freeze
  const {
    isFullscreen,
    strikes,
    isLockedOut,
    warningModalOpen,
    warningMessage,
    hudWarning,
    requestFullscreen,
  } = useAntiCheat({
    participantId: participant?.id || '',
    participantName: participant?.name || 'Participant',
    rollNumber: participant?.rollNumber || 'UNKNOWN',
    terminalId: participant?.terminalId || 'NODE-1',
    initialStrikes: participant?.strikes || 0,
    initialLockedOut: participant?.isLockedOut || false,
    enabled: !!participant,
    onStrikeUpdate: (newStrikes, locked) => {
      setParticipant((prev) => prev ? { ...prev, strikes: newStrikes, isLockedOut: locked } : null);
    },
  });

  // 1. Online / Offline network health tracker
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      setSubmissionFeedback('Network connection restored. Syncing with contest server.');
      setTimeout(() => setSubmissionFeedback(null), 4000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSubmissionFeedback('Network connection offline. All code is safely stored in local memory.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Load participant (session-aware)
  useEffect(() => {
    const saved = localStorage.getItem('cid_participant');
    if (!saved) {
      router.push('/register');
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      setParticipant(parsed);
      if (parsed.sessionId) setSessionId(parsed.sessionId);
    } catch {
      router.push('/register');
    }
  }, [router]);

  // 3. Fetch questions and contest status (session-aware)
  const fetchContestAndQuestions = useCallback(async () => {
    try {
      const sidParam = sessionId ? `?sessionId=${sessionId}` : '';
      const [contestRes, qRes] = await Promise.all([
        fetch(`/api/contest${sidParam}`),
        fetch(`/api/questions${sidParam}`),
      ]);

      if (contestRes.ok) {
        const cData = await contestRes.json();
        setContest(cData.contest);
        const phase: ContestPhase = cData.session?.phase;
        if (
          (cData.contest?.endTime && Date.now() >= cData.contest.endTime) ||
          phase === 'ended' || phase === 'reveal'
        ) {
          setIsContestOver(true);
        }
        // Redirect away if session no longer active
        if (phase === 'setup' || phase === 'registration') {
          router.push('/register');
        }
      }

      if (qRes.ok) {
        const qData = await qRes.json();
        setQuestions(qData.questions || []);
      }
    } catch (err) {
      console.error('Error fetching arena data:', err);
    }
  }, [sessionId, router]);

  useEffect(() => {
    fetchContestAndQuestions();
    const interval = setInterval(fetchContestAndQuestions, 10000);
    return () => clearInterval(interval);
  }, [fetchContestAndQuestions]);

  // 4. Load or initialize draft for current question & language
  useEffect(() => {
    if (!activeQuestion || !participant) return;

    const draftKey = `cid_draft_${participant.id}_${activeQuestion.id}_${language}`;
    const savedDraft = localStorage.getItem(draftKey);

    if (savedDraft) {
      setCode(savedDraft);
    } else {
      setCode(activeQuestion.starterTemplates[language] || '');
    }

    const subKey = `cid_sub_${participant.id}_${activeQuestion.id}`;
    if (localStorage.getItem(subKey)) {
      setSubmittedQuestions((prev) => ({ ...prev, [activeQuestion.id]: true }));
    }
  }, [activeQuestion, language, participant]);

  // 5. Auto-save draft locally on code change
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (!activeQuestion || !participant) return;

    const draftKey = `cid_draft_${participant.id}_${activeQuestion.id}_${language}`;
    localStorage.setItem(draftKey, newCode);
    setSavedStatus(`Auto-saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
  };

  // Keyboard shortcut listener (Ctrl+S save draft, Ctrl+Enter submit)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Strictly ignore shortcuts if not in fullscreen or locked out
      if (!isFullscreen || isLockedOut) return;

      // Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setSavedStatus(`Saved checkpoint at ${new Date().toLocaleTimeString()}`);
        setSubmissionFeedback('Local draft checkpoint verified and saved.');
        setTimeout(() => setSubmissionFeedback(null), 3000);
      }
      // Ctrl+Enter / Cmd+Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!submitting && !isContestOver && activeQuestion) {
          setShowConfirmModal(true);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [submitting, isContestOver, activeQuestion, isFullscreen, isLockedOut]);

  // Reset starter code
  const handleResetStarter = () => {
    if (!activeQuestion) return;
    const starter = activeQuestion.starterTemplates[language] || '';
    setCode(starter);
    if (participant) {
      const draftKey = `cid_draft_${participant.id}_${activeQuestion.id}_${language}`;
      localStorage.setItem(draftKey, starter);
    }
  };

  // 6. Submit solution & Generate Digital Receipt
  const handleSubmitSolution = async () => {
    if (!activeQuestion || !participant || submitting) return;

    setSubmitting(true);
    setShowConfirmModal(false);

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
          questionId: activeQuestion.id,
          language,
          code,
          sessionId,
          isAutoSubmit: false,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSubmittedQuestions((prev) => ({ ...prev, [activeQuestion.id]: true }));
        const subKey = `cid_sub_${participant.id}_${activeQuestion.id}`;
        localStorage.setItem(subKey, 'true');

        // Generate Submission Receipt
        const receipt: SubmissionReceipt = {
          receiptId: `REC-${participant.rollNumber}-${activeQuestion.id.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
          questionTitle: activeQuestion.title,
          language,
          submittedAt: new Date().toLocaleTimeString(),
          charCount: code.length,
          lineCount: code.split('\n').length,
        };
        setActiveReceipt(receipt);

        setSubmissionFeedback(data.message || 'Solution successfully locked for evaluation.');
      } else {
        alert(data.error || 'Submission failed');
      }
    } catch {
      alert('Network error while submitting. Please check connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // 7. Handle timer expiration — auto-submit current code for ALL questions
  const handleTimerExpired = () => {
    setIsContestOver(true);
    if (!participant) return;

    // 1. Auto-submit current active question's code
    if (activeQuestion && code.trim()) {
      fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participant.id,
          participantName: participant.name,
          participantRoll: participant.rollNumber,
          terminalId: participant.terminalId,
          strikes: participant.strikes,
          questionId: activeQuestion.id,
          language,
          code,
          sessionId,
          isAutoSubmit: true,
        }),
      }).catch(() => {});
    }

    // 2. Also auto-submit saved drafts for other questions if not yet submitted
    questions.forEach((q) => {
      if (q.id === activeQuestion?.id) return;
      if (submittedQuestions[q.id]) return; // already submitted

      (['python', 'c', 'java'] as Language[]).forEach((lang) => {
        const draftKey = `cid_draft_${participant.id}_${q.id}_${lang}`;
        const draft = localStorage.getItem(draftKey);
        if (draft && draft.trim()) {
          fetch('/api/submit', {
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
              code: draft,
              sessionId,
              isAutoSubmit: true,
            }),
          }).catch(() => {});
        }
      });
    });
  };

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
      {/* Anti-Cheat Shield with Fullscreen & Watermark Matrix */}
      <AntiCheatShield
        participantName={participant.name}
        rollNumber={participant.rollNumber}
        terminalId={participant.terminalId}
        strikes={strikes}
        isLockedOut={isLockedOut}
        isFullscreen={isFullscreen}
        warningModalOpen={warningModalOpen}
        warningMessage={warningMessage}
        hudWarning={hudWarning}
        onRequestFullscreen={requestFullscreen}
      />

      {/* Global Arena Top Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#a68a56]/20 bg-[#090806]/95 px-4 py-2 sm:px-6">
        {/* Left: Participant info & terminal badge */}
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

          {/* Network Health Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 font-nautical-mono text-xs text-[#a68a56]">
            {isOnline ? (
              <span className="flex items-center gap-1 text-[#d4af37] text-[11px]">
                <Wifi className="h-3 w-3" /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400 text-[11px] animate-pulse">
                <WifiOff className="h-3 w-3" /> Offline (Cache Active)
              </span>
            )}
          </div>
        </div>

        {/* Right: Timer, Save status, Font Controls, and Submit Action */}
        <div className="flex items-center gap-3">
          <span className="hidden lg:inline-block font-nautical-mono text-[11px] text-[#a68a56]">
            {savedStatus}
          </span>

          {/* Font Resizer */}
          <div className="hidden sm:flex items-center border border-[#a68a56]/20 rounded-lg bg-[#050504]/60 p-0.5 font-nautical-mono text-xs">
            <button
              onClick={() => setEditorFontSize((prev) => Math.max(12, prev - 1))}
              className="p-1 text-[#a68a56] hover:text-[#f3d38c]"
              title="Decrease Font Size"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-1.5 text-[11px] text-[#ebe4d5]">{editorFontSize}px</span>
            <button
              onClick={() => setEditorFontSize((prev) => Math.min(20, prev + 1))}
              className="p-1 text-[#a68a56] hover:text-[#f3d38c]"
              title="Increase Font Size"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          <CountdownTimer
            endTime={contest?.endTime || null}
            isPaused={contest?.isPaused}
            onExpire={handleTimerExpired}
          />

          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={submitting || isLockedOut || isContestOver || !isFullscreen}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-4 py-1.5 font-cinzel text-xs font-bold tracking-wider text-[#050504] shadow-[0_0_20px_rgba(212,175,55,0.25)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 bouncy-btn"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{submittedQuestions[activeQuestion.id] ? 'UPDATE SUBMISSION' : 'LOCK & SUBMIT'}</span>
          </button>
        </div>
      </div>

      {/* Submission Feedback Banner */}
      {submissionFeedback && (
        <div className="flex items-center justify-between border-b border-[#d4af37]/40 bg-[#1c160e]/95 px-4 py-2 font-nautical-mono text-xs text-[#f3d38c] animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#d4af37]" />
            <span>{submissionFeedback}</span>
          </div>
          <button onClick={() => setSubmissionFeedback(null)} className="text-[#a68a56] hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Two-Panel Arena Layout */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Left Drawer: Problem Description & Multi-Question Tabs */}
        {!isDrawerCollapsed && (
          <div className="w-full lg:w-[450px] xl:w-[500px] flex flex-col border-b lg:border-b-0 lg:border-r border-[#a68a56]/20 bg-[#090806]/95 overflow-y-auto">
            {/* Question Switcher Tabs */}
            <div className="sticky top-0 z-10 flex border-b border-[#a68a56]/20 bg-[#090806] p-2 gap-1.5 overflow-x-auto justify-between items-center">
              <div className="flex gap-1.5 overflow-x-auto">
                {questions.map((q, idx) => {
                  const isSelected = idx === activeQuestionIndex;
                  const isDone = submittedQuestions[q.id];
                  return (
                    <button
                      key={q.id}
                      onClick={() => setActiveQuestionIndex(idx)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-nautical-mono text-xs transition-all whitespace-nowrap bouncy-btn ${
                        isSelected
                          ? 'border border-[#d4af37] bg-[#1c160e] text-[#f3d38c] font-bold shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                          : isDone
                          ? 'border border-[#a68a56]/40 bg-[#1c160e]/50 text-[#d4af37]'
                          : 'border border-[#a68a56]/15 bg-[#050504]/50 text-[#a68a56] hover:bg-[#1c160e]/30 hover:text-[#ebe4d5]'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#d4af37]" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-[#6b5535]" />
                      )}
                      <span>Q{idx + 1} ({q.points}pts)</span>
                    </button>
                  );
                })}
              </div>

              {/* Collapse Drawer button */}
              <button
                onClick={() => setIsDrawerCollapsed(true)}
                className="hidden lg:flex p-1.5 text-gray-400 hover:text-white rounded hover:bg-white/5"
                title="Collapse Problem Drawer"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>

            {/* Problem Body */}
            <div className="p-5 space-y-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded border border-[#d4af37]/30 bg-[#1c160e] px-2 py-0.5 font-cinzel text-[10px] font-semibold text-[#f3d38c]">
                    {activeQuestion.difficulty}
                  </span>
                  <span className="font-nautical-mono text-xs text-[#a68a56]">
                    {activeQuestion.category} · {activeQuestion.points} Points
                  </span>
                </div>
                <h2 className="mt-2 font-cinzel text-xl font-bold tracking-tight text-[#ebe4d5]">
                  {activeQuestion.title}
                </h2>
              </div>

              {/* Scenario Story */}
              <div className="space-y-2">
                <h3 className="font-cinzel text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
                  Scenario Charter
                </h3>
                <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/60 p-4 font-sans text-sm leading-relaxed text-[#ebe4d5]/90 whitespace-pre-line">
                  {activeQuestion.scenario}
                </div>
              </div>

              {/* Input & Output Format */}
              <div className="grid gap-3">
                <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/40 p-3">
                  <h4 className="font-cinzel text-xs font-semibold text-[#f3d38c]">Input Inscription</h4>
                  <p className="mt-1 font-nautical-mono text-xs text-[#ebe4d5]/80 whitespace-pre-line">
                    {activeQuestion.inputFormat}
                  </p>
                </div>

                <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/40 p-3">
                  <h4 className="font-cinzel text-xs font-semibold text-[#f3d38c]">Output Vessel</h4>
                  <p className="mt-1 font-nautical-mono text-xs text-[#ebe4d5]/80 whitespace-pre-line">
                    {activeQuestion.outputFormat}
                  </p>
                </div>

                <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/40 p-3">
                  <h4 className="font-cinzel text-xs font-semibold text-[#d4af37]">Voyage Constraints</h4>
                  <p className="mt-1 font-nautical-mono text-xs text-[#ebe4d5]/80 whitespace-pre-line">
                    {activeQuestion.constraints}
                  </p>
                </div>
              </div>

              {/* Sample Public Test Cases */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-cinzel text-xs font-semibold uppercase tracking-wider text-[#d4af37]">
                    Public Trials
                  </h3>
                  <span className="font-nautical-mono text-[10px] text-[#a68a56]">
                    Hidden seals tested upon stage reveal
                  </span>
                </div>

                {activeQuestion.testCases.map((tc, idx) => (
                  <div
                    key={tc.id}
                    className="rounded-xl border border-[#a68a56]/25 bg-[#0e0b07] p-3 font-nautical-mono text-xs space-y-2 select-none"
                  >
                    <div className="text-[11px] font-cinzel font-bold text-[#f3d38c]">Trial {idx + 1}</div>
                    <div>
                      <span className="text-[#a68a56]">Input:</span>
                      <pre className="mt-0.5 rounded border border-[#a68a56]/15 bg-[#050504] p-2 text-[#f3d38c] overflow-x-auto">
                        {tc.input}
                      </pre>
                    </div>
                    <div>
                      <span className="text-[#a68a56]">Expected Output:</span>
                      <pre className="mt-0.5 rounded border border-[#a68a56]/15 bg-[#050504] p-2 text-[#d4af37] overflow-x-auto">
                        {tc.expectedOutput}
                      </pre>
                    </div>
                    {tc.explanation && (
                      <div className="text-[11px] text-[#a68a56] italic">
                        Log: {tc.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Right Workspace: Blind Monaco Code Editor */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Editor Header: Expand drawer, Language selector, and Reset */}
          <div className="flex items-center justify-between border-b border-[#a68a56]/20 bg-[#0c0906] px-4 py-2">
            <div className="flex items-center gap-3">
              {isDrawerCollapsed && (
                <button
                  onClick={() => setIsDrawerCollapsed(false)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#a68a56]/30 bg-[#1c160e]/50 px-2.5 py-1 font-cinzel text-xs text-[#f3d38c] hover:border-[#d4af37]"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                  <span>Inspect Scroll</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <label className="font-cinzel text-xs text-[#a68a56]">Cipher:</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="rounded-lg border border-[#a68a56]/30 bg-[#050504] px-3 py-1 font-nautical-mono text-xs font-semibold text-[#f3d38c] focus:border-[#d4af37] focus:outline-none"
                >
                  <option value="python">Python 3 (3.12)</option>
                  <option value="c">C (GCC 14)</option>
                  <option value="java">Java (OpenJDK 17)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline font-nautical-mono text-[11px] text-[#a68a56]">
                Keys: <code className="text-[#f3d38c]">Ctrl+S</code> save · <code className="text-[#f3d38c]">Ctrl+Enter</code> submit
              </span>

              <button
                onClick={handleResetStarter}
                className="flex items-center gap-1.5 rounded-lg border border-[#a68a56]/30 bg-[#1c160e]/50 px-2.5 py-1 font-nautical-mono text-xs text-[#a68a56] hover:bg-[#1c160e] hover:text-[#f3d38c] hover:border-[#d4af37] transition-all bouncy-btn"
                title="Reset to starter template"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Parchment</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="relative flex-1 p-2 bg-[#050504]">
            {!isFullscreen && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#050504]/95 backdrop-blur-md select-none pointer-events-auto">
                <div className="flex flex-col items-center gap-3 p-6 text-center font-cinzel text-xs text-[#d4af37]">
                  <ShieldAlert className="h-8 w-8 animate-pulse text-[#d4af37]" />
                  <span className="font-bold text-sm tracking-wider">CHAMBER SEALED · FULLSCREEN REQUIRED</span>
                  <span className="text-[#a68a56] max-w-xs font-nautical-mono text-xs">All ink and editing is strictly forbidden outside presentation fullscreen sanctuary.</span>
                </div>
              </div>
            )}
            <MonacoBlindEditor
              language={language}
              value={code}
              onChange={handleCodeChange}
              disabled={!isFullscreen || isLockedOut || isContestOver}
              fontSize={editorFontSize}
            />
          </div>
        </div>
      </div>

      {/* Confirmation Modal Before Submission */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-md">
          <div className="max-w-md rounded-2xl border border-[#d4af37]/40 bg-[#0c0906] p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37]">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-cinzel text-lg font-bold text-[#f3d38c]">
                  Seal and Submit Solution
                </h3>
                <p className="text-xs font-nautical-mono text-[#a68a56]">
                  {activeQuestion.title} ({language.toUpperCase()})
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#ebe4d5]/90">
              Under <strong>Code In The Dark rules</strong>, your code will be securely submitted to the sanctuary. 
              Execution outputs remain strictly hidden until the stage evaluation reveal.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl border border-[#a68a56]/30 px-4 py-2 font-cinzel text-xs text-[#ebe4d5] hover:bg-[#1c160e]"
              >
                Return
              </button>
              <button
                onClick={handleSubmitSolution}
                className="rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-5 py-2 font-cinzel text-xs font-bold text-[#050504] shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:brightness-110 active:scale-95 bouncy-btn"
              >
                Confirm & Seal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 4 Digital Submission Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6 backdrop-blur-md">
          <div className="max-w-md w-full rounded-2xl border border-[#d4af37]/40 bg-[#0c0906] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#a68a56]/20 pb-3">
              <div className="flex items-center gap-2 text-[#f3d38c] font-cinzel text-sm font-bold tracking-wider">
                <FileCheck className="h-5 w-5 text-[#d4af37]" />
                <span>OFFICIAL SUBMISSION CHARTER</span>
              </div>
              <button
                onClick={() => setActiveReceipt(null)}
                className="text-[#a68a56] hover:text-[#ebe4d5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-[#a68a56]/25 bg-[#050504]/70 p-4 font-nautical-mono text-xs space-y-2.5">
              <div className="flex justify-between text-[#a68a56]">
                <span>Charter Token:</span>
                <span className="font-bold text-[#f3d38c]">{activeReceipt.receiptId}</span>
              </div>
              <div className="flex justify-between text-[#a68a56]">
                <span>Navigator:</span>
                <span className="text-[#ebe4d5] font-semibold">{participant.name} ({participant.rollNumber})</span>
              </div>
              <div className="flex justify-between text-[#a68a56]">
                <span>Challenge:</span>
                <span className="text-[#f3d38c]">{activeReceipt.questionTitle}</span>
              </div>
              <div className="flex justify-between text-[#a68a56]">
                <span>Cipher:</span>
                <span className="uppercase text-[#d4af37]">{activeReceipt.language}</span>
              </div>
              <div className="flex justify-between text-[#a68a56]">
                <span>Timestamp:</span>
                <span className="text-[#ebe4d5]/80">{activeReceipt.submittedAt}</span>
              </div>
              <div className="flex justify-between text-[#a68a56]">
                <span>Dimensions:</span>
                <span className="text-[#ebe4d5]/80">{activeReceipt.lineCount} lines · {activeReceipt.charCount} bytes</span>
              </div>
            </div>

            <p className="text-[11px] text-[#a68a56] text-center italic">
              Your code has been sealed and timestamped. Output is strictly concealed until the grand stage reveal.
            </p>

            <button
              onClick={() => setActiveReceipt(null)}
              className="w-full rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] py-2.5 font-cinzel text-xs font-bold tracking-wider text-[#050504] hover:brightness-110 bouncy-btn"
            >
              Close Charter & Resume Navigation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
