'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MonacoBlindEditor from '@/components/MonacoBlindEditor';
import AntiCheatShield from '@/components/AntiCheatShield';
import CountdownTimer from '@/components/CountdownTimer';
import { Question, Language, Participant, ContestState } from '@/types';
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

  // 2. Load participant
  useEffect(() => {
    const saved = localStorage.getItem('cid_participant');
    if (!saved) {
      router.push('/register');
      return;
    }
    try {
      setParticipant(JSON.parse(saved));
    } catch {
      router.push('/register');
    }
  }, [router]);

  // 3. Fetch questions and contest status
  const fetchContestAndQuestions = useCallback(async () => {
    try {
      const [contestRes, qRes] = await Promise.all([
        fetch('/api/contest'),
        fetch('/api/questions'),
      ]);

      if (contestRes.ok) {
        const cData = await contestRes.json();
        setContest(cData.contest);
        if (cData.contest?.endTime && Date.now() >= cData.contest.endTime) {
          setIsContestOver(true);
        }
      }

      if (qRes.ok) {
        const qData = await qRes.json();
        setQuestions(qData.questions || []);
      }
    } catch (err) {
      console.error('Error fetching arena data:', err);
    }
  }, []);

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
  }, [submitting, isContestOver, activeQuestion]);

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
          questionId: activeQuestion.id,
          language,
          code,
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

  // 7. Handle timer expiration
  const handleTimerExpired = () => {
    setIsContestOver(true);
    if (activeQuestion && participant && code.trim()) {
      fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: participant.id,
          questionId: activeQuestion.id,
          language,
          code,
        }),
      }).catch(() => {});
    }
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
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[#06090e]">
      {/* Anti-Cheat Shield with Fullscreen & Watermark Matrix */}
      <AntiCheatShield
        participantId={participant.id}
        participantName={participant.name}
        rollNumber={participant.rollNumber}
        terminalId={participant.terminalId}
        strikes={participant.strikes}
        isLockedOut={participant.isLockedOut}
        onStrikeRecorded={(newStrikes, isLockedOut) => {
          setParticipant((prev) => prev ? { ...prev, strikes: newStrikes, isLockedOut } : null);
        }}
      />

      {/* Global Arena Top Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/[0.08] bg-[#090e17] px-4 py-2.5 sm:px-6">
        {/* Left: Participant info & terminal badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-2.5 py-1 font-mono text-xs text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{participant.name} ({participant.rollNumber})</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-400">{participant.terminalId}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 font-mono text-xs text-gray-400">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            <span>Strikes: <strong className={participant.strikes > 0 ? 'text-red-400' : 'text-gray-300'}>{participant.strikes}/3</strong></span>
          </div>

          {/* Network Health Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-gray-400">
            {isOnline ? (
              <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
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
          <span className="hidden lg:inline-block font-mono text-[11px] text-gray-400">
            {savedStatus}
          </span>

          {/* Font Resizer */}
          <div className="hidden sm:flex items-center border border-white/10 rounded-lg bg-black/40 p-0.5 font-mono text-xs">
            <button
              onClick={() => setEditorFontSize((prev) => Math.max(12, prev - 1))}
              className="p-1 text-gray-400 hover:text-white"
              title="Decrease Font Size"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-1.5 text-[11px] text-gray-300">{editorFontSize}px</span>
            <button
              onClick={() => setEditorFontSize((prev) => Math.min(20, prev + 1))}
              className="p-1 text-gray-400 hover:text-white"
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
            disabled={submitting || participant.isLockedOut || isContestOver}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-1.5 font-mono text-xs font-bold text-black shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{submittedQuestions[activeQuestion.id] ? 'Update Submission' : 'Submit Solution'}</span>
          </button>
        </div>
      </div>

      {/* Submission Feedback Banner */}
      {submissionFeedback && (
        <div className="flex items-center justify-between border-b border-emerald-500/40 bg-emerald-950/30 px-4 py-2 font-mono text-xs text-emerald-300 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{submissionFeedback}</span>
          </div>
          <button onClick={() => setSubmissionFeedback(null)} className="text-gray-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Two-Panel Arena Layout */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Left Drawer: Problem Description & Multi-Question Tabs */}
        {!isDrawerCollapsed && (
          <div className="w-full lg:w-[450px] xl:w-[500px] flex flex-col border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#080d16] overflow-y-auto">
            {/* Question Switcher Tabs */}
            <div className="sticky top-0 z-10 flex border-b border-white/[0.08] bg-[#080d16] p-2 gap-1.5 overflow-x-auto justify-between items-center">
              <div className="flex gap-1.5 overflow-x-auto">
                {questions.map((q, idx) => {
                  const isSelected = idx === activeQuestionIndex;
                  const isDone = submittedQuestions[q.id];
                  return (
                    <button
                      key={q.id}
                      onClick={() => setActiveQuestionIndex(idx)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-xs transition-all whitespace-nowrap ${
                        isSelected
                          ? 'border border-cyan-500/50 bg-cyan-950/40 text-cyan-300 font-bold'
                          : isDone
                          ? 'border border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                          : 'border border-white/5 bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-gray-500" />
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
                  <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-400">
                    {activeQuestion.difficulty}
                  </span>
                  <span className="font-mono text-xs text-gray-400">
                    {activeQuestion.category} · {activeQuestion.points} Points
                  </span>
                </div>
                <h2 className="mt-2 font-mono text-xl font-bold tracking-tight text-white">
                  {activeQuestion.title}
                </h2>
              </div>

              {/* Scenario Story */}
              <div className="space-y-2">
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Scenario Description
                </h3>
                <div className="rounded-xl border border-white/5 bg-black/30 p-4 font-sans text-sm leading-relaxed text-gray-300 whitespace-pre-line">
                  {activeQuestion.scenario}
                </div>
              </div>

              {/* Input & Output Format */}
              <div className="grid gap-3">
                <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                  <h4 className="font-mono text-xs font-semibold text-cyan-400">Input Format</h4>
                  <p className="mt-1 font-mono text-xs text-gray-300 whitespace-pre-line">
                    {activeQuestion.inputFormat}
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                  <h4 className="font-mono text-xs font-semibold text-cyan-400">Output Format</h4>
                  <p className="mt-1 font-mono text-xs text-gray-300 whitespace-pre-line">
                    {activeQuestion.outputFormat}
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                  <h4 className="font-mono text-xs font-semibold text-amber-400">Constraints</h4>
                  <p className="mt-1 font-mono text-xs text-gray-300 whitespace-pre-line">
                    {activeQuestion.constraints}
                  </p>
                </div>
              </div>

              {/* Sample Public Test Cases */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Sample Test Cases (Public)
                  </h3>
                  <span className="font-mono text-[10px] text-gray-500">
                    Hidden cases evaluated after submission
                  </span>
                </div>

                {activeQuestion.testCases.map((tc, idx) => (
                  <div
                    key={tc.id}
                    className="rounded-xl border border-white/10 bg-[#0c121d] p-3 font-mono text-xs space-y-2 select-none"
                  >
                    <div className="text-[11px] font-bold text-gray-400">Example {idx + 1}</div>
                    <div>
                      <span className="text-gray-500">Input:</span>
                      <pre className="mt-0.5 rounded bg-black/40 p-2 text-emerald-300 overflow-x-auto">
                        {tc.input}
                      </pre>
                    </div>
                    <div>
                      <span className="text-gray-500">Expected Output:</span>
                      <pre className="mt-0.5 rounded bg-black/40 p-2 text-cyan-300 overflow-x-auto">
                        {tc.expectedOutput}
                      </pre>
                    </div>
                    {tc.explanation && (
                      <div className="text-[11px] text-gray-400 italic">
                        Note: {tc.explanation}
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
          <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0a0f19] px-4 py-2">
            <div className="flex items-center gap-3">
              {isDrawerCollapsed && (
                <button
                  onClick={() => setIsDrawerCollapsed(false)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-cyan-300 hover:bg-white/10"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                  <span>Show Problem</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <label className="font-mono text-xs text-gray-400">Language:</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="rounded-lg border border-white/15 bg-black/50 px-3 py-1 font-mono text-xs font-semibold text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="python">Python 3 (3.12)</option>
                  <option value="c">C (GCC 14)</option>
                  <option value="java">Java (OpenJDK 17)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline font-mono text-[11px] text-gray-500">
                Shortcut: <code className="text-gray-400">Ctrl+S</code> to save · <code className="text-gray-400">Ctrl+Enter</code> to submit
              </span>

              <button
                onClick={handleResetStarter}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-gray-400 hover:bg-white/10 hover:text-white transition-all"
                title="Reset to starter template"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Starter</span>
              </button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 p-2 bg-[#06090e]">
            <MonacoBlindEditor
              language={language}
              value={code}
              onChange={handleCodeChange}
              disabled={participant.isLockedOut || isContestOver}
              fontSize={editorFontSize}
            />
          </div>
        </div>
      </div>

      {/* Confirmation Modal Before Submission */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-md">
          <div className="max-w-md rounded-2xl border border-emerald-500/40 bg-[#0d1420] p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-mono text-lg font-bold text-white">
                  Confirm Code Submission
                </h3>
                <p className="text-xs text-gray-400">
                  {activeQuestion.title} ({language.toUpperCase()})
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-gray-300">
              Under <strong>Code In The Dark rules</strong>, your code will be securely submitted to the sandbox. 
              Execution outputs remain strictly hidden until the stage evaluation reveal.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl border border-white/10 px-4 py-2 font-mono text-xs text-gray-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitSolution}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 font-mono text-xs font-bold text-black shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 4 Digital Submission Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-md">
          <div className="max-w-md w-full rounded-2xl border border-cyan-500/40 bg-[#0c1320] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2 text-cyan-400 font-mono text-sm font-bold">
                <FileCheck className="h-5 w-5" />
                <span>OFFICIAL SUBMISSION RECEIPT</span>
              </div>
              <button
                onClick={() => setActiveReceipt(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-xs space-y-2.5">
              <div className="flex justify-between text-gray-400">
                <span>Receipt Token:</span>
                <span className="font-bold text-white">{activeReceipt.receiptId}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Candidate:</span>
                <span className="text-emerald-300 font-semibold">{participant.name} ({participant.rollNumber})</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Question:</span>
                <span className="text-cyan-300">{activeReceipt.questionTitle}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Language:</span>
                <span className="uppercase text-amber-300">{activeReceipt.language}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Timestamp:</span>
                <span className="text-gray-300">{activeReceipt.submittedAt}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Code Size:</span>
                <span className="text-gray-300">{activeReceipt.lineCount} lines · {activeReceipt.charCount} bytes</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 text-center italic">
              Your code has been locked and timestamped. Output is strictly sealed until the host triggers stage reveal.
            </p>

            <button
              onClick={() => setActiveReceipt(null)}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 font-mono text-xs font-bold text-black hover:brightness-110"
            >
              Close Receipt & Continue Coding
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
