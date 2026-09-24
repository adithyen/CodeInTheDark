'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MonacoBlindEditor from '@/components/MonacoBlindEditor';
import AntiCheatShield from '@/components/AntiCheatShield';
import CountdownTimer from '@/components/CountdownTimer';
import { Question, Language, Participant, ContestState } from '@/types';
import { 
  Send, 
  RotateCcw, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  HelpCircle,
  FileCode2,
  Terminal,
  Layers,
  Sparkles
} from 'lucide-react';

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

  const activeQuestion = questions[activeQuestionIndex];

  // 1. Load participant
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

  // 2. Fetch questions and contest status
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

  // 3. Load or initialize draft for current question & language
  useEffect(() => {
    if (!activeQuestion || !participant) return;

    const draftKey = `cid_draft_${participant.id}_${activeQuestion.id}_${language}`;
    const savedDraft = localStorage.getItem(draftKey);

    if (savedDraft) {
      setCode(savedDraft);
    } else {
      setCode(activeQuestion.starterTemplates[language] || '');
    }

    // Check if question already submitted
    const subKey = `cid_sub_${participant.id}_${activeQuestion.id}`;
    if (localStorage.getItem(subKey)) {
      setSubmittedQuestions((prev) => ({ ...prev, [activeQuestion.id]: true }));
    }
  }, [activeQuestion, language, participant]);

  // 4. Auto-save draft locally on code change
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (!activeQuestion || !participant) return;

    const draftKey = `cid_draft_${participant.id}_${activeQuestion.id}_${language}`;
    localStorage.setItem(draftKey, newCode);
    setSavedStatus(`Auto-saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
  };

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

  // 5. Submit solution
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
        setSubmissionFeedback(data.message || 'Solution successfully locked for evaluation.');
        setTimeout(() => setSubmissionFeedback(null), 5000);
      } else {
        alert(data.error || 'Submission failed');
      }
    } catch {
      alert('Network error while submitting. Please check connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Handle timer expiration
  const handleTimerExpired = () => {
    setIsContestOver(true);
    // Auto-submit current draft
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
        </div>

        {/* Right: Timer, Save status, and Action */}
        <div className="flex items-center gap-3">
          <span className="hidden lg:inline-block font-mono text-[11px] text-gray-400">
            {savedStatus}
          </span>

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
        </div>
      )}

      {/* Main Two-Panel Arena Layout */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Left Drawer: Problem Description & Multi-Question Tabs */}
        <div className="w-full lg:w-[450px] xl:w-[500px] flex flex-col border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#080d16] overflow-y-auto">
          {/* Question Switcher Tabs */}
          <div className="sticky top-0 z-10 flex border-b border-white/[0.08] bg-[#080d16] p-2 gap-1.5 overflow-x-auto">
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
                  className="rounded-xl border border-white/10 bg-[#0c121d] p-3 font-mono text-xs space-y-2"
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

        {/* Right Workspace: Blind Monaco Code Editor */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Editor Header: Language selector and Reset */}
          <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0a0f19] px-4 py-2">
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

            <div className="flex items-center gap-2">
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
    </div>
  );
}
