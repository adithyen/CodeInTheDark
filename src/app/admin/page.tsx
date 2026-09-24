'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Play, 
  Pause, 
  Plus, 
  RotateCcw, 
  Clock, 
  Megaphone, 
  Sparkles, 
  Users, 
  FileCode, 
  Download, 
  Trash2, 
  ExternalLink, 
  AlertTriangle,
  Code2,
  CheckCircle2,
  Eye,
  Lock
} from 'lucide-react';
import { Question, ContestState, Participant, Submission, Violation, TestCase } from '@/types';

export default function AdminPage() {
  const [passkey, setPasskey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  const [contest, setContest] = useState<ContestState | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'control' | 'questions' | 'participants' | 'submissions' | 'violations'>('control');

  // Control inputs
  const [announcementText, setAnnouncementText] = useState('');
  const [durationInput, setDurationInput] = useState('50');

  // LeetCode Importer state
  const [leetcodeSlug, setLeetcodeSlug] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<Partial<Question> | null>(null);

  // Manual Question Creator modal/form
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question>>({
    title: '',
    category: 'Algorithms',
    difficulty: 'Medium',
    points: 400,
    scenario: '',
    inputFormat: '',
    outputFormat: '',
    constraints: '',
    testCases: [],
  });

  // Code Inspector Modal
  const [inspectedSubmission, setInspectedSubmission] = useState<Submission | null>(null);

  // Check saved passkey on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('cid_admin_passkey');
    if (saved) {
      setPasskey(saved);
      verifyPasskey(saved);
    }
  }, []);

  const verifyPasskey = async (key: string) => {
    try {
      const res = await fetch(`/api/questions?admin=true&passkey=${encodeURIComponent(key)}`);
      if (res.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem('cid_admin_passkey', key);
        fetchAdminData(key);
      } else {
        setAuthError('Invalid Admin Passkey. Default: admin1111');
      }
    } catch {
      setAuthError('Connection error verifying admin');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    verifyPasskey(passkey);
  };

  const fetchAdminData = useCallback(async (key: string) => {
    try {
      const [contestRes, qRes, pRes, sRes, vRes] = await Promise.all([
        fetch('/api/contest'),
        fetch(`/api/questions?admin=true&passkey=${key}`),
        fetch(`/api/participants?passkey=${key}`),
        fetch(`/api/admin/submissions?passkey=${key}`),
        fetch(`/api/violations?passkey=${key}`),
      ]);

      if (contestRes.ok) {
        const cData = await contestRes.json();
        setContest(cData.contest);
      }
      if (qRes.ok) {
        const qData = await qRes.json();
        setQuestions(qData.questions || []);
      }
      if (pRes.ok) {
        const pData = await pRes.json();
        setParticipants(pData.participants || []);
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        setSubmissions(sData.submissions || []);
      }
      if (vRes.ok) {
        const vData = await vRes.json();
        setViolations(vData.violations || []);
      }
    } catch (err) {
      console.error('Failed fetching admin data:', err);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => fetchAdminData(passkey), 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, passkey, fetchAdminData]);

  // Contest Actions
  const handleContestAction = async (action: string, payload: any = {}) => {
    try {
      const res = await fetch('/api/contest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, passkey, ...payload }),
      });
      if (res.ok) {
        fetchAdminData(passkey);
      }
    } catch {
      alert('Contest action failed');
    }
  };

  // LeetCode Importer trigger
  const handleImportLeetCode = async () => {
    if (!leetcodeSlug.trim()) return;
    setImportLoading(true);
    try {
      const res = await fetch('/api/import-leetcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: leetcodeSlug.trim(), passkey }),
      });
      const data = await res.json();
      if (res.ok && data.question) {
        setImportResult(data.question);
        setEditingQuestion({
          ...data.question,
          starterTemplates: {
            c: `#include <stdio.h>\nint main() {\n    // Solution\n    return 0;\n}`,
            python: `import sys\ndef main():\n    # Solution\n    pass\nif __name__ == '__main__':\n    main()`,
            java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // Solution\n    }\n}`,
          },
        });
        setShowQuestionModal(true);
      } else {
        alert(data.error || 'Failed to import problem from LeetCode');
      }
    } catch {
      alert('Error fetching from LeetCode');
    } finally {
      setImportLoading(false);
    }
  };

  // Save manual question
  const handleSaveQuestion = async () => {
    if (!editingQuestion.title) {
      alert('Title is required');
      return;
    }

    try {
      const isEdit = !!editingQuestion.id;
      const res = await fetch('/api/questions', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey, question: editingQuestion }),
      });

      if (res.ok) {
        setShowQuestionModal(false);
        fetchAdminData(passkey);
      } else {
        alert('Failed saving question');
      }
    } catch {
      alert('Network error saving question');
    }
  };

  // Delete question
  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await fetch(`/api/questions?id=${id}&passkey=${passkey}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAdminData(passkey);
      }
    } catch {
      alert('Failed deleting question');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 bg-grid-cyber">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0c121d]/90 p-8 backdrop-blur-2xl shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-mono text-lg font-bold text-white">ADMIN COMMAND</h2>
              <p className="text-xs text-gray-400">11:11 Chapter 2 Organizer Portal</p>
            </div>
          </div>

          {authError && (
            <div className="mt-4 rounded-lg border border-red-500/40 bg-red-950/20 p-2.5 font-mono text-xs text-red-300">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block font-mono text-xs text-gray-400 mb-1">Master Organizer Passkey</label>
              <input
                type="password"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="Enter passkey (e.g. admin1111)"
                required
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 py-2.5 font-mono text-sm font-bold text-black shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-95"
            >
              Authenticate Center
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-[#06090e] p-4 sm:p-6 lg:p-8">
      {/* Admin Top Header */}
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-950/20 px-3 py-1 font-mono text-xs font-semibold text-amber-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            ADMIN COMMAND CENTER · 11:11 CHAPTER 2
          </div>
          <h1 className="mt-2 font-mono text-3xl font-extrabold text-white">
            Live Contest Operations
          </h1>
        </div>

        {/* Global Live Contest Pills */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 rounded-xl border px-3.5 py-1.5 font-mono text-xs ${
            contest?.isActive
              ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-400'
              : 'border-white/10 bg-white/5 text-gray-400'
          }`}>
            <span className={`h-2 w-2 rounded-full ${contest?.isActive ? 'bg-emerald-400 animate-ping' : 'bg-gray-500'}`} />
            <span>{contest?.isActive ? (contest.isPaused ? 'Contest Paused' : 'Contest Active') : 'Contest Standby'}</span>
          </div>

          <button
            onClick={() => handleContestAction('toggleReveal')}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 font-mono text-xs font-semibold transition-all ${
              contest?.isRevealMode
                ? 'border-amber-400 bg-amber-400 text-black shadow-lg shadow-amber-400/30'
                : 'border-white/15 bg-white/5 text-amber-300 hover:bg-white/10'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>{contest?.isRevealMode ? 'Stage Reveal Active' : 'Trigger Stage Reveal'}</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="mx-auto mt-6 flex w-full max-w-7xl border-b border-white/[0.08] gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('control')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-mono text-xs font-medium transition-all ${
            activeTab === 'control' ? 'border-amber-400 text-amber-400 font-bold' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Contest Controls</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-mono text-xs font-medium transition-all ${
            activeTab === 'questions' ? 'border-cyan-400 text-cyan-400 font-bold' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <FileCode className="h-4 w-4" />
          <span>Questions & LeetCode ({questions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('participants')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-mono text-xs font-medium transition-all ${
            activeTab === 'participants' ? 'border-emerald-400 text-emerald-400 font-bold' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Participants ({participants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('submissions')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-mono text-xs font-medium transition-all ${
            activeTab === 'submissions' ? 'border-indigo-400 text-indigo-400 font-bold' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Code2 className="h-4 w-4" />
          <span>Submissions & Code ({submissions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('violations')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 font-mono text-xs font-medium transition-all ${
            activeTab === 'violations' ? 'border-red-400 text-red-400 font-bold' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Anti-Cheat Log ({violations.length})</span>
        </button>
      </div>

      {/* Main Tab Panels */}
      <div className="mx-auto mt-6 w-full max-w-7xl flex-1">
        {/* TAB 1: CONTEST CONTROLS */}
        {activeTab === 'control' && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contest Timer & State Card */}
            <div className="rounded-2xl border border-white/10 bg-[#0a0f18] p-6 backdrop-blur-xl">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-amber-400">
                1. Contest Timer & State
              </h3>

              <div className="mt-4 flex flex-wrap gap-3">
                {!contest?.isActive ? (
                  <button
                    onClick={() => handleContestAction('start')}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 font-mono text-sm font-bold text-black shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95"
                  >
                    <Play className="h-4 w-4 fill-black" />
                    <span>Start 50-Min Contest</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleContestAction('pause')}
                      className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-2.5 font-mono text-xs font-semibold text-amber-300 hover:bg-amber-900/40"
                    >
                      <Pause className="h-4 w-4" />
                      <span>{contest.isPaused ? 'Resume Contest' : 'Pause Contest'}</span>
                    </button>

                    <button
                      onClick={() => handleContestAction('extend', { extraMinutes: 1 })}
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-gray-300 hover:bg-white/10"
                    >
                      <span>+1 Min</span>
                    </button>

                    <button
                      onClick={() => handleContestAction('extend', { extraMinutes: 5 })}
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-gray-300 hover:bg-white/10"
                    >
                      <span>+5 Mins</span>
                    </button>

                    <button
                      onClick={() => handleContestAction('stop')}
                      className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-2.5 font-mono text-xs font-semibold text-red-300 hover:bg-red-900/40"
                    >
                      <span>Stop Contest</span>
                    </button>
                  </>
                )}
              </div>

              <div className="mt-6 border-t border-white/[0.08] pt-4">
                <label className="block font-mono text-xs text-gray-400 mb-1">Set Default Duration (Minutes)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={durationInput}
                    onChange={(e) => setDurationInput(e.target.value)}
                    className="w-24 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-xs text-white"
                  />
                  <button
                    onClick={() => handleContestAction('setDuration', { durationMinutes: Number(durationInput) })}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-gray-300 hover:bg-white/10"
                  >
                    Save Duration
                  </button>
                </div>
              </div>
            </div>

            {/* Stage Broadcast Card */}
            <div className="rounded-2xl border border-white/10 bg-[#0a0f18] p-6 backdrop-blur-xl">
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-cyan-400">
                2. Live Flash Broadcast
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                Send an immediate announcement across all contestant terminals.
              </p>

              <div className="mt-4 space-y-3">
                <textarea
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="e.g. 'ATTENTION: 10 minutes left! Make sure to save your solution drafts.'"
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                />

                <div className="flex justify-between items-center">
                  <button
                    onClick={() => handleContestAction('announcement', { announcement: announcementText })}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 font-mono text-xs font-bold text-black hover:brightness-110"
                  >
                    <Megaphone className="h-4 w-4" />
                    <span>Broadcast Message</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to RESET all submissions and contest timers?')) {
                        handleContestAction('reset');
                      }
                    }}
                    className="flex items-center gap-1.5 font-mono text-xs text-red-400 hover:text-red-300"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset Contest Data</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUESTIONS & LEETCODE IMPORTER */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            {/* LeetCode Fast Importer Card */}
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 to-[#0a0f18] p-6 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-mono text-sm font-bold text-cyan-300 flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <span>LeetCode Problem Importer</span>
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">
                    Input a LeetCode problem slug (e.g. <code className="text-cyan-300">two-sum</code>, <code className="text-cyan-300">valid-parentheses</code>, <code className="text-cyan-300">maximum-subarray</code>) or full URL.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={leetcodeSlug}
                    onChange={(e) => setLeetcodeSlug(e.target.value)}
                    placeholder="e.g. two-sum"
                    className="w-48 sm:w-64 rounded-xl border border-white/10 bg-black/50 px-3 py-2 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                  />
                  <button
                    onClick={handleImportLeetCode}
                    disabled={importLoading}
                    className="rounded-xl bg-cyan-500 px-4 py-2 font-mono text-xs font-bold text-black hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {importLoading ? 'Importing...' : 'Fetch'}
                  </button>
                </div>
              </div>
            </div>

            {/* Questions Header & Add Button */}
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-lg font-bold text-white">Active Contest Questions</h3>
              <button
                onClick={() => {
                  setEditingQuestion({
                    title: '',
                    category: 'Algorithms',
                    difficulty: 'Medium',
                    points: 400,
                    scenario: '',
                    inputFormat: '',
                    outputFormat: '',
                    constraints: '',
                    starterTemplates: {
                      c: `#include <stdio.h>\nint main() {\n    return 0;\n}`,
                      python: `import sys\ndef main():\n    pass\nif __name__ == '__main__':\n    main()`,
                      java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n    }\n}`,
                    },
                    testCases: [
                      { id: 'tc-1', input: 'sample_input', expectedOutput: 'sample_output', isHidden: false },
                      { id: 'tc-2', input: 'hidden_input', expectedOutput: 'hidden_output', isHidden: true },
                    ],
                  });
                  setShowQuestionModal(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 font-mono text-xs font-bold text-black hover:brightness-110 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Create Scenario Question</span>
              </button>
            </div>

            {/* Questions List */}
            <div className="grid gap-4 md:grid-cols-2">
              {questions.map((q, idx) => (
                <div key={q.id} className="rounded-2xl border border-white/10 bg-[#0a0f18] p-5 backdrop-blur-xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-emerald-400">Q{idx + 1}</span>
                        <span className="rounded bg-white/10 px-2 py-0.2 font-mono text-[10px] text-gray-300">
                          {q.difficulty}
                        </span>
                        <span className="font-mono text-xs text-amber-300 font-semibold">{q.points} pts</span>
                      </div>
                      <h4 className="mt-1 font-mono text-base font-bold text-white">{q.title}</h4>
                      <p className="font-mono text-xs text-gray-500">{q.category}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingQuestion(q);
                          setShowQuestionModal(true);
                        }}
                        className="rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
                        title="Edit question"
                      >
                        <FileCode className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="rounded p-1.5 text-red-400 hover:bg-red-950/40"
                        title="Delete question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="line-clamp-2 text-xs text-gray-400">{q.scenario}</p>

                  <div className="border-t border-white/[0.08] pt-2 flex items-center justify-between font-mono text-xs text-gray-500">
                    <span>{q.testCases.length} Test Cases ({q.testCases.filter(t => t.isHidden).length} Hidden)</span>
                    <span className="text-cyan-400">C, Python, Java Ready</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PARTICIPANTS MONITOR */}
        {activeTab === 'participants' && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f18] backdrop-blur-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-black/40 font-mono text-xs text-gray-400 uppercase">
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Terminal</th>
                  <th className="py-3 px-4">Active Language</th>
                  <th className="py-3 px-4">Strikes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] font-mono text-xs">
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No participants registered yet.
                    </td>
                  </tr>
                ) : (
                  participants.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.03]">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{p.name}</div>
                        <div className="text-[11px] text-gray-400">{p.rollNumber}</div>
                      </td>
                      <td className="py-3 px-4 text-cyan-300">{p.terminalId}</td>
                      <td className="py-3 px-4 uppercase text-gray-300">{p.activeLanguage || 'Not Started'}</td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${p.strikes >= 3 ? 'text-red-400' : p.strikes > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                          {p.strikes} / 3
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {p.isLockedOut ? (
                          <span className="rounded bg-red-950/60 border border-red-500/40 px-2 py-0.5 text-[10px] text-red-300">
                            Locked Out
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 text-[10px] text-emerald-300">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {new Date(p.lastActiveAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: SUBMISSIONS & CODE INSPECTOR */}
        {activeTab === 'submissions' && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f18] backdrop-blur-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-black/40 font-mono text-xs text-gray-400 uppercase">
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Question</th>
                  <th className="py-3 px-4">Lang</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Test Cases</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] font-mono text-xs">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No submissions received yet.
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-white/[0.03]">
                      <td className="py-3 px-4 font-bold text-white">
                        {sub.participantName} <span className="text-gray-400 font-normal">({sub.participantRoll})</span>
                      </td>
                      <td className="py-3 px-4 text-cyan-300">{sub.questionTitle}</td>
                      <td className="py-3 px-4 uppercase text-gray-300">{sub.language}</td>
                      <td className="py-3 px-4 font-bold text-emerald-400">{sub.score} pts</td>
                      <td className="py-3 px-4">
                        <span className={sub.testCasesPassed === sub.totalTestCases ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                          {sub.testCasesPassed} / {sub.totalTestCases} Passed
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {new Date(sub.submittedAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setInspectedSubmission(sub)}
                          className="flex items-center gap-1 rounded bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-gray-300 hover:bg-white/10 hover:text-white"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Code</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: ANTI-CHEAT VIOLATIONS AUDIT */}
        {activeTab === 'violations' && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f18] backdrop-blur-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-black/40 font-mono text-xs text-gray-400 uppercase">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Violation Type</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Strike Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] font-mono text-xs">
                {violations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      Zero anti-cheat violations recorded. Pure integrity!
                    </td>
                  </tr>
                ) : (
                  violations.map((v) => (
                    <tr key={v.id} className="hover:bg-white/[0.03]">
                      <td className="py-3 px-4 text-gray-400">
                        {new Date(v.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">{v.participantName}</td>
                      <td className="py-3 px-4">
                        <span className="rounded bg-red-950/40 border border-red-500/30 px-2 py-0.5 text-[10px] text-red-300 font-bold uppercase">
                          {v.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{v.details}</td>
                      <td className="py-3 px-4 text-red-400 font-bold">{v.strikeCount} / 3</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Code Inspector Drawer/Modal */}
      {inspectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-md">
          <div className="max-w-3xl w-full rounded-2xl border border-white/15 bg-[#0a0f19] p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="font-mono text-lg font-bold text-white">
                  Submission Code Inspector
                </h3>
                <p className="text-xs text-gray-400">
                  {inspectedSubmission.participantName} ({inspectedSubmission.participantRoll}) · {inspectedSubmission.questionTitle} ({inspectedSubmission.language.toUpperCase()})
                </p>
              </div>
              <div className="text-right">
                <span className="font-mono text-emerald-400 font-bold text-base">{inspectedSubmission.score} pts</span>
                <div className="font-mono text-xs text-gray-400">{inspectedSubmission.testCasesPassed} / {inspectedSubmission.totalTestCases} Test Cases</div>
              </div>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto">
              <pre className="rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-emerald-300 whitespace-pre-wrap overflow-x-auto">
                {inspectedSubmission.code}
              </pre>

              {/* Test Case Inspection Breakdown */}
              <div className="mt-4 space-y-2">
                <h4 className="font-mono text-xs font-bold text-gray-400 uppercase">Test Case Breakdown</h4>
                <div className="grid gap-2">
                  {inspectedSubmission.testCaseDetails?.map((tc, idx) => (
                    <div
                      key={tc.testCaseId || idx}
                      className={`rounded-lg border p-2.5 font-mono text-xs flex items-center justify-between ${
                        tc.passed
                          ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                          : 'border-red-500/30 bg-red-950/20 text-red-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold">Case {idx + 1} {tc.isHidden && '(Hidden)'}:</span>
                        <span>{tc.passed ? 'PASSED' : 'FAILED'}</span>
                      </div>
                      {tc.error && <span className="text-[11px] text-red-400">{tc.error}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-white/[0.08] pt-3 text-right">
              <button
                onClick={() => setInspectedSubmission(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-mono text-xs text-gray-300 hover:bg-white/10 hover:text-white"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Scenario Question Editor Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-md overflow-y-auto">
          <div className="max-w-2xl w-full rounded-2xl border border-white/15 bg-[#0a0f19] p-6 shadow-2xl space-y-4 my-8">
            <h3 className="font-mono text-lg font-bold text-white">
              {editingQuestion.id ? 'Edit Challenge Question' : 'Create Real-World Scenario Question'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-xs text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  value={editingQuestion.title || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, title: e.target.value })}
                  placeholder="e.g. Drone Payload Balancer"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-xs text-white"
                />
              </div>

              <div>
                <label className="block font-mono text-xs text-gray-400 mb-1">Points</label>
                <input
                  type="number"
                  value={editingQuestion.points || 400}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, points: Number(e.target.value) })}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-xs text-gray-400 mb-1">Difficulty</label>
                <select
                  value={editingQuestion.difficulty || 'Medium'}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as any })}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-xs text-white"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-xs text-gray-400 mb-1">Category</label>
                <input
                  type="text"
                  value={editingQuestion.category || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, category: e.target.value })}
                  placeholder="e.g. Dynamic Programming"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-xs text-gray-400 mb-1">Scenario Narrative</label>
              <textarea
                value={editingQuestion.scenario || ''}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, scenario: e.target.value })}
                rows={4}
                placeholder="Describe the real-life engineering problem..."
                className="w-full rounded-lg border border-white/10 bg-black/40 p-2.5 font-sans text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-xs text-gray-400 mb-1">Input Format</label>
                <textarea
                  value={editingQuestion.inputFormat || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, inputFormat: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-white/10 bg-black/40 p-2 font-mono text-xs text-white"
                />
              </div>
              <div>
                <label className="block font-mono text-xs text-gray-400 mb-1">Output Format</label>
                <textarea
                  value={editingQuestion.outputFormat || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, outputFormat: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-white/10 bg-black/40 p-2 font-mono text-xs text-white"
                />
              </div>
            </div>

            {/* Test Cases Studio */}
            <div className="space-y-2 border-t border-white/[0.08] pt-3">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs font-bold text-cyan-400">
                  Test Cases ({editingQuestion.testCases?.length || 0})
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const current = editingQuestion.testCases || [];
                    setEditingQuestion({
                      ...editingQuestion,
                      testCases: [
                        ...current,
                        {
                          id: `tc-${Date.now()}`,
                          input: '',
                          expectedOutput: '',
                          isHidden: current.length >= 2,
                        },
                      ],
                    });
                  }}
                  className="rounded bg-white/5 border border-white/10 px-2 py-0.5 font-mono text-[11px] text-cyan-300 hover:bg-white/10"
                >
                  + Add Test Case
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {(editingQuestion.testCases || []).map((tc, idx) => (
                  <div key={tc.id || idx} className="rounded-lg border border-white/10 bg-black/40 p-2 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-gray-400 font-bold">Case #{idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 font-mono text-[11px] text-gray-400">
                          <input
                            type="checkbox"
                            checked={tc.isHidden}
                            onChange={(e) => {
                              const updated = [...(editingQuestion.testCases || [])];
                              updated[idx].isHidden = e.target.checked;
                              setEditingQuestion({ ...editingQuestion, testCases: updated });
                            }}
                          />
                          Hidden Case
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (editingQuestion.testCases || []).filter((_, i) => i !== idx);
                            setEditingQuestion({ ...editingQuestion, testCases: updated });
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <textarea
                        value={tc.input}
                        onChange={(e) => {
                          const updated = [...(editingQuestion.testCases || [])];
                          updated[idx].input = e.target.value;
                          setEditingQuestion({ ...editingQuestion, testCases: updated });
                        }}
                        placeholder="Stdin input..."
                        rows={2}
                        className="w-full rounded border border-white/10 bg-black/60 p-1.5 font-mono text-[11px] text-emerald-300"
                      />
                      <textarea
                        value={tc.expectedOutput}
                        onChange={(e) => {
                          const updated = [...(editingQuestion.testCases || [])];
                          updated[idx].expectedOutput = e.target.value;
                          setEditingQuestion({ ...editingQuestion, testCases: updated });
                        }}
                        placeholder="Expected stdout..."
                        rows={2}
                        className="w-full rounded border border-white/10 bg-black/60 p-1.5 font-mono text-[11px] text-cyan-300"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setShowQuestionModal(false)}
                className="rounded-xl border border-white/10 px-4 py-2 font-mono text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuestion}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 font-mono text-xs font-bold text-black hover:brightness-110 active:scale-95"
              >
                Save Challenge Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
