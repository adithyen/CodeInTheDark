'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  ShieldCheck, Play, Pause, Plus, RotateCcw, Clock, Megaphone, Sparkles,
  Users, FileCode, Download, Trash2, ExternalLink, AlertTriangle, Code2,
  CheckCircle2, Eye, Lock, GitCompare, FileSpreadsheet, Layers, Upload,
  RefreshCw, ShieldAlert, Undo2, Search, ChevronDown, PlusCircle,
  Calendar, History, BarChart3, Settings, Radio, Zap, StopCircle,
  Timer, Send, X, Copy, Check, Loader2,
} from 'lucide-react';
import { Question, ContestSession, ContestPhase, Participant, Submission, Violation, TestCase } from '@/types';
import { calculateCodeSimilarity, SimilarityResult } from '@/lib/plagiarism';
import { ROUND_PRESETS, RoundPreset } from '@/lib/presets';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<ContestPhase, string> = {
  setup: 'Setup',
  registration: 'Registration Open',
  active: 'Active',
  paused: 'Paused',
  ended: 'Ended',
  reveal: 'Stage Reveal',
};

const PHASE_COLORS: Record<ContestPhase, string> = {
  setup:        'text-gray-400 border-gray-500/40 bg-gray-900/40',
  registration: 'text-amber-300 border-amber-500/40 bg-amber-950/30',
  active:       'text-emerald-300 border-emerald-500/40 bg-emerald-950/30',
  paused:       'text-amber-400 border-amber-400/50 bg-amber-950/40',
  ended:        'text-gray-400 border-gray-600/40 bg-gray-900/30',
  reveal:       'text-purple-300 border-purple-500/40 bg-purple-950/30',
};

function PhaseBadge({ phase }: { phase: ContestPhase }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold ${PHASE_COLORS[phase]}`}>
      {(phase === 'active') && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />}
      {(phase === 'registration') && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />}
      {PHASE_LABELS[phase]}
    </span>
  );
}

function fmtCountdown(ms: number) {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Admin Component
// ──────────────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [passkey, setPasskey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  // Sessions
  const [sessions, setSessions] = useState<ContestSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ContestSession | null>(null);
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null); // Which session is shown in tabs

  // New Session Modal
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [newSessionLabel, setNewSessionLabel] = useState('');
  const [newSessionNotes, setNewSessionNotes] = useState('');
  const [newSessionScheduled, setNewSessionScheduled] = useState('');
  const [newSessionCopyFrom, setNewSessionCopyFrom] = useState<string | null>(null);
  const [newSessionCreating, setNewSessionCreating] = useState(false);

  // Per-session data
  const [questions, setQuestions] = useState<Question[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);

  // Active tab
  const [activeTab, setActiveTab] = useState<'setup' | 'registration' | 'live' | 'participants' | 'submissions' | 'history' | 'plagiarism'>('setup');

  // Control inputs
  const [announcementText, setAnnouncementText] = useState('');
  const [regDurationMin, setRegDurationMin] = useState(3);
  const [autoStartReg, setAutoStartReg] = useState(true);
  const [challengeDurationMin, setChallengeDurationMin] = useState(50);
  const [maxParticipants, setMaxParticipants] = useState(200);

  // Countdown ticks
  const [regCountdown, setRegCountdown] = useState('');
  const [challengeCountdown, setChallengeCountdown] = useState('');
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  // Questions editor
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question>>({});
  const [showImportJsonModal, setShowImportJsonModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [leetcodeSlug, setLeetcodeSlug] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  // Submissions inspector
  const [inspectedSubmission, setInspectedSubmission] = useState<Submission | null>(null);
  const [rejudging, setRejudging] = useState<string | null>(null);

  // Plagiarism
  const [plagQuestionId, setPlagQuestionId] = useState('');
  const [suspectPairs, setSuspectPairs] = useState<{ subA: Submission; subB: Submission; similarity: SimilarityResult }[]>([]);

  // Session selector dropdown
  const [selectorOpen, setSelectorOpen] = useState(false);

  const viewingSession = sessions.find(s => s.id === viewingSessionId) ?? currentSession;

  // ────────────────────────────────────────────────────────────────────────────
  // Auth
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = sessionStorage.getItem('cid_admin_passkey');
    if (saved) { setPasskey(saved); verifyPasskey(saved); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyPasskey = async (key: string) => {
    try {
      const res = await fetch(`/api/questions?admin=true&passkey=${encodeURIComponent(key)}`);
      if (res.ok) {
        setIsAuthenticated(true);
        sessionStorage.setItem('cid_admin_passkey', key);
        fetchAllData(key);
      } else {
        setAuthError('Invalid Admin Passkey');
      }
    } catch { setAuthError('Connection error'); }
  };

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); setAuthError(''); verifyPasskey(passkey); };

  // ────────────────────────────────────────────────────────────────────────────
  // Data fetching
  // ────────────────────────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async (key: string, sid?: string | null) => {
    try {
      // 1. Get all sessions
      const sessRes = await fetch('/api/contest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getSessions', passkey: key }) });
      let liveSessions: ContestSession[] = [];
      if (sessRes.ok) {
        const d = await sessRes.json();
        liveSessions = d.sessions ?? [];
        setSessions(liveSessions);
      }

      // 2. Get current active session
      const contestRes = await fetch('/api/contest');
      let activeSession: ContestSession | null = null;
      if (contestRes.ok) {
        const d = await contestRes.json();
        activeSession = d.session;
        setCurrentSession(d.session);
        setServerTimeOffset((d.serverTime ?? Date.now()) - Date.now());
        if (!viewingSessionId && d.session?.id) setViewingSessionId(d.session.id);
      }

      // 3. Session-scoped data for the viewed session
      const targetId = sid ?? viewingSessionId ?? activeSession?.id;
      if (!targetId) return;

      const [qRes, pRes, sRes, vRes] = await Promise.all([
        fetch(`/api/questions?admin=true&passkey=${key}&sessionId=${targetId}`),
        fetch(`/api/participants?passkey=${key}&sessionId=${targetId}`),
        fetch(`/api/admin/submissions?passkey=${key}&sessionId=${targetId}`),
        fetch(`/api/violations?passkey=${key}&sessionId=${targetId}`),
      ]);

      if (qRes.ok) setQuestions((await qRes.json()).questions ?? []);
      if (pRes.ok) setParticipants((await pRes.json()).participants ?? []);
      if (sRes.ok) setSubmissions((await sRes.json()).submissions ?? []);
      if (vRes.ok) setViolations((await vRes.json()).violations ?? []);
    } catch (err) {
      console.error('Admin data fetch error:', err);
    }
  }, [viewingSessionId]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => fetchAllData(passkey), 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, passkey, fetchAllData]);

  // Refetch when viewed session changes
  useEffect(() => {
    if (isAuthenticated && viewingSessionId) fetchAllData(passkey, viewingSessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingSessionId]);

  // ────────────────────────────────────────────────────────────────────────────
  // Countdown tickers
  // ────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = Date.now() + serverTimeOffset;
      if (currentSession?.phase === 'registration' && currentSession.registration_ends_at) {
        setRegCountdown(fmtCountdown(currentSession.registration_ends_at - now));
      }
      if ((currentSession?.phase === 'active' || currentSession?.phase === 'paused') && currentSession.challenge_ends_at) {
        setChallengeCountdown(fmtCountdown(currentSession.challenge_ends_at - now));
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [currentSession, serverTimeOffset]);

  // ────────────────────────────────────────────────────────────────────────────
  // Contest actions (on the current active session)
  // ────────────────────────────────────────────────────────────────────────────
  const contestAction = async (action: string, extra: any = {}) => {
    const sessionId = currentSession?.id;
    if (!sessionId && action !== 'createSession' && action !== 'getSessions') return;
    try {
      const res = await fetch('/api/contest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, passkey, sessionId, ...extra }),
      });
      if (res.ok) await fetchAllData(passkey);
      else {
        const d = await res.json();
        alert(d.error || 'Action failed');
      }
    } catch { alert('Network error'); }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // New session creation
  // ────────────────────────────────────────────────────────────────────────────
  const handleCreateSession = async () => {
    if (!newSessionLabel.trim()) return alert('Session label is required');
    setNewSessionCreating(true);
    try {
      const res = await fetch('/api/contest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createSession',
          passkey,
          label: newSessionLabel.trim(),
          notes: newSessionNotes.trim(),
          scheduledAt: newSessionScheduled || undefined,
          copyFromSessionId: newSessionCopyFrom || undefined,
        }),
      });
      const d = await res.json();
      if (res.ok && d.session) {
        setShowNewSessionModal(false);
        setNewSessionLabel(''); setNewSessionNotes(''); setNewSessionScheduled(''); setNewSessionCopyFrom(null);
        await fetchAllData(passkey, d.session.id);
        setViewingSessionId(d.session.id);
        setActiveTab('setup');
      } else {
        alert(d.error || 'Failed to create session');
      }
    } catch { alert('Network error'); }
    setNewSessionCreating(false);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Question actions
  // ────────────────────────────────────────────────────────────────────────────
  const handleSaveQuestion = async () => {
    if (!editingQuestion.title) return alert('Title is required');
    const targetId = viewingSessionId ?? currentSession?.id;
    if (!targetId) return alert('No session selected');
    try {
      const res = await fetch('/api/questions', {
        method: editingQuestion.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey, question: editingQuestion, sessionId: targetId }),
      });
      if (res.ok) { setShowQuestionModal(false); fetchAllData(passkey); }
      else alert('Failed saving question');
    } catch { alert('Network error'); }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      const res = await fetch(`/api/questions?id=${id}&passkey=${passkey}`, { method: 'DELETE' });
      if (res.ok) fetchAllData(passkey);
    } catch { alert('Failed deleting question'); }
  };

  const handleImportQuestionsJSON = async () => {
    const targetId = viewingSessionId ?? currentSession?.id;
    if (!targetId) return alert('No session selected');
    try {
      const parsed = JSON.parse(importJsonText);
      const qList = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(qList) || qList.length === 0) return alert('Invalid format');
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey, action: 'bulk_import', questions: qList, sessionId: targetId }),
      });
      if (res.ok) {
        alert(`Imported ${qList.length} questions!`);
        setShowImportJsonModal(false); setImportJsonText(''); fetchAllData(passkey);
      } else alert('Import failed');
    } catch (err: any) { alert(`JSON error: ${err.message}`); }
  };

  const handleLoadPreset = async (preset: RoundPreset) => {
    const targetId = viewingSessionId ?? currentSession?.id;
    if (!targetId) return alert('No session selected');
    if (!confirm(`Load "${preset.name}"? This replaces all current questions.`)) return;
    const res = await fetch('/api/questions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passkey, action: 'bulk_import', questions: preset.questions, sessionId: targetId }),
    });
    if (res.ok) { alert(`Loaded ${preset.name}!`); fetchAllData(passkey); }
    else alert('Failed loading preset');
  };

  const handleImportLeetCode = async () => {
    if (!leetcodeSlug.trim()) return;
    setImportLoading(true);
    try {
      const res = await fetch('/api/import-leetcode', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: leetcodeSlug.trim(), passkey }),
      });
      const data = await res.json();
      if (res.ok && data.question) {
        setEditingQuestion({
          ...data.question,
          starterTemplates: {
            c: `#include <stdio.h>\nint main() {\n    // Solution\n    return 0;\n}`,
            python: `import sys\ndef main():\n    # Solution\n    pass\nif __name__ == '__main__':\n    main()`,
            java: `import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // Solution\n    }\n}`,
          },
        });
        setShowQuestionModal(true);
      } else alert(data.error || 'Import failed');
    } catch { alert('Error fetching from LeetCode'); }
    setImportLoading(false);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Participant actions
  // ────────────────────────────────────────────────────────────────────────────
  const participantAction = async (participantId: string, action: string) => {
    try {
      const res = await fetch('/api/participants', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey, participantId, action }),
      });
      if (res.ok) fetchAllData(passkey);
      else { const d = await res.json(); alert(d.error || 'Action failed'); }
    } catch { alert('Network error'); }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Submission re-judge
  // ────────────────────────────────────────────────────────────────────────────
  const handleRejudge = async (submissionId: string) => {
    const targetId = viewingSessionId ?? currentSession?.id;
    if (!targetId) return;
    setRejudging(submissionId);
    try {
      const res = await fetch('/api/admin/submissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey, submissionId, sessionId: targetId }),
      });
      const d = await res.json();
      if (res.ok) { alert(`Re-judged: ${d.testCasesPassed}/${d.totalTestCases} passed. Score: ${d.score}`); fetchAllData(passkey); }
      else alert(d.error || 'Re-judge failed');
    } catch { alert('Error re-judging'); }
    setRejudging(null);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Export helpers
  // ────────────────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!participants.length) return alert('No participants');
    const headers = ['Roll Number', 'Name', 'Terminal ID', 'Total Score', 'Questions Solved', 'Strikes', 'Status', 'Registered At'];
    const rows = participants.map((p) => {
      const userSubs = submissions.filter(s => s.participantId === p.id);
      const totalScore = userSubs.reduce((a, s) => a + (s.score || 0), 0);
      const solved = userSubs.filter(s => s.testCasesPassed === s.totalTestCases).length;
      return [`"${p.rollNumber}"`, `"${p.name}"`, `"${p.terminalId}"`, totalScore, solved, p.strikes, p.isLockedOut ? 'LOCKED' : 'ACTIVE', `"${new Date(p.registeredAt).toLocaleString()}"`].join(',');
    });
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const a = document.createElement('a'); a.href = encodeURI(csv); a.download = `CodeInTheDark_${viewingSession?.label}_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const exportAuditJSON = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), session: viewingSession, questions, participants, submissions, violations }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Audit_${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href);
  };

  const exportQuestionsJSON = () => {
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Questions_${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Plagiarism
  // ────────────────────────────────────────────────────────────────────────────
  const scanPlagiarism = (questionId: string) => {
    const subs = submissions.filter(s => s.questionId === questionId);
    if (subs.length < 2) return alert('Need at least 2 submissions');
    const pairs: any[] = [];
    for (let i = 0; i < subs.length; i++) {
      for (let j = i + 1; j < subs.length; j++) {
        if (subs[i].participantId === subs[j].participantId) continue;
        pairs.push({ subA: subs[i], subB: subs[j], similarity: calculateCodeSimilarity(subs[i].code, subs[j].code) });
      }
    }
    pairs.sort((a, b) => b.similarity.similarityScore - a.similarity.similarityScore);
    setSuspectPairs(pairs);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // LOGIN GATE
  // ────────────────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 bg-grid-cyber">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0c121d]/90 p-8 backdrop-blur-2xl shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400"><Lock className="h-5 w-5" /></div>
            <div><h2 className="font-mono text-lg font-bold text-white">ADMIN COMMAND</h2><p className="text-xs text-gray-400">11:11 Chapter 2 Organizer Portal</p></div>
          </div>
          {authError && <div className="mt-4 rounded-lg border border-red-500/40 bg-red-950/20 p-2.5 font-mono text-xs text-red-300">{authError}</div>}
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block font-mono text-xs text-gray-400 mb-1">Master Organizer Passkey</label>
              <input type="password" value={passkey} onChange={(e) => setPasskey(e.target.value)} placeholder="admin1111" required className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white focus:border-amber-500 focus:outline-none" />
            </div>
            <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 py-2.5 font-mono text-sm font-bold text-black hover:brightness-110">Authenticate Command Center</button>
          </form>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MAIN ADMIN LAYOUT
  // ────────────────────────────────────────────────────────────────────────────
  const phase = currentSession?.phase ?? 'setup';
  const isLive = phase === 'active' || phase === 'paused';

  return (
    <div className="flex flex-1 flex-col bg-[#06090e]">
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#08090e]/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
            </div>
            <span className="font-mono text-sm font-bold text-white hidden sm:inline">ADMIN COMMAND CENTER</span>
          </div>

          {/* Session Selector */}
          <div className="relative flex-1 max-w-xs">
            <button
              onClick={() => setSelectorOpen(o => !o)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-white hover:border-white/20 transition-all"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="truncate">{viewingSession?.label ?? 'No Session'}</span>
                {viewingSession && <PhaseBadge phase={viewingSession.phase} />}
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform ${selectorOpen ? 'rotate-180' : ''}`} />
            </button>

            {selectorOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 w-full min-w-[280px] rounded-xl border border-white/10 bg-[#0c121d] shadow-2xl overflow-hidden">
                <div className="py-1">
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setViewingSessionId(s.id); setSelectorOpen(false); }}
                      className={`flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-white/5 ${viewingSessionId === s.id ? 'bg-white/5' : ''}`}
                    >
                      <div>
                        <div className="font-mono text-xs font-semibold text-white">{s.label}</div>
                        {s.scheduled_at && (
                          <div className="font-mono text-[10px] text-gray-500">
                            {new Date(s.scheduled_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <PhaseBadge phase={s.phase} />
                    </button>
                  ))}
                  <div className="border-t border-white/[0.08] p-1.5">
                    <button
                      onClick={() => { setShowNewSessionModal(true); setSelectorOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 font-mono text-xs text-emerald-400 hover:bg-emerald-950/30"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      New Contest Session
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-2">
            {currentSession && <PhaseBadge phase={currentSession.phase} />}
            {isLive && (
              <button
                onClick={() => contestAction('toggleReveal')}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-[11px] font-semibold transition-all ${currentSession?.is_reveal_mode ? 'border-purple-400 bg-purple-400 text-black shadow-lg shadow-purple-400/30' : 'border-white/15 bg-white/5 text-purple-300 hover:bg-white/10'}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {currentSession?.is_reveal_mode ? 'Reveal Active' : 'Stage Reveal'}
              </button>
            )}
            <button onClick={() => fetchAllData(passkey)} className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-gray-400 hover:text-white" title="Refresh data">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto flex w-full max-w-7xl overflow-x-auto border-t border-white/[0.06] px-4 sm:px-6">
          {(([
            { id: 'setup',        icon: Settings,      label: 'Challenge Setup',     color: 'amber',   badge: '' },
            { id: 'registration', icon: Radio,          label: 'Registration',        color: 'orange',  badge: '' },
            { id: 'live',         icon: Zap,            label: 'Live Controls',       color: 'emerald', badge: isLive ? '●' : '' },
            { id: 'participants', icon: Users,          label: `Participants (${participants.length})`, color: 'cyan',    badge: '' },
            { id: 'submissions',  icon: Code2,          label: `Submissions (${submissions.length})`,  color: 'indigo',  badge: '' },
            { id: 'history',      icon: History,        label: 'History',             color: 'violet',  badge: '' },
            { id: 'plagiarism',   icon: GitCompare,     label: 'Plagiarism',          color: 'red',     badge: '' },
          ] as Array<{ id: typeof activeTab; icon: React.ComponentType<{className?: string}>; label: string; color: string; badge: string }>)).map(({ id, icon: Icon, label, color, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 font-mono text-xs font-medium transition-all ${
                activeTab === id
                  ? `border-${color}-400 text-${color}-400 font-bold`
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
              {badge && <span className="animate-pulse text-emerald-400">{badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 1: CHALLENGE SETUP
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'setup' && (
          <div className="space-y-6">
            {/* Session config card */}
            <div className="rounded-2xl border border-white/10 bg-[#0a0f18] p-6">
              <h3 className="font-mono text-sm font-bold text-amber-400 flex items-center gap-2">
                <Settings className="h-4 w-4" /> Session Configuration
                {viewingSession && <PhaseBadge phase={viewingSession.phase} />}
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block font-mono text-xs text-gray-400 mb-1">Challenge Duration (min)</label>
                  <div className="flex gap-2">
                    <input type="number" value={challengeDurationMin} onChange={e => setChallengeDurationMin(+e.target.value)} min={1} max={180}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-xs text-white focus:border-amber-500 focus:outline-none" />
                    <button onClick={() => contestAction('updateConfig', { durationMinutes: challengeDurationMin })}
                      className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 font-mono text-xs text-amber-300 hover:bg-amber-500/30">Save</button>
                  </div>
                </div>
                <div>
                  <label className="block font-mono text-xs text-gray-400 mb-1">Max Participants</label>
                  <div className="flex gap-2">
                    <input type="number" value={maxParticipants} onChange={e => setMaxParticipants(+e.target.value)} min={1}
                      className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-xs text-white focus:border-amber-500 focus:outline-none" />
                    <button onClick={() => contestAction('updateConfig', { maxParticipants })}
                      className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 font-mono text-xs text-amber-300 hover:bg-amber-500/30">Save</button>
                  </div>
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-gray-400">Allow Late Join</span>
                    <button
                      onClick={() => contestAction('updateConfig', { allowLateJoin: !currentSession?.allow_late_join })}
                      className={`relative h-5 w-9 rounded-full transition-colors ${currentSession?.allow_late_join ? 'bg-emerald-500' : 'bg-gray-700'}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${currentSession?.allow_late_join ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Round Presets */}
            <div className="rounded-2xl border border-white/10 bg-[#0a0f18] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-mono text-sm font-bold text-amber-400 flex items-center gap-2"><Layers className="h-4 w-4" /> Round Presets</h3>
                  <p className="mt-1 text-xs text-gray-400">1-click load problem sets or import custom JSON</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={exportQuestionsJSON} className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 font-mono text-xs text-gray-300 hover:bg-white/10">
                    <Download className="h-3.5 w-3.5" /> Export JSON
                  </button>
                  <button onClick={() => setShowImportJsonModal(true)} className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/30 px-3 py-2 font-mono text-xs text-cyan-300 hover:bg-cyan-900/40">
                    <Upload className="h-3.5 w-3.5" /> Import JSON
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {ROUND_PRESETS.map(preset => (
                  <div key={preset.id} className="rounded-xl border border-white/10 bg-black/40 p-4 hover:border-amber-500/40 transition-all group">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-white group-hover:text-amber-400 transition-colors">{preset.name.split(':')[0]}</span>
                      <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-gray-400">{preset.durationMinutes}m · {preset.questions.length} Qs</span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400 line-clamp-2">{preset.description}</p>
                    <button onClick={() => handleLoadPreset(preset)} className="mt-3 w-full rounded-lg border border-amber-500/30 bg-amber-950/20 py-1.5 font-mono text-xs text-amber-300 hover:bg-amber-500 hover:text-black transition-all">
                      Load Problem Set
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* LeetCode importer */}
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/20 to-[#0a0f18] p-6">
              <h3 className="font-mono text-sm font-bold text-cyan-300 flex items-center gap-2"><ExternalLink className="h-4 w-4" /> LeetCode Importer</h3>
              <div className="mt-3 flex gap-2">
                <input type="text" value={leetcodeSlug} onChange={e => setLeetcodeSlug(e.target.value)} placeholder="e.g. two-sum" onKeyDown={e => e.key === 'Enter' && handleImportLeetCode()}
                  className="flex-1 max-w-xs rounded-xl border border-white/10 bg-black/50 px-3 py-2 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none" />
                <button onClick={handleImportLeetCode} disabled={importLoading} className="rounded-xl bg-cyan-500 px-4 py-2 font-mono text-xs font-bold text-black hover:bg-cyan-400 disabled:opacity-50">
                  {importLoading ? 'Importing...' : 'Fetch'}
                </button>
              </div>
            </div>

            {/* Questions list */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-mono text-lg font-bold text-white">
                  Questions for: <span className="text-amber-400">{viewingSession?.label}</span>
                  <span className="ml-2 text-sm font-normal text-gray-500">({questions.length} problems)</span>
                </h3>
                <button onClick={() => { setEditingQuestion({ title: '', category: 'Algorithms', difficulty: 'Medium', points: 400, scenario: '', inputFormat: '', outputFormat: '', constraints: '', starterTemplates: { c: '', python: '', java: '' }, testCases: [{ id: 'tc-1', input: '', expectedOutput: '', isHidden: false }] }); setShowQuestionModal(true); }}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 font-mono text-xs font-bold text-black hover:brightness-110">
                  <Plus className="h-4 w-4" /> Create Question
                </button>
              </div>

              {questions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#0a0f18]/50 p-12 text-center text-gray-500 font-mono text-sm">
                  No questions yet. Import a preset, JSON, or create one manually.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="rounded-2xl border border-white/10 bg-[#0a0f18] p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-emerald-400">Q{idx + 1}</span>
                            <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-gray-300">{q.difficulty}</span>
                            <span className="font-mono text-xs text-amber-300 font-semibold">{q.points} pts</span>
                          </div>
                          <h4 className="mt-1 font-mono text-base font-bold text-white">{q.title}</h4>
                          <p className="font-mono text-xs text-gray-500">{q.category}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => { setEditingQuestion(q); setShowQuestionModal(true); }} className="rounded p-1.5 text-gray-400 hover:bg-white/10 hover:text-white" title="Edit"><FileCode className="h-4 w-4" /></button>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="rounded p-1.5 text-red-400 hover:bg-red-950/40" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                      <p className="line-clamp-2 text-xs text-gray-400">{q.scenario}</p>
                      <div className="border-t border-white/[0.08] pt-2 flex justify-between font-mono text-xs text-gray-500">
                        <span>{q.testCases.length} test cases ({q.testCases.filter(t => t.isHidden).length} hidden)</span>
                        <span className="text-cyan-400">C · Python · Java</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 2: REGISTRATION
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'registration' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#0a0f18] p-6">
              <h3 className="font-mono text-sm font-bold text-orange-400 flex items-center gap-2">
                <Radio className="h-4 w-4" /> Registration Window Control
              </h3>

              {phase === 'setup' && (
                <div className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block font-mono text-xs text-gray-400 mb-1">Registration Duration (minutes)</label>
                      <input type="number" value={regDurationMin} onChange={e => setRegDurationMin(+e.target.value)} min={1} max={30}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white focus:border-orange-500 focus:outline-none" />
                    </div>
                    <div className="flex items-end">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-gray-400">Auto-Start Challenge When Closed</span>
                        <button onClick={() => setAutoStartReg(v => !v)}
                          className={`relative h-5 w-9 rounded-full transition-colors ${autoStartReg ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${autoStartReg ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => contestAction('openRegistration', { durationMinutes: regDurationMin, autoStart: autoStartReg })}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 font-mono text-sm font-bold text-black hover:brightness-110 active:scale-95">
                    <Zap className="h-4 w-4 fill-black" /> Open Registration Now
                  </button>
                </div>
              )}

              {phase === 'registration' && (
                <div className="mt-6 space-y-6">
                  {/* Live countdown */}
                  <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5">
                    <div>
                      <div className="font-mono text-xs text-amber-300 mb-1">Registration closes in</div>
                      <div className="font-mono text-4xl font-black tabular-nums text-amber-400">{regCountdown}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs text-gray-400 mb-1">Registered</div>
                      <div className="font-mono text-3xl font-bold text-white">{participants.length}</div>
                      <div className="font-mono text-xs text-gray-500">/ {currentSession?.max_participants ?? 200}</div>
                    </div>
                  </div>

                  {/* Auto start badge */}
                  <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 font-mono text-xs ${currentSession?.auto_start_on_reg_close ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300' : 'border-gray-500/30 bg-gray-900/30 text-gray-400'}`}>
                    <CheckCircle2 className="h-4 w-4" />
                    Auto-Start: {currentSession?.auto_start_on_reg_close ? 'ON — Challenge will begin automatically' : 'OFF — Manual start required'}
                  </div>

                  {/* Extend buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => contestAction('extendRegistration', { extraMinutes: 1 })} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-mono text-xs text-gray-300 hover:bg-white/10">+1 min</button>
                    <button onClick={() => contestAction('extendRegistration', { extraMinutes: 3 })} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-mono text-xs text-gray-300 hover:bg-white/10">+3 min</button>
                    <button onClick={() => contestAction('extendRegistration', { extraMinutes: 5 })} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-mono text-xs text-gray-300 hover:bg-white/10">+5 min</button>
                    <button onClick={() => { if (confirm('Close registration now?')) contestAction('closeRegistration'); }} className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-2 font-mono text-xs text-red-300 hover:bg-red-900/40">Close Now</button>
                    <button onClick={() => { if (confirm('Start challenge immediately?')) contestAction('startChallenge', { durationMinutes: challengeDurationMin }); }}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 font-mono text-xs font-bold text-black hover:brightness-110">
                      <Play className="h-3.5 w-3.5 fill-black" /> Start Challenge Now
                    </button>
                  </div>
                </div>
              )}

              {(phase === 'active' || phase === 'paused' || phase === 'ended' || phase === 'reveal') && (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-sm text-gray-400 text-center">
                  Registration window is closed. Contest is in <span className="text-white font-semibold">{PHASE_LABELS[phase]}</span> phase.
                </div>
              )}
            </div>

            {/* Live registered list */}
            {(phase === 'setup' || phase === 'registration') && participants.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#0a0f18] overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.08] font-mono text-xs text-gray-400 uppercase tracking-wider">
                  Registered Participants ({participants.length})
                </div>
                <div className="divide-y divide-white/[0.05]">
                  {participants.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-2.5 font-mono text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 w-6">{i + 1}.</span>
                        <div>
                          <div className="font-semibold text-white">{p.name}</div>
                          <div className="text-gray-500">{p.rollNumber} · {p.terminalId}</div>
                        </div>
                      </div>
                      <span className="text-gray-500">{new Date(p.registeredAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 3: LIVE CONTROLS
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'live' && (
          <div className="space-y-6">
            {!isLive && phase !== 'ended' && phase !== 'reveal' ? (
              <div className="rounded-2xl border border-white/10 bg-[#0a0f18] p-10 text-center">
                <Zap className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <p className="font-mono text-sm text-gray-400">Live controls are only available during an active or paused challenge.</p>
                <p className="font-mono text-xs text-gray-500 mt-1">Current phase: <span className="text-white">{PHASE_LABELS[phase]}</span></p>
                {(phase === 'setup' || phase === 'registration') && (
                  <button onClick={() => contestAction('startChallenge', { durationMinutes: challengeDurationMin })}
                    className="mt-4 flex items-center gap-2 mx-auto rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 font-mono text-sm font-bold text-black hover:brightness-110">
                    <Play className="h-4 w-4 fill-black" /> Start Challenge Directly
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Challenge status card */}
                <div className="rounded-2xl border border-white/10 bg-[#0a0f18] p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <PhaseBadge phase={phase} />
                      {currentSession?.challenge_starts_at && (
                        <p className="mt-1 font-mono text-xs text-gray-400">
                          Started: {new Date(currentSession.challenge_starts_at).toLocaleTimeString()} ·
                          Ends: {currentSession.challenge_ends_at ? new Date(currentSession.challenge_ends_at).toLocaleTimeString() : 'TBD'}
                        </p>
                      )}
                    </div>
                    <div className="font-mono text-5xl font-black tabular-nums text-emerald-400">
                      {challengeCountdown || '00:00'}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {currentSession?.challenge_starts_at && currentSession?.challenge_ends_at && (() => {
                    const total = currentSession.challenge_ends_at - currentSession.challenge_starts_at;
                    const elapsed = Date.now() - currentSession.challenge_starts_at;
                    const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
                    return (
                      <div className="mt-4 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000" style={{ width: `${pct}%` }} />
                      </div>
                    );
                  })()}

                  <div className="mt-5 flex flex-wrap gap-3">
                    {phase === 'active' && (
                      <button onClick={() => contestAction('pause')} className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-2.5 font-mono text-xs font-semibold text-amber-300 hover:bg-amber-900/40">
                        <Pause className="h-4 w-4" /> Pause Challenge
                      </button>
                    )}
                    {phase === 'paused' && (
                      <button onClick={() => contestAction('resume')} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 font-mono text-xs font-bold text-black hover:brightness-110">
                        <Play className="h-4 w-4 fill-black" /> Resume
                      </button>
                    )}
                    <button onClick={() => contestAction('extend', { extraMinutes: 1 })} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-gray-300 hover:bg-white/10">+1 min</button>
                    <button onClick={() => contestAction('extend', { extraMinutes: 5 })} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-gray-300 hover:bg-white/10">+5 min</button>
                    <button onClick={() => contestAction('extend', { extraMinutes: 10 })} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-gray-300 hover:bg-white/10">+10 min</button>
                    {(phase === 'active' || phase === 'paused') && (
                      <button onClick={() => { if (confirm('End the challenge now? Auto-submit will still work for participants.')) contestAction('endChallenge'); }}
                        className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-2.5 font-mono text-xs font-semibold text-red-300 hover:bg-red-900/40">
                        <StopCircle className="h-4 w-4" /> End Challenge Now
                      </button>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-950/10 p-3 font-mono text-xs text-amber-300 flex items-center gap-2">
                    <Timer className="h-4 w-4 shrink-0" />
                    Auto-submit fires in <strong className="text-amber-400 tabular-nums">{challengeCountdown}</strong> — all editors lock automatically at 00:00
                  </div>
                </div>

                {/* Broadcast */}
                <div className="rounded-2xl border border-white/10 bg-[#0a0f18] p-6">
                  <h3 className="font-mono text-sm font-bold text-cyan-400 flex items-center gap-2"><Megaphone className="h-4 w-4" /> Broadcast Announcement</h3>
                  <div className="mt-3 flex gap-2">
                    <textarea value={announcementText} onChange={e => setAnnouncementText(e.target.value)} placeholder="e.g. '10 minutes remaining! Final push!'" rows={2}
                      className="flex-1 rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none" />
                    <button onClick={() => contestAction('announcement', { announcement: announcementText })}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 font-mono text-xs font-bold text-black hover:brightness-110">
                      <Send className="h-4 w-4" /> Send
                    </button>
                  </div>
                  {currentSession?.announcement && (
                    <div className="mt-2 rounded-lg border border-cyan-500/20 bg-cyan-950/10 p-2 font-mono text-xs text-cyan-300">
                      Current: {currentSession.announcement}
                    </div>
                  )}
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Enrolled', value: participants.length, color: 'text-white' },
                    { label: 'Submissions', value: submissions.length, color: 'text-cyan-400' },
                    { label: 'Auto-Submits', value: submissions.filter(s => s.isAutoSubmit).length, color: 'text-amber-400' },
                    { label: 'Locked Out', value: participants.filter(p => p.isLockedOut).length, color: 'text-red-400' },
                  ].map(k => (
                    <div key={k.label} className="rounded-xl border border-white/5 bg-[#0a0f18] p-4">
                      <div className="font-mono text-[11px] text-gray-400">{k.label}</div>
                      <div className={`font-mono text-2xl font-bold mt-1 ${k.color}`}>{k.value}</div>
                    </div>
                  ))}
                </div>

                {/* Export / Reveal */}
                <div className="rounded-2xl border border-white/10 bg-[#0a0f18] p-5 flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex gap-3">
                    <button onClick={exportCSV} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 font-mono text-xs font-bold text-black hover:brightness-110">
                      <FileSpreadsheet className="h-4 w-4" /> Export CSV
                    </button>
                    <button onClick={exportAuditJSON} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 font-mono text-xs text-gray-300 hover:bg-white/10">
                      <Download className="h-4 w-4" /> Audit JSON
                    </button>
                  </div>
                  <button onClick={() => contestAction('toggleReveal')}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 font-mono text-xs font-bold transition-all ${currentSession?.is_reveal_mode ? 'border-purple-400 bg-purple-400 text-black' : 'border-purple-500/40 bg-purple-950/30 text-purple-300 hover:bg-purple-900/40'}`}>
                    <Sparkles className="h-4 w-4" />
                    {currentSession?.is_reveal_mode ? 'Disable Stage Reveal' : 'Trigger Stage Reveal'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 4: PARTICIPANTS MONITOR
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'participants' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-mono text-xs text-gray-400">{participants.length} participants · Session: <span className="text-white">{viewingSession?.label}</span></div>
              <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-gray-300 hover:bg-white/10">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f18]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-black/40 font-mono text-[11px] text-gray-400 uppercase">
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Terminal</th>
                    <th className="py-3 px-4 hidden md:table-cell">Language</th>
                    <th className="py-3 px-4">Strikes</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 hidden lg:table-cell">Last Active</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] font-mono text-xs">
                  {participants.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-500">No participants registered yet.</td></tr>
                  ) : participants.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.03]">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{p.name}</div>
                        <div className="text-[11px] text-gray-400">{p.rollNumber}</div>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell text-cyan-300">{p.terminalId}</td>
                      <td className="py-3 px-4 hidden md:table-cell uppercase text-gray-300">{p.activeLanguage || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${p.strikes >= 3 ? 'text-red-400' : p.strikes > 0 ? 'text-amber-400' : 'text-gray-400'}`}>{p.strikes}/3</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`rounded border px-2 py-0.5 text-[10px] ${p.isLockedOut ? 'border-red-500/40 bg-red-950/60 text-red-300' : 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300'}`}>
                          {p.isLockedOut ? 'Locked' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell text-gray-400">{new Date(p.lastActiveAt).toLocaleTimeString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {p.strikes > 0 && (
                            <button onClick={() => participantAction(p.id, 'reset_strikes')} className="flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-950/40 px-1.5 py-1 text-[11px] text-emerald-300 hover:bg-emerald-900/50" title="Pardon — reset strikes">
                              <Undo2 className="h-3 w-3" /> Pardon
                            </button>
                          )}
                          <button onClick={() => participantAction(p.id, 'add_strike')} className="flex items-center gap-1 rounded border border-amber-500/30 bg-amber-950/40 px-1.5 py-1 text-[11px] text-amber-300 hover:bg-amber-900/50">
                            <ShieldAlert className="h-3 w-3" /> +Strike
                          </button>
                          <button onClick={() => participantAction(p.id, 'toggle_lockout')} className={`flex items-center gap-1 rounded border px-1.5 py-1 text-[11px] ${p.isLockedOut ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300' : 'border-red-500/30 bg-red-950/40 text-red-300'}`}>
                            <Lock className="h-3 w-3" /> {p.isLockedOut ? 'Unlock' : 'Lock'}
                          </button>
                          <button onClick={() => { if (confirm(`Remove ${p.name}?`)) participantAction(p.id, 'delete'); }} className="rounded border border-white/10 bg-white/5 p-1 text-gray-400 hover:text-red-400">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {violations.length > 0 && (
              <div className="rounded-2xl border border-red-500/20 bg-[#0a0f18] p-5">
                <h4 className="font-mono text-sm font-bold text-red-400 mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Anti-Cheat Log ({violations.length})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {violations.slice(0, 20).map(v => (
                    <div key={v.id} className="flex items-center justify-between rounded-lg border border-red-500/10 bg-red-950/10 px-3 py-2 font-mono text-xs">
                      <div>
                        <span className="font-bold text-red-300">{v.participantName}</span>
                        <span className="text-gray-400 ml-2">{v.type}</span>
                        {v.details && <span className="text-gray-500 ml-2">— {v.details}</span>}
                      </div>
                      <div className="text-gray-500">{new Date(v.timestamp).toLocaleTimeString()} · Strike {v.strikeCount}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 5: SUBMISSIONS
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'submissions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-mono text-xs text-gray-400">{submissions.length} submissions · <span className="text-amber-300">{submissions.filter(s => s.isAutoSubmit).length} auto-submitted</span></div>
              <button onClick={exportAuditJSON} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-gray-300 hover:bg-white/10">
                <Download className="h-3.5 w-3.5" /> Audit JSON
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f18]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-black/40 font-mono text-[11px] text-gray-400 uppercase">
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Question</th>
                    <th className="py-3 px-4">Lang</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4 hidden md:table-cell">Tests</th>
                    <th className="py-3 px-4 hidden lg:table-cell">Submitted</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] font-mono text-xs">
                  {submissions.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-500">No submissions yet.</td></tr>
                  ) : submissions.map(s => (
                    <tr key={s.id} className="hover:bg-white/[0.03]">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{s.participantName}</div>
                        <div className="text-[11px] text-gray-400">{s.participantRoll}</div>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <div className="text-gray-200">{s.questionTitle}</div>
                        {s.isAutoSubmit && <span className="rounded bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 text-[10px] text-amber-300">AUTO</span>}
                      </td>
                      <td className="py-3 px-4 uppercase text-gray-300">{s.language}</td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${s.score > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>{s.score}</span>
                        {s.speedBonus > 0 && <span className="ml-1 text-cyan-400 text-[10px]">+{s.speedBonus}</span>}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-gray-300">{s.testCasesPassed}/{s.totalTestCases}</td>
                      <td className="py-3 px-4 hidden lg:table-cell text-gray-400">{new Date(s.submittedAt).toLocaleTimeString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setInspectedSubmission(s)} className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-gray-300 hover:text-white">
                            <Eye className="h-3 w-3" /> View
                          </button>
                          <button onClick={() => handleRejudge(s.id)} disabled={rejudging === s.id} className="flex items-center gap-1 rounded border border-indigo-500/30 bg-indigo-950/40 px-2 py-1 text-[11px] text-indigo-300 hover:bg-indigo-900/40 disabled:opacity-50">
                            {rejudging === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                            Re-judge
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 6: HISTORY
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <h2 className="font-mono text-lg font-bold text-white">All Contest Sessions</h2>
            {sessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-gray-500 font-mono text-sm">No sessions created yet.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sessions.map(s => {
                  // Quick stats (only available for viewed session; for others we show label + phase)
                  const isViewed = s.id === viewingSessionId;
                  return (
                    <div key={s.id} className={`rounded-2xl border bg-[#0a0f18] p-5 space-y-3 transition-all ${isViewed ? 'border-amber-500/40 shadow-lg shadow-amber-500/5' : 'border-white/10 hover:border-white/20'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-mono text-sm font-bold text-white">{s.label}</h3>
                          {s.scheduled_at && (
                            <p className="font-mono text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3" /> {new Date(s.scheduled_at).toLocaleString()}
                            </p>
                          )}
                          {s.notes && <p className="text-xs text-gray-500 mt-1 italic">{s.notes}</p>}
                        </div>
                        <PhaseBadge phase={s.phase} />
                      </div>

                      {s.challenge_starts_at && (
                        <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-3">
                          <div className="rounded-lg bg-black/30 p-2 text-center">
                            <div className="font-mono text-[10px] text-gray-500">Duration</div>
                            <div className="font-mono text-sm font-bold text-white">{Math.round((s.challenge_duration_ms ?? 3000000) / 60000)} min</div>
                          </div>
                          <div className="rounded-lg bg-black/30 p-2 text-center">
                            <div className="font-mono text-[10px] text-gray-500">Started</div>
                            <div className="font-mono text-sm font-bold text-white">{new Date(s.challenge_starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => { setViewingSessionId(s.id); setActiveTab('submissions'); }}
                          className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 font-mono text-xs text-gray-300 hover:text-white text-center"
                        >
                          View Submissions
                        </button>
                        <button
                          onClick={() => { setViewingSessionId(s.id); setActiveTab('participants'); }}
                          className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 font-mono text-xs text-gray-300 hover:text-white text-center"
                        >
                          Participants
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* New session CTA */}
            <button onClick={() => setShowNewSessionModal(true)} className="flex items-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 px-5 py-3 font-mono text-sm text-gray-400 hover:text-white hover:border-white/30 transition-all">
              <PlusCircle className="h-5 w-5" /> Create New Contest Session
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 7: PLAGIARISM
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'plagiarism' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#0a0f18] p-6">
              <h3 className="font-mono text-sm font-bold text-red-400 flex items-center gap-2"><GitCompare className="h-4 w-4" /> Code Plagiarism Scanner</h3>
              <div className="mt-4 flex gap-2">
                <select value={plagQuestionId} onChange={e => setPlagQuestionId(e.target.value)}
                  className="flex-1 rounded-xl border border-white/10 bg-black/50 px-3 py-2 font-mono text-xs text-white focus:border-red-400 focus:outline-none">
                  <option value="">Select a question to scan...</option>
                  {questions.map(q => (
                    <option key={q.id} value={q.id}>{q.title}</option>
                  ))}
                </select>
                <button onClick={() => scanPlagiarism(plagQuestionId)} disabled={!plagQuestionId}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 px-4 py-2 font-mono text-xs font-bold text-white hover:brightness-110 disabled:opacity-50">
                  <Search className="h-4 w-4" /> Scan All Pairs
                </button>
              </div>
            </div>

            {suspectPairs.length > 0 && (
              <div className="space-y-3">
                {suspectPairs.map(({ subA, subB, similarity }, i) => (
                  <div key={i} className="rounded-2xl border border-red-500/20 bg-[#0a0f18] p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 font-mono text-xs">
                        <span className="font-bold text-white">{subA.participantName}</span>
                        <GitCompare className="h-4 w-4 text-gray-500" />
                        <span className="font-bold text-white">{subB.participantName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 rounded-full bg-white/10 overflow-hidden">
                          <div className={`h-full rounded-full ${similarity.similarityScore > 0.8 ? 'bg-red-500' : similarity.similarityScore > 0.5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.round(similarity.similarityScore * 100)}%` }} />
                        </div>
                        <span className={`font-mono text-xs font-bold ${similarity.similarityScore > 0.8 ? 'text-red-400' : similarity.similarityScore > 0.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {Math.round(similarity.similarityScore * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="font-mono text-[10px] text-gray-500 mb-1">{subA.participantName} ({subA.language.toUpperCase()})</div>
                        <pre className="rounded-lg bg-black/40 p-3 font-mono text-[10px] text-gray-300 overflow-auto max-h-32">{subA.code.slice(0, 400)}{subA.code.length > 400 ? '...' : ''}</pre>
                      </div>
                      <div>
                        <div className="font-mono text-[10px] text-gray-500 mb-1">{subB.participantName} ({subB.language.toUpperCase()})</div>
                        <pre className="rounded-lg bg-black/40 p-3 font-mono text-[10px] text-gray-300 overflow-auto max-h-32">{subB.code.slice(0, 400)}{subB.code.length > 400 ? '...' : ''}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════════ */}

      {/* New Session Modal */}
      {showNewSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1420] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-lg font-bold text-white">New Contest Session</h3>
              <button onClick={() => setShowNewSessionModal(false)} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-mono text-xs text-gray-400 mb-1">Session Label *</label>
                <input type="text" value={newSessionLabel} onChange={e => setNewSessionLabel(e.target.value)} placeholder="e.g. Trial Run 2, Chapter 2 Final"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block font-mono text-xs text-gray-400 mb-1">Scheduled At (optional)</label>
                <input type="datetime-local" value={newSessionScheduled} onChange={e => setNewSessionScheduled(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block font-mono text-xs text-gray-400 mb-1">Notes (optional)</label>
                <textarea value={newSessionNotes} onChange={e => setNewSessionNotes(e.target.value)} placeholder="e.g. Dry run with 20 students" rows={2}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block font-mono text-xs text-gray-400 mb-1">Copy Questions From</label>
                <select value={newSessionCopyFrom ?? ''} onChange={e => setNewSessionCopyFrom(e.target.value || null)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none">
                  <option value="">— Start blank —</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.label} ({s.phase})</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowNewSessionModal(false)} className="rounded-xl border border-white/10 px-4 py-2 font-mono text-xs text-gray-300 hover:bg-white/5">Cancel</button>
              <button onClick={handleCreateSession} disabled={newSessionCreating}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 font-mono text-xs font-bold text-black hover:brightness-110 disabled:opacity-50">
                {newSessionCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
                Create Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Editor Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1420] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.08] bg-[#0d1420] px-6 py-4">
              <h3 className="font-mono text-sm font-bold text-white">{editingQuestion.id ? 'Edit Question' : 'Create Question'}</h3>
              <button onClick={() => setShowQuestionModal(false)} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block font-mono text-xs text-gray-400 mb-1">Title *</label>
                  <input type="text" value={editingQuestion.title ?? ''} onChange={e => setEditingQuestion(q => ({ ...q, title: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white focus:border-cyan-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block font-mono text-xs text-gray-400 mb-1">Points</label>
                  <input type="number" value={editingQuestion.points ?? 400} onChange={e => setEditingQuestion(q => ({ ...q, points: +e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white focus:border-cyan-500 focus:outline-none" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-mono text-xs text-gray-400 mb-1">Category</label>
                  <input type="text" value={editingQuestion.category ?? ''} onChange={e => setEditingQuestion(q => ({ ...q, category: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white focus:border-cyan-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block font-mono text-xs text-gray-400 mb-1">Difficulty</label>
                  <select value={editingQuestion.difficulty ?? 'Medium'} onChange={e => setEditingQuestion(q => ({ ...q, difficulty: e.target.value as any }))}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white focus:border-cyan-500 focus:outline-none">
                    <option>Easy</option><option>Medium</option><option>Hard</option>
                  </select>
                </div>
              </div>

              {[
                { key: 'scenario', label: 'Scenario Description' },
                { key: 'inputFormat', label: 'Input Format' },
                { key: 'outputFormat', label: 'Output Format' },
                { key: 'constraints', label: 'Constraints' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block font-mono text-xs text-gray-400 mb-1">{label}</label>
                  <textarea value={(editingQuestion as any)[key] ?? ''} onChange={e => setEditingQuestion(q => ({ ...q, [key]: e.target.value }))} rows={3}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none resize-y" />
                </div>
              ))}

              {/* Test Cases */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-mono text-xs text-gray-400">Test Cases</label>
                  <button onClick={() => setEditingQuestion(q => ({ ...q, testCases: [...(q.testCases ?? []), { id: `tc-${Date.now()}`, input: '', expectedOutput: '', isHidden: false }] }))}
                    className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-2 py-1 font-mono text-[11px] text-gray-300 hover:bg-white/10">
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
                <div className="space-y-3">
                  {(editingQuestion.testCases ?? []).map((tc, i) => (
                    <div key={tc.id} className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] text-gray-500">Test {i + 1}</span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 font-mono text-[11px] text-gray-400 cursor-pointer">
                            <input type="checkbox" checked={tc.isHidden} onChange={e => {
                              const tcs = [...(editingQuestion.testCases ?? [])];
                              tcs[i] = { ...tcs[i], isHidden: e.target.checked };
                              setEditingQuestion(q => ({ ...q, testCases: tcs }));
                            }} className="accent-amber-400" />
                            Hidden
                          </label>
                          <button onClick={() => setEditingQuestion(q => ({ ...q, testCases: (q.testCases ?? []).filter((_, idx) => idx !== i) }))} className="text-red-400 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="font-mono text-[10px] text-gray-500 mb-1">Input</div>
                          <textarea value={tc.input} onChange={e => {
                            const tcs = [...(editingQuestion.testCases ?? [])];
                            tcs[i] = { ...tcs[i], input: e.target.value };
                            setEditingQuestion(q => ({ ...q, testCases: tcs }));
                          }} rows={2} className="w-full rounded-lg border border-white/10 bg-black/50 px-2 py-1 font-mono text-xs text-emerald-300 focus:outline-none resize-none" />
                        </div>
                        <div>
                          <div className="font-mono text-[10px] text-gray-500 mb-1">Expected Output</div>
                          <textarea value={tc.expectedOutput} onChange={e => {
                            const tcs = [...(editingQuestion.testCases ?? [])];
                            tcs[i] = { ...tcs[i], expectedOutput: e.target.value };
                            setEditingQuestion(q => ({ ...q, testCases: tcs }));
                          }} rows={2} className="w-full rounded-lg border border-white/10 bg-black/50 px-2 py-1 font-mono text-xs text-cyan-300 focus:outline-none resize-none" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-white/[0.08] pt-4">
                <button onClick={() => setShowQuestionModal(false)} className="rounded-xl border border-white/10 px-4 py-2 font-mono text-xs text-gray-300 hover:bg-white/5">Cancel</button>
                <button onClick={handleSaveQuestion} className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 font-mono text-xs font-bold text-black hover:brightness-110">
                  {editingQuestion.id ? 'Save Changes' : 'Create Question'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import JSON Modal */}
      {showImportJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0d1420] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-sm font-bold text-white">Import Questions JSON</h3>
              <button onClick={() => setShowImportJsonModal(false)} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <textarea value={importJsonText} onChange={e => setImportJsonText(e.target.value)} placeholder='[{"title":"...", "testCases":[...]}]' rows={10}
              className="w-full rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none resize-y" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowImportJsonModal(false)} className="rounded-xl border border-white/10 px-4 py-2 font-mono text-xs text-gray-300">Cancel</button>
              <button onClick={handleImportQuestionsJSON} className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-2 font-mono text-xs font-bold text-black hover:brightness-110">Import</button>
            </div>
          </div>
        </div>
      )}

      {/* Code Inspector Modal */}
      {inspectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-[#0d1420] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
              <div>
                <div className="font-mono text-sm font-bold text-white">{inspectedSubmission.participantName} — {inspectedSubmission.questionTitle}</div>
                <div className="font-mono text-xs text-gray-400 mt-0.5">
                  {inspectedSubmission.language.toUpperCase()} · Score: {inspectedSubmission.score} · {inspectedSubmission.testCasesPassed}/{inspectedSubmission.totalTestCases} passed
                  {inspectedSubmission.isAutoSubmit && <span className="ml-2 rounded bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 text-[10px] text-amber-300">AUTO-SUBMITTED</span>}
                </div>
              </div>
              <button onClick={() => setInspectedSubmission(null)} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor height="60vh" language={inspectedSubmission.language === 'c' ? 'c' : inspectedSubmission.language}
                value={inspectedSubmission.code} options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, wordWrap: 'on' }} theme="vs-dark" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
