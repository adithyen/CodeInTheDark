'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  ShieldCheck, Play, Pause, Plus, RotateCcw, Clock, Sparkles,
  Users, FileCode, Download, Trash2, ExternalLink, AlertTriangle, Code2,
  CheckCircle2, Eye, Lock, FileSpreadsheet, Layers, Upload,
  RefreshCw, ShieldAlert, Undo2, Search, ChevronDown, PlusCircle,
  Calendar, History, BarChart3, Settings, Radio, Zap, StopCircle,
  Timer, X, Copy, Check, Loader2, Edit3, LogOut,
} from 'lucide-react';
import { Question, ContestSession, ContestPhase, Participant, Submission, Violation, TestCase } from '@/types';
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
  setup:        'text-[#a68a56] border-[#a68a56]/30 bg-[#1c160e]/50',
  registration: 'text-[#f3d38c] border-[#d4af37]/40 bg-[#1c160e]',
  active:       'text-[#d4af37] border-[#d4af37]/60 bg-[#1c160e]',
  paused:       'text-[#f3d38c] border-[#f3d38c]/40 bg-[#1c160e]/80',
  ended:        'text-[#a68a56] border-[#a68a56]/20 bg-[#050504]',
  reveal:       'text-[#f3d38c] border-[#d4af37]/50 bg-[#1c160e]',
};

function PhaseBadge({ phase }: { phase: ContestPhase }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-cinzel text-[10px] font-semibold ${PHASE_COLORS[phase]}`}>
      {(phase === 'active') && <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] animate-ping" />}
      {(phase === 'registration') && <span className="h-1.5 w-1.5 rounded-full bg-[#f3d38c] animate-pulse" />}
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

function fmtDuration(ms?: number | null): string {
  if (!ms || ms <= 0) return '0s';
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
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
  const [activeTab, setActiveTab] = useState<'setup' | 'registration' | 'live' | 'participants' | 'submissions' | 'history'>('setup');

  // Control inputs
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

  // Rename & Delete session modals
  const [showRenameSessionModal, setShowRenameSessionModal] = useState(false);
  const [sessionToRename, setSessionToRename] = useState<ContestSession | null>(null);
  const [renameLabel, setRenameLabel] = useState('');
  const [renameNotes, setRenameNotes] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<ContestSession | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

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
    const cleanKey = (key || '').trim();
    if (!cleanKey) {
      setAuthError('Please enter the admin passkey');
      setIsAuthenticated(false);
      return;
    }
    try {
      const res = await fetch('/api/contest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verifyPasskey', passkey: cleanKey }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
        setPasskey(cleanKey);
        sessionStorage.setItem('cid_admin_passkey', cleanKey);
        fetchAllData(cleanKey);
      } else {
        const d = await res.json().catch(() => ({}));
        setAuthError(d.error || 'Invalid Admin Passkey. Valid keys: admin1111, admiral2026, admin');
        sessionStorage.removeItem('cid_admin_passkey');
        setIsAuthenticated(false);
      }
    } catch {
      setAuthError('Connection error to Command Bridge');
      setIsAuthenticated(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    verifyPasskey(passkey);
  };

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

  // Sync inputs with viewed session
  useEffect(() => {
    if (viewingSession) {
      if (viewingSession.challenge_duration_ms) {
        setChallengeDurationMin(Math.round(viewingSession.challenge_duration_ms / 60000));
      }
      if (viewingSession.max_participants) {
        setMaxParticipants(viewingSession.max_participants);
      }
    }
  }, [viewingSession?.id, viewingSession?.challenge_duration_ms, viewingSession?.max_participants]);

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
  // Contest actions (on the viewed session or current session)
  // ────────────────────────────────────────────────────────────────────────────
  const contestAction = async (action: string, extra: any = {}) => {
    const sessionId = extra.sessionId || viewingSessionId || currentSession?.id;
    if (!sessionId && action !== 'createSession' && action !== 'getSessions') return;
    try {
      const res = await fetch('/api/contest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, passkey, sessionId, ...extra }),
      });
      if (res.ok) await fetchAllData(passkey, sessionId);
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

  const openRenameModal = (session: ContestSession) => {
    setSessionToRename(session);
    setRenameLabel(session.label);
    setRenameNotes(session.notes || '');
    setShowRenameSessionModal(true);
  };

  const openDeleteModal = (session: ContestSession) => {
    setSessionToDelete(session);
    setDeleteConfirmText('');
    setShowDeleteSessionModal(true);
  };

  const handleRenameSession = async () => {
    if (!sessionToRename) return;
    if (!renameLabel.trim()) return alert('Session label cannot be empty');
    setRenameLoading(true);
    try {
      const res = await fetch('/api/contest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'renameSession',
          passkey,
          sessionId: sessionToRename.id,
          label: renameLabel.trim(),
          notes: renameNotes.trim(),
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setShowRenameSessionModal(false);
        setSessionToRename(null);
        await fetchAllData(passkey, viewingSessionId || undefined);
      } else {
        alert(d.error || 'Failed to rename session');
      }
    } catch {
      alert('Network error while renaming session');
    }
    setRenameLoading(false);
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      return alert('Please type DELETE to confirm session purge.');
    }
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/contest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteSession',
          passkey,
          sessionId: sessionToDelete.id,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setShowDeleteSessionModal(false);
        setSessionToDelete(null);
        setDeleteConfirmText('');
        const remaining: ContestSession[] = d.sessions || [];
        const nextId = d.session?.id || (remaining.length > 0 ? remaining[0].id : null);
        setViewingSessionId(nextId);
        await fetchAllData(passkey, nextId || undefined);
      } else {
        alert(d.error || 'Failed to delete session');
      }
    } catch {
      alert('Network error while deleting session');
    }
    setDeleteLoading(false);
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
    if (!confirm(`Load "${preset.name}"? This replaces all current questions and sets challenge duration to ${preset.durationMinutes} min.`)) return;
    const res = await fetch('/api/questions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passkey, action: 'bulk_import', questions: preset.questions, sessionId: targetId }),
    });
    if (res.ok) {
      if (preset.durationMinutes) {
        setChallengeDurationMin(preset.durationMinutes);
        await contestAction('updateConfig', { durationMinutes: preset.durationMinutes, sessionId: targetId });
      }
      alert(`Loaded ${preset.name}!`);
      fetchAllData(passkey, targetId);
    } else alert('Failed loading preset');
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
    const headers = ['Name', 'Phone Number', 'College', 'Seat Number', 'Total Score', 'Questions Solved', 'Strikes', 'Status', 'Registered At'];
    const rows = participants.map((p) => {
      const userSubs = submissions.filter(s => s.participantId === p.id);
      const totalScore = userSubs.reduce((a, s) => a + (s.score || 0), 0);
      const solved = userSubs.filter(s => s.testCasesPassed === s.totalTestCases).length;
      return [
        `"${p.name}"`,
        `"${p.phone || ''}"`,
        `"${p.college || ''}"`,
        `"${p.terminalId}"`,
        totalScore,
        solved,
        p.strikes,
        p.isLockedOut ? 'LOCKED' : 'ACTIVE',
        `"${new Date(p.registeredAt).toLocaleString()}"`
      ].join(',');
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
  // LOGIN GATE
  // ────────────────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 bg-grid-cyber bg-[#050504]">
        <div className="w-full max-w-sm rounded-2xl border border-[#d4af37]/30 bg-[#0e0b07]/95 p-8 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#d4af37]">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-cinzel text-lg font-bold text-[#f3d38c]">ADMIRALTY COMMAND</h2>
              <p className="font-nautical-mono text-xs text-[#a68a56]">11:11 Chapter 2 Sanctuary Bridge</p>
            </div>
          </div>
          {authError && <div className="mt-4 rounded-lg border border-red-500/40 bg-red-950/20 p-2.5 font-nautical-mono text-xs text-red-300">{authError}</div>}
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block font-cinzel text-xs text-[#a68a56] mb-1">Master Admiralty Key</label>
              <input
                type="password"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="admin1111"
                required
                className="w-full rounded-xl border border-[#a68a56]/30 bg-[#050504] px-3 py-2 font-nautical-mono text-sm text-[#ebe4d5] focus:border-[#d4af37] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] py-2.5 font-cinzel text-sm font-bold tracking-wider text-[#050504] hover:brightness-110 shadow-[0_0_20px_rgba(212,175,55,0.25)] bouncy-btn"
            >
              Authenticate Command Bridge
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MAIN ADMIN LAYOUT
  // ────────────────────────────────────────────────────────────────────────────
  const phase = viewingSession?.phase ?? currentSession?.phase ?? 'setup';
  const isLive = phase === 'active' || phase === 'paused';

  return (
    <div className="flex flex-1 flex-col bg-[#050504]">
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-40 border-b border-[#a68a56]/20 bg-[#080604]/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30">
              <ShieldCheck className="h-4 w-4 text-[#d4af37]" />
            </div>
            <span className="font-cinzel text-sm font-bold tracking-wider text-[#ebe4d5] hidden sm:inline">ADMIRALTY COMMAND BRIDGE</span>
          </div>

          {/* Session Selector */}
          <div className="relative flex-1 max-w-xs">
            <button
              onClick={() => setSelectorOpen(o => !o)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#a68a56]/30 bg-[#050504] px-3 py-2 font-nautical-mono text-xs text-[#ebe4d5] hover:border-[#d4af37] transition-all bouncy-btn"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="truncate">{viewingSession?.label ?? 'No Voyage Session'}</span>
                {viewingSession && <PhaseBadge phase={viewingSession.phase} />}
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-[#a68a56] shrink-0 transition-transform ${selectorOpen ? 'rotate-180' : ''}`} />
            </button>

            {selectorOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 w-full min-w-[280px] rounded-xl border border-[#a68a56]/30 bg-[#0c0906] shadow-2xl overflow-hidden">
                <div className="py-1">
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setViewingSessionId(s.id); setSelectorOpen(false); }}
                      className={`flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-[#1c160e] ${viewingSessionId === s.id ? 'bg-[#1c160e]' : ''}`}
                    >
                      <div>
                        <div className="font-cinzel text-xs font-semibold text-[#ebe4d5]">{s.label}</div>
                        {s.scheduled_at && (
                          <div className="font-nautical-mono text-[10px] text-[#a68a56]">
                            {new Date(s.scheduled_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <PhaseBadge phase={s.phase} />
                    </button>
                  ))}
                  <div className="border-t border-[#a68a56]/20 p-1.5">
                    <button
                      onClick={() => { setShowNewSessionModal(true); setSelectorOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 font-cinzel text-xs text-[#f3d38c] hover:bg-[#1c160e]"
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-[#d4af37]" />
                      Initiate New Voyage Session
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
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-cinzel text-[11px] font-semibold transition-all bouncy-btn ${currentSession?.is_reveal_mode ? 'border-[#d4af37] bg-[#d4af37] text-[#050504] shadow-lg shadow-[#d4af37]/30' : 'border-[#a68a56]/30 bg-[#1c160e]/50 text-[#f3d38c] hover:border-[#d4af37]'}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {currentSession?.is_reveal_mode ? 'Reveal Active' : 'Stage Reveal'}
              </button>
            )}
            <button onClick={() => fetchAllData(passkey)} className="rounded-lg border border-[#a68a56]/30 bg-[#1c160e]/50 p-1.5 text-[#a68a56] hover:text-[#f3d38c] hover:border-[#d4af37] bouncy-btn" title="Refresh log">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem('cid_admin_passkey');
                setIsAuthenticated(false);
                setPasskey('');
              }}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/30 px-2.5 py-1.5 font-nautical-mono text-[11px] text-red-400 hover:bg-red-900/40 hover:border-red-400 transition-colors bouncy-btn"
              title="Disengage Passkey & Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Disengage</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto flex w-full max-w-7xl overflow-x-auto border-t border-[#a68a56]/15 px-4 sm:px-6">
          {(([
            { id: 'setup',        icon: Settings,      label: 'Trial Charter Setup',      badge: '' },
            { id: 'registration', icon: Radio,          label: 'Voyage Muster',            badge: '' },
            { id: 'live',         icon: Zap,            label: 'Command Deck',             badge: isLive ? '●' : '' },
            { id: 'participants', icon: Users,          label: `Navigators (${participants.length})`, badge: '' },
            { id: 'submissions',  icon: Code2,          label: `Scrolls (${submissions.length})`,    badge: '' },
            { id: 'history',      icon: History,        label: 'Voyage Annals',            badge: '' },
          ] as Array<{ id: typeof activeTab; icon: React.ComponentType<{className?: string}>; label: string; badge: string }>)).map(({ id, icon: Icon, label, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 font-cinzel text-xs font-medium transition-all bouncy-btn ${
                activeTab === id
                  ? 'border-[#d4af37] text-[#f3d38c] font-bold shadow-[0_2px_10px_rgba(212,175,55,0.2)]'
                  : 'border-transparent text-[#a68a56] hover:text-[#ebe4d5]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
              {badge && <span className="animate-pulse text-[#d4af37]">{badge}</span>}
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
            <div className="rounded-2xl border border-[#a68a56]/25 bg-[#090704] p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#a68a56]/15 pb-4">
                <div>
                  <h3 className="font-cinzel text-sm font-bold text-[#f3d38c] flex items-center gap-2">
                    <Settings className="h-4 w-4 text-[#d4af37]" /> Voyage Session Configuration
                    {viewingSession && <PhaseBadge phase={viewingSession.phase} />}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-cinzel text-base font-bold text-[#ebe4d5]">
                      {viewingSession?.label || 'Untitled Session'}
                    </span>
                    {viewingSession?.notes && (
                      <span className="font-nautical-mono text-xs text-[#a68a56] italic">
                        — {viewingSession.notes}
                      </span>
                    )}
                  </div>
                </div>
                {viewingSession && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openRenameModal(viewingSession)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#a68a56]/30 bg-[#1c160e]/60 px-3 py-1.5 font-cinzel text-xs text-[#f3d38c] hover:border-[#d4af37] transition-all bouncy-btn"
                      title="Rename this voyage session"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-[#d4af37]" />
                      <span>Rename</span>
                    </button>
                    <button
                      onClick={() => openDeleteModal(viewingSession)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/20 px-3 py-1.5 font-cinzel text-xs text-red-400 hover:bg-red-900/30 hover:border-red-500 transition-all bouncy-btn"
                      title="Delete this voyage session and all associated data"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      <span>Purge Voyage</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block font-cinzel text-xs text-[#a68a56] mb-1">Challenge Duration (min)</label>
                  <div className="flex gap-2">
                    <input type="number" id="input-challenge-duration" value={challengeDurationMin} onChange={e => setChallengeDurationMin(+e.target.value)} min={1} max={180}
                      className="w-full rounded-lg border border-[#a68a56]/30 bg-[#050504] px-3 py-1.5 font-nautical-mono text-xs text-[#ebe4d5] focus:border-[#d4af37] focus:outline-none" />
                    <button id="save-duration-btn" onClick={() => contestAction('updateConfig', { durationMinutes: challengeDurationMin, sessionId: viewingSession?.id })}
                      className="rounded-lg bg-[#1c160e] border border-[#d4af37]/40 px-3 py-1.5 font-cinzel text-xs text-[#f3d38c] hover:border-[#d4af37] bouncy-btn">Save</button>
                  </div>
                </div>
                <div>
                  <label className="block font-cinzel text-xs text-[#a68a56] mb-1">Max Navigators (Capacity)</label>
                  <div className="flex gap-2">
                    <input type="number" id="input-max-navigators" value={maxParticipants} onChange={e => setMaxParticipants(+e.target.value)} min={1}
                      className="w-full rounded-lg border border-[#a68a56]/30 bg-[#050504] px-3 py-1.5 font-nautical-mono text-xs text-[#ebe4d5] focus:border-[#d4af37] focus:outline-none" />
                    <button id="save-capacity-btn" onClick={() => contestAction('updateConfig', { maxParticipants, sessionId: viewingSession?.id })}
                      className="rounded-lg bg-[#1c160e] border border-[#d4af37]/40 px-3 py-1.5 font-cinzel text-xs text-[#f3d38c] hover:border-[#d4af37] bouncy-btn">Save</button>
                  </div>
                </div>
                <div className="flex flex-col justify-end">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-cinzel text-xs text-[#a68a56]">Allow Late Join</span>
                    <span className={`font-nautical-mono text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                      viewingSession?.allow_late_join
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                        : 'bg-[#18130c] text-[#a68a56] border-[#a68a56]/30'
                    }`}>
                      {viewingSession?.allow_late_join ? '● OPEN' : '○ BLOCKED'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 h-[34px]">
                    <button
                      type="button"
                      role="switch"
                      id="allow-late-join-toggle"
                      aria-checked={Boolean(viewingSession?.allow_late_join)}
                      onClick={() => {
                        const nextVal = !viewingSession?.allow_late_join;
                        if (viewingSession) {
                          setSessions(prev => prev.map(s => s.id === viewingSession.id ? { ...s, allow_late_join: nextVal } : s));
                          if (currentSession?.id === viewingSession.id) {
                            setCurrentSession(prev => prev ? { ...prev, allow_late_join: nextVal } : prev);
                          }
                        }
                        contestAction('updateConfig', {
                          allowLateJoin: nextVal,
                          sessionId: viewingSession?.id,
                        });
                      }}
                      className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 ${
                        viewingSession?.allow_late_join
                          ? 'bg-gradient-to-r from-[#d4af37] to-[#f3d38c] shadow-[0_0_10px_rgba(212,175,55,0.35)]'
                          : 'bg-[#1a140d] border border-[#a68a56]/40 hover:border-[#a68a56]'
                      }`}
                      title={viewingSession?.allow_late_join ? 'Late join is ALLOWED' : 'Late join is BLOCKED'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-md transition-transform duration-200 ease-in-out ${
                          viewingSession?.allow_late_join
                            ? 'translate-x-6 bg-[#050504]'
                            : 'translate-x-0 bg-[#8c734b]'
                        }`}
                      />
                    </button>
                    <span className="font-nautical-mono text-[11px] text-[#ebe4d5]/70 truncate">
                      {viewingSession?.allow_late_join ? 'Late arrival permitted' : 'Closed once active'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Round Presets */}
            <div className="rounded-2xl border border-[#a68a56]/25 bg-[#090704] p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-cinzel text-sm font-bold text-[#f3d38c] flex items-center gap-2"><Layers className="h-4 w-4 text-[#d4af37]" /> Trial Presets</h3>
                  <p className="mt-1 font-nautical-mono text-xs text-[#a68a56]">1-click load preconfigured trial scrolls or import custom parchment JSON</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={exportQuestionsJSON} className="flex items-center gap-1.5 rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 px-3 py-2 font-cinzel text-xs text-[#ebe4d5] hover:border-[#d4af37] bouncy-btn">
                    <Download className="h-3.5 w-3.5 text-[#d4af37]" /> Export JSON
                  </button>
                  <button onClick={() => setShowImportJsonModal(true)} className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/40 bg-[#1c160e] px-3 py-2 font-cinzel text-xs text-[#f3d38c] hover:border-[#d4af37] bouncy-btn">
                    <Upload className="h-3.5 w-3.5 text-[#d4af37]" /> Import JSON
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {ROUND_PRESETS.map(preset => (
                  <div key={preset.id} className="rounded-xl border border-[#a68a56]/20 bg-[#050504]/70 p-4 hover:border-[#d4af37] transition-all group">
                    <div className="flex items-center justify-between">
                      <span className="font-cinzel text-xs font-bold text-[#ebe4d5] group-hover:text-[#f3d38c] transition-colors">{preset.name.split(':')[0]}</span>
                      <span className="rounded border border-[#a68a56]/20 bg-[#1c160e] px-2 py-0.5 font-nautical-mono text-[10px] text-[#a68a56]">{preset.durationMinutes}m · {preset.questions.length} Scrolls</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#ebe4d5]/70 line-clamp-2">{preset.description}</p>
                    <button onClick={() => handleLoadPreset(preset)} className="mt-3 w-full rounded-lg border border-[#d4af37]/30 bg-[#1c160e] py-1.5 font-cinzel text-xs font-semibold text-[#f3d38c] hover:bg-[#d4af37] hover:text-[#050504] transition-all bouncy-btn">
                      Load Problem Set
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* LeetCode importer */}
            <div className="rounded-2xl border border-[#a68a56]/25 bg-gradient-to-r from-[#1c160e] to-[#090704] p-6 shadow-xl">
              <h3 className="font-cinzel text-sm font-bold text-[#f3d38c] flex items-center gap-2"><ExternalLink className="h-4 w-4 text-[#d4af37]" /> Remote Scroll Ingestion (LeetCode)</h3>
              <div className="mt-3 flex gap-2">
                <input type="text" value={leetcodeSlug} onChange={e => setLeetcodeSlug(e.target.value)} placeholder="e.g. two-sum" onKeyDown={e => e.key === 'Enter' && handleImportLeetCode()}
                  className="flex-1 max-w-xs rounded-xl border border-[#a68a56]/30 bg-[#050504] px-3 py-2 font-nautical-mono text-xs text-[#ebe4d5] focus:border-[#d4af37] focus:outline-none" />
                <button onClick={handleImportLeetCode} disabled={importLoading} className="rounded-xl bg-gradient-to-r from-[#d4af37] to-[#f3d38c] px-4 py-2 font-cinzel text-xs font-bold text-[#050504] hover:brightness-110 disabled:opacity-50 bouncy-btn">
                  {importLoading ? 'Ingesting...' : 'Fetch'}
                </button>
              </div>
            </div>

            {/* Questions list */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-cinzel text-lg font-bold text-[#ebe4d5]">
                  Scrolls for: <span className="text-[#f3d38c]">{viewingSession?.label}</span>
                  <span className="ml-2 font-nautical-mono text-sm font-normal text-[#a68a56]">({questions.length} problems)</span>
                </h3>
                <button onClick={() => { setEditingQuestion({ title: '', category: 'Algorithms', difficulty: 'Medium', points: 400, scenario: '', inputFormat: '', outputFormat: '', constraints: '', starterTemplates: { c: '', python: '', java: '' }, testCases: [{ id: 'tc-1', input: '', expectedOutput: '', isHidden: false }] }); setShowQuestionModal(true); }}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-4 py-2 font-cinzel text-xs font-bold text-[#050504] hover:brightness-110 bouncy-btn shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                  <Plus className="h-4 w-4" /> Inscribe New Scroll
                </button>
              </div>

              {questions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#a68a56]/30 bg-[#090704]/50 p-12 text-center text-[#a68a56] font-cinzel text-sm">
                  No scrolls found. Load a preset or inscribe a new question above.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="rounded-2xl border border-[#a68a56]/25 bg-[#090704] p-5 space-y-3 shadow-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-cinzel font-bold text-sm text-[#f3d38c]">Q{idx + 1}</span>
                            <span className="rounded border border-[#a68a56]/20 bg-[#1c160e] px-2 py-0.5 font-cinzel text-[10px] text-[#ebe4d5]">{q.difficulty}</span>
                            <span className="font-nautical-mono text-xs text-[#d4af37] font-semibold">{q.points} pts</span>
                          </div>
                          <h4 className="mt-1 font-cinzel text-base font-bold text-[#ebe4d5]">{q.title}</h4>
                          <p className="font-nautical-mono text-xs text-[#a68a56]">{q.category}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => { setEditingQuestion(q); setShowQuestionModal(true); }} className="rounded p-1.5 text-[#a68a56] hover:bg-[#1c160e] hover:text-[#f3d38c]" title="Edit"><FileCode className="h-4 w-4" /></button>
                          <button onClick={() => handleDeleteQuestion(q.id)} className="rounded p-1.5 text-red-400 hover:bg-red-950/40" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                      <p className="line-clamp-2 text-xs text-[#ebe4d5]/70">{q.scenario}</p>
                      <div className="border-t border-[#a68a56]/15 pt-2 flex justify-between font-nautical-mono text-xs text-[#a68a56]">
                        <span>{q.testCases.length} trials ({q.testCases.filter(t => t.isHidden).length} hidden)</span>
                        <span className="text-[#f3d38c]">C · Python · Java</span>
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
            <div className="rounded-2xl border border-[#a68a56]/25 bg-[#090704] p-6 shadow-xl">
              <h3 className="font-cinzel text-sm font-bold text-[#f3d38c] flex items-center gap-2">
                <Radio className="h-4 w-4 text-[#d4af37]" /> Voyage Muster Window Control
              </h3>

              {phase === 'setup' && (
                <div className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block font-cinzel text-xs text-[#a68a56] mb-1">Muster Duration (minutes)</label>
                      <input type="number" value={regDurationMin} onChange={e => setRegDurationMin(+e.target.value)} min={1} max={30}
                        className="w-full rounded-xl border border-[#a68a56]/30 bg-[#050504] px-3 py-2 font-nautical-mono text-sm text-[#ebe4d5] focus:border-[#d4af37] focus:outline-none" />
                    </div>
                    <div className="flex flex-col justify-end">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-cinzel text-xs text-[#a68a56]">Auto-Start Voyage Upon Muster Close</span>
                        <span className={`font-nautical-mono text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                          autoStartReg
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                            : 'bg-[#18130c] text-[#a68a56] border-[#a68a56]/30'
                        }`}>
                          {autoStartReg ? '● ENABLED' : '○ MANUAL'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 h-[34px]">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={autoStartReg}
                          onClick={() => setAutoStartReg(v => !v)}
                          className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 ${
                            autoStartReg
                              ? 'bg-gradient-to-r from-[#d4af37] to-[#f3d38c] shadow-[0_0_10px_rgba(212,175,55,0.35)]'
                              : 'bg-[#1a140d] border border-[#a68a56]/40 hover:border-[#a68a56]'
                          }`}
                          title={autoStartReg ? 'Auto-start enabled' : 'Manual launch required'}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-md transition-transform duration-200 ease-in-out ${
                              autoStartReg
                                ? 'translate-x-6 bg-[#050504]'
                                : 'translate-x-0 bg-[#8c734b]'
                            }`}
                          />
                        </button>
                        <span className="font-nautical-mono text-[11px] text-[#ebe4d5]/70">
                          {autoStartReg ? 'Launches when countdown hits 0' : 'Awaits manual launch'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => contestAction('openRegistration', { durationMinutes: regDurationMin, autoStart: autoStartReg, sessionId: viewingSession?.id })}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-6 py-3 font-cinzel text-sm font-bold text-[#050504] hover:brightness-110 active:scale-95 shadow-[0_0_20px_rgba(212,175,55,0.25)] bouncy-btn">
                    <Zap className="h-4 w-4 fill-[#050504]" /> Open Muster Portal Now
                  </button>
                </div>
              )}

              {phase === 'registration' && (
                <div className="mt-6 space-y-6">
                  {/* Live countdown */}
                  <div className="flex items-center justify-between rounded-2xl border border-[#d4af37]/40 bg-[#1c160e] p-5 shadow-lg">
                    <div>
                      <div className="font-cinzel text-xs text-[#a68a56] mb-1">Muster Window Closes In</div>
                      <div className="font-nautical-mono text-4xl font-black tabular-nums text-[#d4af37]">{regCountdown}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-cinzel text-xs text-[#a68a56] mb-1">Enrolled Navigators</div>
                      <div className="font-nautical-mono text-3xl font-bold text-[#ebe4d5]">{participants.length}</div>
                      <div className="font-nautical-mono text-xs text-[#a68a56]">/ {viewingSession?.max_participants ?? 200}</div>
                    </div>
                  </div>

                  {/* Auto start live toggle button */}
                  <div className="flex items-center justify-between rounded-xl border border-[#a68a56]/20 bg-[#050504] p-3">
                    <div className="flex items-center gap-2 font-nautical-mono text-xs">
                      <CheckCircle2 className={`h-4 w-4 ${viewingSession?.auto_start_on_reg_close ? 'text-[#d4af37]' : 'text-[#6b5535]'}`} />
                      <span className={viewingSession?.auto_start_on_reg_close ? 'text-[#f3d38c] font-semibold' : 'text-[#a68a56]'}>
                        Auto-Start Voyage on Timeout:
                      </span>
                      <span className={`font-nautical-mono text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                        viewingSession?.auto_start_on_reg_close
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                          : 'bg-[#18130c] text-[#a68a56] border-[#a68a56]/30'
                      }`}>
                        {viewingSession?.auto_start_on_reg_close ? '● ENABLED (Immediate Launch)' : '○ DISABLED (Manual Command)'}
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      id="auto-start-toggle"
                      aria-checked={Boolean(viewingSession?.auto_start_on_reg_close)}
                      onClick={() => {
                        const nextVal = !viewingSession?.auto_start_on_reg_close;
                        if (viewingSession) {
                          setSessions(prev => prev.map(s => s.id === viewingSession.id ? { ...s, auto_start_on_reg_close: nextVal } : s));
                          if (currentSession?.id === viewingSession.id) {
                            setCurrentSession(prev => prev ? { ...prev, auto_start_on_reg_close: nextVal } : prev);
                          }
                        }
                        contestAction('updateConfig', {
                          autoStartOnRegClose: nextVal,
                          sessionId: viewingSession?.id,
                        });
                      }}
                      className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#d4af37]/40 ${
                        viewingSession?.auto_start_on_reg_close
                          ? 'bg-gradient-to-r from-[#d4af37] to-[#f3d38c] shadow-[0_0_10px_rgba(212,175,55,0.35)]'
                          : 'bg-[#1a140d] border border-[#a68a56]/40 hover:border-[#a68a56]'
                      }`}
                      title="Click to toggle auto-start behavior"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow-md transition-transform duration-200 ease-in-out ${
                          viewingSession?.auto_start_on_reg_close
                            ? 'translate-x-6 bg-[#050504]'
                            : 'translate-x-0 bg-[#8c734b]'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Extend buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => contestAction('extendRegistration', { extraMinutes: 1 })} className="rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 px-4 py-2 font-cinzel text-xs text-[#ebe4d5] hover:border-[#d4af37] bouncy-btn">+1 min</button>
                    <button onClick={() => contestAction('extendRegistration', { extraMinutes: 3 })} className="rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 px-4 py-2 font-cinzel text-xs text-[#ebe4d5] hover:border-[#d4af37] bouncy-btn">+3 min</button>
                    <button onClick={() => contestAction('extendRegistration', { extraMinutes: 5 })} className="rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 px-4 py-2 font-cinzel text-xs text-[#ebe4d5] hover:border-[#d4af37] bouncy-btn">+5 min</button>
                    <button onClick={() => { if (confirm('Close registration now?')) contestAction('closeRegistration', { sessionId: viewingSession?.id }); }} className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-2 font-cinzel text-xs text-red-300 hover:bg-red-900/40 bouncy-btn">Close Now</button>
                    <button onClick={() => { if (confirm('Start challenge immediately?')) contestAction('startChallenge', { durationMinutes: challengeDurationMin, sessionId: viewingSession?.id }); }}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-4 py-2 font-cinzel text-xs font-bold text-[#050504] hover:brightness-110 shadow-[0_0_15px_rgba(212,175,55,0.25)] bouncy-btn">
                      <Play className="h-3.5 w-3.5 fill-[#050504]" /> Launch Voyage Now
                    </button>
                  </div>
                </div>
              )}

              {(phase === 'active' || phase === 'paused' || phase === 'ended' || phase === 'reveal') && (
                <div className="mt-4 rounded-xl border border-[#a68a56]/20 bg-[#050504] p-4 font-cinzel text-sm text-[#a68a56] text-center">
                  Muster window is closed. Voyage is in <span className="text-[#f3d38c] font-semibold">{PHASE_LABELS[phase]}</span> phase.
                </div>
              )}
            </div>

            {/* Live registered list */}
            {(phase === 'setup' || phase === 'registration') && participants.length > 0 && (
              <div className="rounded-2xl border border-[#a68a56]/25 bg-[#090704] overflow-hidden shadow-xl">
                <div className="px-5 py-3 border-b border-[#a68a56]/20 bg-[#140f0a] font-cinzel text-xs text-[#d4af37] uppercase tracking-wider">
                  Enrolled Navigators ({participants.length})
                </div>
                <div className="divide-y divide-[#a68a56]/15">
                  {participants.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-2.5 font-nautical-mono text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-[#a68a56] w-6">{i + 1}.</span>
                        <div>
                          <div className="font-semibold text-[#ebe4d5]">{p.name}</div>
                          <div className="text-[#a68a56]">{p.rollNumber} · {p.terminalId}</div>
                        </div>
                      </div>
                      <span className="text-[#a68a56]">{new Date(p.registeredAt).toLocaleTimeString()}</span>
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
            {/* 1. SETUP PHASE */}
            {phase === 'setup' && (
              <div className="rounded-2xl border border-[#a68a56]/25 bg-[#090704] p-10 text-center shadow-xl space-y-4">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl border border-[#a68a56]/30 bg-[#1c160e]">
                  <Layers className="h-7 w-7 text-[#d4af37]" />
                </div>
                <div>
                  <h3 className="font-cinzel text-base font-bold text-[#f3d38c]">Voyage in Preparation</h3>
                  <p className="font-nautical-mono text-xs text-[#a68a56] mt-1 max-w-md mx-auto">
                    This voyage charter is currently in preparation. The challenge clock is halted and no trial is underway.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button onClick={() => setActiveTab('registration')}
                    className="flex items-center gap-2 rounded-xl border border-[#d4af37]/40 bg-[#1c160e] px-4 py-2.5 font-cinzel text-xs font-semibold text-[#f3d38c] hover:border-[#d4af37] bouncy-btn">
                    <Radio className="h-4 w-4" /> Open Crew Muster (Registration)
                  </button>
                  <button onClick={() => contestAction('startChallenge', { durationMinutes: challengeDurationMin, sessionId: viewingSession?.id })}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-5 py-2.5 font-cinzel text-xs font-bold text-[#050504] hover:brightness-110 shadow-[0_0_15px_rgba(212,175,55,0.25)] bouncy-btn">
                    <Play className="h-4 w-4 fill-[#050504]" /> Launch Voyage Directly
                  </button>
                </div>
              </div>
            )}

            {/* 2. REGISTRATION MUSTER PHASE */}
            {phase === 'registration' && (
              <div className="rounded-2xl border border-[#d4af37]/30 bg-[#090704] p-8 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#a68a56]/20 pb-4">
                  <div>
                    <span className="inline-block rounded border border-amber-500/40 bg-amber-950/30 px-2 py-0.5 font-nautical-mono text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                      ● CREW MUSTER UNDERWAY
                    </span>
                    <h3 className="mt-1 font-cinzel text-lg font-bold text-[#f3d38c]">Registration Muster Portal Open</h3>
                    <p className="font-nautical-mono text-xs text-[#a68a56]">Candidates are actively boarding and claiming terminal seats.</p>
                  </div>
                  <div className="text-right">
                    <span className="font-cinzel text-xs text-[#a68a56] block">Muster Closes In</span>
                    <span className="font-nautical-mono text-3xl font-black text-[#d4af37] tabular-nums">{regCountdown}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="font-nautical-mono text-xs text-[#ebe4d5]">
                    Enrolled: <strong className="text-[#f3d38c]">{participants.length}</strong> / {viewingSession?.max_participants ?? 200} Navigators
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setActiveTab('registration')}
                      className="rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 px-4 py-2 font-cinzel text-xs text-[#ebe4d5] hover:border-[#d4af37] bouncy-btn">
                      Manage Muster
                    </button>
                    <button onClick={() => { if (confirm('Start challenge immediately?')) contestAction('startChallenge', { durationMinutes: challengeDurationMin, sessionId: viewingSession?.id }); }}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-4 py-2 font-cinzel text-xs font-bold text-[#050504] hover:brightness-110 bouncy-btn">
                      <Play className="h-3.5 w-3.5 fill-[#050504]" /> Launch Voyage Immediately
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. ACTIVE OR PAUSED PHASE (LIVE CONTEST ONLY) */}
            {isLive && (
              <div className="rounded-2xl border border-[#a68a56]/25 bg-[#090704] p-6 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <PhaseBadge phase={phase} />
                    {viewingSession?.challenge_starts_at && (
                      <p className="mt-1 font-nautical-mono text-xs text-[#a68a56]">
                        Commenced: {new Date(viewingSession.challenge_starts_at).toLocaleTimeString()} ·
                        Concludes: {viewingSession.challenge_ends_at ? new Date(viewingSession.challenge_ends_at).toLocaleTimeString() : 'TBD'}
                      </p>
                    )}
                  </div>
                  <div className="font-nautical-mono text-5xl font-black tabular-nums text-[#d4af37]">
                    {challengeCountdown || '00:00'}
                  </div>
                </div>

                {/* Progress bar */}
                {viewingSession?.challenge_starts_at && viewingSession?.challenge_ends_at && (() => {
                  const total = viewingSession.challenge_ends_at - viewingSession.challenge_starts_at;
                  const elapsed = Date.now() - viewingSession.challenge_starts_at;
                  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
                  return (
                    <div className="mt-4 h-2 rounded-full bg-[#1c160e] overflow-hidden border border-[#a68a56]/20">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#d4af37] to-[#f3d38c] transition-all duration-1000" style={{ width: `${pct}%` }} />
                    </div>
                  );
                })()}

                <div className="mt-5 flex flex-wrap gap-3">
                  {phase === 'active' && (
                    <button onClick={() => contestAction('pause', { sessionId: viewingSession?.id })} className="flex items-center gap-2 rounded-xl border border-[#d4af37]/40 bg-[#1c160e] px-4 py-2.5 font-cinzel text-xs font-semibold text-[#f3d38c] hover:border-[#d4af37] bouncy-btn">
                      <Pause className="h-4 w-4" /> Pause Voyage
                    </button>
                  )}
                  {phase === 'paused' && (
                    <button onClick={() => contestAction('resume', { sessionId: viewingSession?.id })} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-4 py-2.5 font-cinzel text-xs font-bold text-[#050504] hover:brightness-110 bouncy-btn">
                      <Play className="h-4 w-4 fill-[#050504]" /> Resume Voyage
                    </button>
                  )}
                  <button onClick={() => contestAction('extend', { extraMinutes: 1, sessionId: viewingSession?.id })} className="rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 px-3 py-2 font-cinzel text-xs text-[#ebe4d5] hover:border-[#d4af37] bouncy-btn">+1 min</button>
                  <button onClick={() => contestAction('extend', { extraMinutes: 5, sessionId: viewingSession?.id })} className="rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 px-3 py-2 font-cinzel text-xs text-[#ebe4d5] hover:border-[#d4af37] bouncy-btn">+5 min</button>
                  <button onClick={() => contestAction('extend', { extraMinutes: 10, sessionId: viewingSession?.id })} className="rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 px-3 py-2 font-cinzel text-xs text-[#ebe4d5] hover:border-[#d4af37] bouncy-btn">+10 min</button>
                  <button onClick={() => { if (confirm('End the challenge now? Auto-submit will still work for participants.')) contestAction('endChallenge', { sessionId: viewingSession?.id }); }}
                    className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-2.5 font-cinzel text-xs font-semibold text-red-300 hover:bg-red-900/40 bouncy-btn">
                    <StopCircle className="h-4 w-4" /> End Voyage Now
                  </button>
                </div>

                <div className="mt-4 rounded-xl border border-[#d4af37]/30 bg-[#1c160e]/80 p-3 font-nautical-mono text-xs text-[#f3d38c] flex items-center gap-2">
                  <Timer className="h-4 w-4 shrink-0 text-[#d4af37]" />
                  Auto-submit fires in <strong className="text-[#d4af37] tabular-nums">{challengeCountdown}</strong> — all parchment scrolls lock automatically at 00:00
                </div>
              </div>
            )}

            {/* 4. CONCLUDED / REVEAL PHASE */}
            {(phase === 'ended' || phase === 'reveal') && (
              <div className="rounded-2xl border border-[#a68a56]/25 bg-[#090704] p-8 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#a68a56]/20 pb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#a68a56]/30 bg-[#1c160e] text-[#a68a56]">
                      <CheckCircle2 className="h-6 w-6 text-[#d4af37]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <PhaseBadge phase={phase} />
                        <h3 className="font-cinzel text-lg font-bold text-[#f3d38c]">Voyage Concluded</h3>
                      </div>
                      <p className="mt-0.5 font-nautical-mono text-xs text-[#a68a56]">
                        This contest voyage has concluded. All code submissions are frozen and locked in the archives.
                      </p>
                    </div>
                  </div>
                  {viewingSession?.challenge_starts_at && (
                    <div className="rounded-xl border border-[#a68a56]/20 bg-[#050504] px-4 py-2 text-right">
                      <span className="font-cinzel text-[10px] text-[#a68a56] block">Trial Window (Archive)</span>
                      <span className="font-nautical-mono text-xs text-[#ebe4d5]">
                        {new Date(viewingSession.challenge_starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {viewingSession.challenge_ends_at && ` – ${new Date(viewingSession.challenge_ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <span className="font-nautical-mono text-xs text-[#ebe4d5]/70">
                    {phase === 'reveal' ? '★ Solutions are currently unlocked for public review.' : 'Solutions and test cases remain sealed.'}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <a href="/leaderboard" target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#d4af37]/40 bg-[#1c160e] px-4 py-2 font-cinzel text-xs font-semibold text-[#f3d38c] hover:border-[#d4af37] bouncy-btn">
                      <BarChart3 className="h-3.5 w-3.5 text-[#d4af37]" /> Official Leaderboard
                    </a>
                    <button onClick={() => contestAction('toggleReveal', { sessionId: viewingSession?.id })}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 px-4 py-2 font-cinzel text-xs text-[#ebe4d5] hover:border-[#d4af37] bouncy-btn">
                      <Eye className="h-3.5 w-3.5 text-[#d4af37]" /> {phase === 'reveal' ? 'Hide Solutions' : 'Reveal Solutions'}
                    </button>
                    <button onClick={() => setActiveTab('submissions')}
                      className="rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 px-4 py-2 font-cinzel text-xs text-[#ebe4d5] hover:border-[#d4af37] bouncy-btn">
                      Audit Submissions
                    </button>
                  </div>
                </div>
              </div>
            )}


                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Enrolled Navigators', value: participants.length, color: 'text-[#ebe4d5]' },
                    { label: 'Scrolls Submitted', value: submissions.length, color: 'text-[#f3d38c]' },
                    { label: 'Auto-Submissions', value: submissions.filter(s => s.isAutoSubmit).length, color: 'text-[#d4af37]' },
                    { label: 'Sanctuary Locks', value: participants.filter(p => p.isLockedOut).length, color: 'text-red-400' },
                  ].map(k => (
                    <div key={k.label} className="rounded-xl border border-[#a68a56]/20 bg-[#090704] p-4 shadow-lg">
                      <div className="font-cinzel text-[11px] text-[#a68a56]">{k.label}</div>
                      <div className={`font-nautical-mono text-2xl font-bold mt-1 ${k.color}`}>{k.value}</div>
                    </div>
                  ))}
                </div>

                {/* Export / Reveal */}
                <div className="rounded-2xl border border-[#a68a56]/25 bg-[#090704] p-5 flex flex-wrap gap-3 items-center justify-between shadow-xl">
                  <div className="flex gap-3">
                    <button onClick={exportCSV} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-4 py-2.5 font-cinzel text-xs font-bold text-[#050504] hover:brightness-110 shadow-[0_0_15px_rgba(212,175,55,0.25)] bouncy-btn">
                      <FileSpreadsheet className="h-4 w-4" /> Export CSV Ledger
                    </button>
                    <button onClick={exportAuditJSON} className="flex items-center gap-2 rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 px-4 py-2.5 font-cinzel text-xs text-[#ebe4d5] hover:border-[#d4af37] bouncy-btn">
                      <Download className="h-4 w-4 text-[#d4af37]" /> Audit Archive JSON
                    </button>
                  </div>
                  <button onClick={() => contestAction('toggleReveal')}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 font-cinzel text-xs font-bold transition-all bouncy-btn ${currentSession?.is_reveal_mode ? 'border-[#d4af37] bg-[#d4af37] text-[#050504]' : 'border-[#d4af37]/40 bg-[#1c160e] text-[#f3d38c] hover:border-[#d4af37]'}`}>
                    <Sparkles className="h-4 w-4 text-[#d4af37]" />
                    {currentSession?.is_reveal_mode ? 'Conceal Stage Reveal' : 'Trigger Grand Stage Reveal'}
                  </button>
                </div>
              </div>
            )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 4: PARTICIPANTS MONITOR
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'participants' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-nautical-mono text-xs text-[#a68a56]">{participants.length} navigators registered · Voyage: <span className="text-[#f3d38c] font-cinzel">{viewingSession?.label}</span></div>
              <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 px-3 py-1.5 font-cinzel text-xs text-[#ebe4d5] hover:border-[#d4af37] bouncy-btn">
                <Download className="h-3.5 w-3.5 text-[#d4af37]" /> Export Ledger CSV
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#a68a56]/25 bg-[#090704] shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#a68a56]/20 bg-[#140f0a] font-cinzel text-[11px] text-[#d4af37] uppercase tracking-wider">
                    <th className="py-3 px-4">Navigator &amp; College</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Phone (Confidential)</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Seat Number</th>
                    <th className="py-3 px-4 hidden md:table-cell">Cipher</th>
                    <th className="py-3 px-4">Penalties</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 hidden lg:table-cell">Last Inscription</th>
                    <th className="py-3 px-4 text-right">Admiralty Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#a68a56]/15 font-nautical-mono text-xs">
                  {participants.length === 0 ? (
                    <tr><td colSpan={8} className="py-8 text-center text-[#a68a56]">No navigators mustered yet.</td></tr>
                  ) : participants.map((p) => (
                    <tr key={p.id} className="hover:bg-[#1c160e]/30">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#ebe4d5] font-cinzel">{p.name}</div>
                        <div className="text-[11px] text-[#f3d38c] truncate max-w-xs">{p.college || '—'}</div>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell font-mono text-[#ebe4d5]">
                        {p.phone ? <span className="text-[#f3d38c] font-semibold">{p.phone}</span> : <span className="text-[#a68a56]">—</span>}
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell text-[#d4af37]">{p.terminalId}</td>
                      <td className="py-3 px-4 hidden md:table-cell uppercase text-[#a68a56]">{p.activeLanguage || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${p.strikes >= 3 ? 'text-red-400' : p.strikes > 0 ? 'text-[#d4af37]' : 'text-[#a68a56]'}`}>{p.strikes}/3</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`rounded border px-2 py-0.5 text-[10px] font-cinzel ${p.isLockedOut ? 'border-red-500/40 bg-red-950/60 text-red-300' : 'border-[#d4af37]/40 bg-[#1c160e] text-[#f3d38c]'}`}>
                          {p.isLockedOut ? 'Sealed' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell text-[#a68a56]">{new Date(p.lastActiveAt).toLocaleTimeString()}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {p.strikes > 0 && (
                            <button onClick={() => participantAction(p.id, 'reset_strikes')} className="flex items-center gap-1 rounded border border-[#d4af37]/30 bg-[#1c160e] px-1.5 py-1 text-[11px] text-[#f3d38c] hover:border-[#d4af37] bouncy-btn" title="Pardon — reset penalties">
                              <Undo2 className="h-3 w-3" /> Pardon
                            </button>
                          )}
                          <button onClick={() => participantAction(p.id, 'add_strike')} className="flex items-center gap-1 rounded border border-[#a68a56]/30 bg-[#1c160e]/50 px-1.5 py-1 text-[11px] text-[#f3d38c] hover:border-[#d4af37] bouncy-btn">
                            <ShieldAlert className="h-3 w-3 text-[#d4af37]" /> +Strike
                          </button>
                          <button onClick={() => participantAction(p.id, 'toggle_lockout')} className={`flex items-center gap-1 rounded border px-1.5 py-1 text-[11px] font-cinzel bouncy-btn ${p.isLockedOut ? 'border-[#d4af37]/40 bg-[#1c160e] text-[#f3d38c]' : 'border-red-500/30 bg-red-950/40 text-red-300'}`}>
                            <Lock className="h-3 w-3" /> {p.isLockedOut ? 'Unseal' : 'Seal'}
                          </button>
                          <button onClick={() => { if (confirm(`Remove ${p.name}?`)) participantAction(p.id, 'delete'); }} className="rounded border border-[#a68a56]/20 bg-[#050504] p-1 text-[#a68a56] hover:text-red-400 bouncy-btn">
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
              <div className="rounded-2xl border border-red-500/30 bg-[#0f0906] p-5 shadow-xl">
                <h4 className="font-cinzel text-sm font-bold text-red-400 mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Aegis Infringement Log ({violations.length})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {violations.slice(0, 20).map(v => (
                    <div key={v.id} className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-950/20 px-3 py-2 font-nautical-mono text-xs">
                      <div>
                        <span className="font-bold text-red-300">{v.participantName}</span>
                        <span className="text-[#ebe4d5]/70 ml-2">{v.type}</span>
                        {v.details && <span className="text-[#a68a56] ml-2">— {v.details}</span>}
                      </div>
                      <div className="text-[#a68a56]">{new Date(v.timestamp).toLocaleTimeString()} · Penalty {v.strikeCount}</div>
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
        {/* ═══════════════════════════════════════════════════════════════════
            TAB 5: SUBMISSIONS
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'submissions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-nautical-mono text-xs text-[#a68a56]">{submissions.length} scrolls received · <span className="text-[#d4af37] font-semibold">{submissions.filter(s => s.isAutoSubmit).length} auto-sealed</span></div>
              <button onClick={exportAuditJSON} className="flex items-center gap-1.5 rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 px-3 py-1.5 font-cinzel text-xs text-[#ebe4d5] hover:border-[#d4af37] bouncy-btn">
                <Download className="h-3.5 w-3.5 text-[#d4af37]" /> Audit Archive JSON
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#a68a56]/25 bg-[#090704] shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#a68a56]/20 bg-[#140f0a] font-cinzel text-[11px] text-[#d4af37] uppercase tracking-wider">
                    <th className="py-3 px-4">Navigator</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Scroll</th>
                    <th className="py-3 px-4">Cipher</th>
                    <th className="py-3 px-4">Bounty</th>
                    <th className="py-3 px-4 hidden md:table-cell">Trials</th>
                    <th className="py-3 px-4 hidden lg:table-cell">First Sealed</th>
                    <th className="py-3 px-4 hidden xl:table-cell">Last Seal</th>
                    <th className="py-3 px-4 text-right">Admiralty Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#a68a56]/15 font-nautical-mono text-xs">
                  {submissions.length === 0 ? (
                    <tr><td colSpan={8} className="py-8 text-center text-[#a68a56]">No scrolls submitted yet.</td></tr>
                  ) : submissions.map(s => (
                    <tr key={s.id} className="hover:bg-[#1c160e]/30">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#ebe4d5] font-cinzel">{s.participantName}</div>
                        <div className="text-[11px] text-[#a68a56]">{s.participantRoll}</div>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <div className="text-[#ebe4d5]">{s.questionTitle}</div>
                        {s.isAutoSubmit && <span className="rounded bg-[#1c160e] border border-[#d4af37]/40 px-1.5 py-0.5 text-[10px] text-[#f3d38c] font-cinzel">AUTO</span>}
                      </td>
                      <td className="py-3 px-4 uppercase text-[#a68a56]">{s.language}</td>
                      <td className="py-3 px-4">
                        <span className={`font-bold ${s.score > 0 ? 'text-[#d4af37]' : 'text-[#a68a56]'}`}>{s.score}</span>
                        {(s as any).speedBonus > 0 && <span className="ml-1 text-[#f3d38c] text-[10px]">+{(s as any).speedBonus}</span>}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-[#ebe4d5]/80">{s.testCasesPassed}/{s.totalTestCases}</td>

                      {/* First Sealed */}
                      <td className="py-3 px-4 hidden lg:table-cell">
                        {(() => {
                          const firstTs = (s as any).firstSubmittedAt ?? s.submittedAt;
                          const firstDur = (s as any).firstExecTimeMs || s.execTimeMs;
                          if (!firstTs) return <span className="text-[#6b5535]">—</span>;
                          return (
                            <div>
                              <div className="text-[#f3d38c] font-bold flex items-center gap-1.5 flex-wrap">
                                <span>{new Date(firstTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                <span className="rounded bg-[#d4af37]/20 border border-[#d4af37]/40 px-1.5 py-0.5 text-[10px] font-bold text-[#f3d38c]">
                                  {fmtDuration(firstDur)}
                                </span>
                              </div>
                              <div className="text-[10px] text-[#a68a56]">{new Date(firstTs).toLocaleDateString()}</div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Last Seal */}
                      <td className="py-3 px-4 hidden xl:table-cell">
                        {(() => {
                          const firstTs = (s as any).firstSubmittedAt ?? s.submittedAt;
                          const lastTs = s.submittedAt ?? (s as any).firstSubmittedAt;
                          const firstDur = (s as any).firstExecTimeMs || s.execTimeMs;
                          const lastDur = s.execTimeMs || (s as any).firstExecTimeMs;
                          const isUpdated = Boolean(firstTs && lastTs && (firstTs !== lastTs || (firstDur && lastDur && firstDur !== lastDur)));

                          if (!lastTs) return <span className="text-[#6b5535]">—</span>;
                          return (
                            <div>
                              <div className={`font-bold flex items-center gap-1.5 flex-wrap ${isUpdated ? 'text-amber-300' : 'text-[#f3d38c]'}`}>
                                <span>{new Date(lastTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${isUpdated ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-[#d4af37]/20 text-[#f3d38c] border-[#d4af37]/40'}`}>
                                  {fmtDuration(lastDur)}
                                </span>
                              </div>
                              <div className="text-[10px] text-[#8c7456] flex items-center gap-1">
                                <span>{new Date(lastTs).toLocaleDateString()}</span>
                                {isUpdated && <span className="text-amber-400 font-bold">(Updated)</span>}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setInspectedSubmission(s)} className="flex items-center gap-1 rounded border border-[#a68a56]/30 bg-[#1c160e]/50 px-2 py-1 text-[11px] text-[#ebe4d5] hover:border-[#d4af37] bouncy-btn">
                            <Eye className="h-3 w-3 text-[#d4af37]" /> Inspect
                          </button>
                          <button onClick={() => handleRejudge(s.id)} disabled={rejudging === s.id} className="flex items-center gap-1 rounded border border-[#d4af37]/40 bg-[#1c160e] px-2 py-1 text-[11px] text-[#f3d38c] hover:border-[#d4af37] disabled:opacity-50 bouncy-btn">
                            {rejudging === s.id ? <Loader2 className="h-3 w-3 animate-spin text-[#d4af37]" /> : <RefreshCw className="h-3 w-3 text-[#d4af37]" />}
                            Re-adjudicate
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
            <h2 className="font-cinzel text-lg font-bold text-[#ebe4d5]">Voyage Annals & Historic Sessions</h2>
            {sessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#a68a56]/30 p-12 text-center text-[#a68a56] font-cinzel text-sm">No recorded voyages yet.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sessions.map(s => {
                  const isViewed = s.id === viewingSessionId;
                  return (
                    <div key={s.id} className={`rounded-2xl border bg-[#090704] p-5 space-y-3 transition-all bouncy-card ${isViewed ? 'border-[#d4af37] shadow-[0_0_25px_rgba(212,175,55,0.15)] ring-1 ring-[#d4af37]/30' : 'border-[#a68a56]/25 hover:border-[#a68a56]/50'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-cinzel text-sm font-bold text-[#ebe4d5]">{s.label}</h3>
                          {s.scheduled_at && (
                            <p className="font-nautical-mono text-xs text-[#a68a56] flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3 text-[#d4af37]" /> {new Date(s.scheduled_at).toLocaleString()}
                            </p>
                          )}
                          {s.notes && <p className="text-xs text-[#a68a56] mt-1 italic">{s.notes}</p>}
                        </div>
                        <PhaseBadge phase={s.phase} />
                      </div>

                      {s.challenge_starts_at && (
                        <div className="grid grid-cols-2 gap-2 border-t border-[#a68a56]/15 pt-3">
                          <div className="rounded-lg bg-[#050504] border border-[#a68a56]/15 p-2 text-center">
                            <div className="font-cinzel text-[10px] text-[#a68a56]">Duration</div>
                            <div className="font-nautical-mono text-sm font-bold text-[#f3d38c]">{Math.round((s.challenge_duration_ms ?? 3000000) / 60000)} min</div>
                          </div>
                          <div className="rounded-lg bg-[#050504] border border-[#a68a56]/15 p-2 text-center">
                            <div className="font-cinzel text-[10px] text-[#a68a56]">Commenced</div>
                            <div className="font-nautical-mono text-sm font-bold text-[#ebe4d5]">{new Date(s.challenge_starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => { setViewingSessionId(s.id); setActiveTab('submissions'); }}
                          className="rounded-lg border border-[#a68a56]/30 bg-[#1c160e]/50 py-1.5 font-cinzel text-xs text-[#ebe4d5] hover:border-[#d4af37] text-center bouncy-btn"
                        >
                          View Scrolls
                        </button>
                        <button
                          onClick={() => { setViewingSessionId(s.id); setActiveTab('participants'); }}
                          className="rounded-lg border border-[#a68a56]/30 bg-[#1c160e]/50 py-1.5 font-cinzel text-xs text-[#ebe4d5] hover:border-[#d4af37] text-center bouncy-btn"
                        >
                          Navigators
                        </button>
                      </div>

                      <div className="flex gap-2 border-t border-[#a68a56]/15 pt-2">
                        <button
                          onClick={() => openRenameModal(s)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#a68a56]/30 bg-[#0c0906] py-1.5 font-cinzel text-xs text-[#f3d38c] hover:border-[#d4af37] transition-all bouncy-btn"
                        >
                          <Edit3 className="h-3 w-3 text-[#d4af37]" /> Rename
                        </button>
                        <button
                          onClick={() => openDeleteModal(s)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/20 py-1.5 font-cinzel text-xs text-red-400 hover:bg-red-950/40 hover:border-red-500 transition-all bouncy-btn"
                        >
                          <Trash2 className="h-3 w-3 text-red-400" /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* New session CTA */}
            <button onClick={() => setShowNewSessionModal(true)} className="flex items-center gap-2 rounded-xl border border-dashed border-[#d4af37]/40 bg-[#1c160e]/40 px-5 py-3 font-cinzel text-sm text-[#f3d38c] hover:border-[#d4af37] transition-all bouncy-btn">
              <PlusCircle className="h-5 w-5 text-[#d4af37]" /> Inscribe New Voyage Session
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════════ */}

      {/* New Session Modal */}
      {showNewSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-[#d4af37]/40 bg-[#0c0906] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#a68a56]/20 pb-3">
              <h3 className="font-cinzel text-lg font-bold text-[#f3d38c]">Initiate Voyage Session</h3>
              <button onClick={() => setShowNewSessionModal(false)} className="text-[#a68a56] hover:text-[#ebe4d5]"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-cinzel text-xs text-[#a68a56] mb-1">Session Inscription *</label>
                <input type="text" value={newSessionLabel} onChange={e => setNewSessionLabel(e.target.value)} placeholder="e.g. Trial Run 2, Chapter 2 Final"
                  className="w-full rounded-xl border border-[#a68a56]/30 bg-[#050504] px-3 py-2 font-nautical-mono text-sm text-[#ebe4d5] focus:border-[#d4af37] focus:outline-none" />
              </div>
              <div>
                <label className="block font-cinzel text-xs text-[#a68a56] mb-1">Scheduled Date & Time (optional)</label>
                <input type="datetime-local" value={newSessionScheduled} onChange={e => setNewSessionScheduled(e.target.value)}
                  className="w-full rounded-xl border border-[#a68a56]/30 bg-[#050504] px-3 py-2 font-nautical-mono text-sm text-[#ebe4d5] focus:border-[#d4af37] focus:outline-none" />
              </div>
              <div>
                <label className="block font-cinzel text-xs text-[#a68a56] mb-1">Admiralty Log Notes (optional)</label>
                <textarea value={newSessionNotes} onChange={e => setNewSessionNotes(e.target.value)} placeholder="e.g. Trial run with 20 navigators" rows={2}
                  className="w-full rounded-xl border border-[#a68a56]/30 bg-[#050504] px-3 py-2 font-nautical-mono text-sm text-[#ebe4d5] focus:border-[#d4af37] focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block font-cinzel text-xs text-[#a68a56] mb-1">Copy Scrolls From Session</label>
                <select value={newSessionCopyFrom ?? ''} onChange={e => setNewSessionCopyFrom(e.target.value || null)}
                  className="w-full rounded-xl border border-[#a68a56]/30 bg-[#050504] px-3 py-2 font-nautical-mono text-sm text-[#ebe4d5] focus:border-[#d4af37] focus:outline-none">
                  <option value="">— Start with blank parchment —</option>
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.label} ({s.phase})</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowNewSessionModal(false)} className="rounded-xl border border-[#a68a56]/30 px-4 py-2 font-cinzel text-xs text-[#ebe4d5] hover:bg-[#1c160e]">Cancel</button>
              <button onClick={handleCreateSession} disabled={newSessionCreating}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-5 py-2 font-cinzel text-xs font-bold text-[#050504] hover:brightness-110 disabled:opacity-50 bouncy-btn shadow-[0_0_15px_rgba(212,175,55,0.25)]">
                {newSessionCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
                Seal Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Session Modal */}
      {showRenameSessionModal && sessionToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-[#d4af37]/40 bg-[#0c0906] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#a68a56]/20 pb-3">
              <h3 className="font-cinzel text-lg font-bold text-[#f3d38c] flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-[#d4af37]" /> Rename Voyage Session
              </h3>
              <button onClick={() => setShowRenameSessionModal(false)} className="text-[#a68a56] hover:text-[#ebe4d5]"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-cinzel text-xs text-[#a68a56] mb-1">Session Inscription / Name *</label>
                <input
                  type="text"
                  value={renameLabel}
                  onChange={e => setRenameLabel(e.target.value)}
                  placeholder="e.g. Trial Run 2, Chapter 2 Grand Finals"
                  className="w-full rounded-xl border border-[#a68a56]/30 bg-[#050504] px-3 py-2 font-nautical-mono text-sm text-[#ebe4d5] focus:border-[#d4af37] focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-cinzel text-xs text-[#a68a56] mb-1">Nautical Notes (optional)</label>
                <input
                  type="text"
                  value={renameNotes}
                  onChange={e => setRenameNotes(e.target.value)}
                  placeholder="e.g. Morning wave, 50-minute blitz"
                  className="w-full rounded-xl border border-[#a68a56]/30 bg-[#050504] px-3 py-2 font-nautical-mono text-xs text-[#ebe4d5] focus:border-[#d4af37] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-[#a68a56]/20 pt-4">
              <button
                onClick={() => setShowRenameSessionModal(false)}
                className="rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 px-4 py-2 font-cinzel text-xs text-[#ebe4d5] hover:border-[#d4af37] bouncy-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSession}
                disabled={renameLoading || !renameLabel.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-5 py-2 font-cinzel text-xs font-bold text-[#050504] hover:brightness-110 disabled:opacity-50 bouncy-btn"
              >
                {renameLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Session Modal (Strict Safeguard) */}
      {showDeleteSessionModal && sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-red-500/50 bg-[#0c0606] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-red-500/20 border-b pb-3">
              <h3 className="font-cinzel text-lg font-bold text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" /> Purge Voyage Session
              </h3>
              <button onClick={() => setShowDeleteSessionModal(false)} className="text-[#a68a56] hover:text-[#ebe4d5]"><X className="h-5 w-5" /></button>
            </div>

            <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 space-y-2">
              <p className="font-cinzel text-xs font-bold text-red-300">
                You are about to permanently delete session:
              </p>
              <p className="font-cinzel text-sm font-black text-white bg-black/60 px-3 py-1.5 rounded-lg border border-red-500/40">
                {sessionToDelete.label}
              </p>
              <p className="font-nautical-mono text-[11px] text-red-300/90 leading-relaxed pt-1">
                ⚠️ This action is <strong>PERMANENT and IRREVERSIBLE</strong>. It will completely delete all related information from everywhere:
              </p>
              <ul className="font-nautical-mono text-[11px] text-red-200/80 list-disc list-inside space-y-0.5 pl-1">
                <li>All Questions & Test Cases associated with this session</li>
                <li>All Submissions & Code evaluated for this session</li>
                <li>All Registered Navigators / Participants</li>
                <li>All Anti-Cheat Violations & Strikes</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="block font-nautical-mono text-xs text-[#ebe4d5]">
                To confirm, type <strong className="text-red-400 font-bold tracking-widest">DELETE</strong> below:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-xl border border-red-500/40 bg-[#050504] px-3 py-2 font-nautical-mono text-sm text-[#ebe4d5] focus:border-red-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-red-500/20 pt-4">
              <button
                onClick={() => setShowDeleteSessionModal(false)}
                className="rounded-xl border border-[#a68a56]/30 bg-[#1c160e]/50 px-4 py-2 font-cinzel text-xs text-[#ebe4d5] hover:border-[#d4af37] bouncy-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSession}
                disabled={deleteLoading || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 font-cinzel text-xs font-bold text-white hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed bouncy-btn shadow-lg shadow-red-950/60"
              >
                {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Purge All Records
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Question Editor Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#d4af37]/40 bg-[#0c0906] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#a68a56]/20 bg-[#0c0906] px-6 py-4">
              <h3 className="font-cinzel text-base font-bold text-[#f3d38c]">{editingQuestion.id ? 'Refine Trial Scroll' : 'Inscribe New Trial Scroll'}</h3>
              <button onClick={() => setShowQuestionModal(false)} className="text-[#a68a56] hover:text-[#ebe4d5]"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block font-cinzel text-xs text-[#a68a56] mb-1">Scroll Title *</label>
                  <input type="text" value={editingQuestion.title ?? ''} onChange={e => setEditingQuestion(q => ({ ...q, title: e.target.value }))}
                    className="w-full rounded-xl border border-[#a68a56]/30 bg-[#050504] px-3 py-2 font-cinzel text-sm text-[#ebe4d5] focus:border-[#d4af37] focus:outline-none" />
                </div>
                <div>
                  <label className="block font-cinzel text-xs text-[#a68a56] mb-1">Bounty Points</label>
                  <input type="number" value={editingQuestion.points ?? 400} onChange={e => setEditingQuestion(q => ({ ...q, points: +e.target.value }))}
                    className="w-full rounded-xl border border-[#a68a56]/30 bg-[#050504] px-3 py-2 font-nautical-mono text-sm text-[#ebe4d5] focus:border-[#d4af37] focus:outline-none" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-cinzel text-xs text-[#a68a56] mb-1">Category</label>
                  <input type="text" value={editingQuestion.category ?? ''} onChange={e => setEditingQuestion(q => ({ ...q, category: e.target.value }))}
                    className="w-full rounded-xl border border-[#a68a56]/30 bg-[#050504] px-3 py-2 font-nautical-mono text-sm text-[#ebe4d5] focus:border-[#d4af37] focus:outline-none" />
                </div>
                <div>
                  <label className="block font-cinzel text-xs text-[#a68a56] mb-1">Difficulty</label>
                  <select value={editingQuestion.difficulty ?? 'Medium'} onChange={e => setEditingQuestion(q => ({ ...q, difficulty: e.target.value as any }))}
                    className="w-full rounded-xl border border-[#a68a56]/30 bg-[#050504] px-3 py-2 font-cinzel text-sm text-[#ebe4d5] focus:border-[#d4af37] focus:outline-none">
                    <option>Easy</option><option>Medium</option><option>Hard</option>
                  </select>
                </div>
              </div>

              {[
                { key: 'scenario', label: 'Scenario Charter' },
                { key: 'inputFormat', label: 'Input Inscription' },
                { key: 'outputFormat', label: 'Output Vessel' },
                { key: 'constraints', label: 'Voyage Constraints' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block font-cinzel text-xs text-[#a68a56] mb-1">{label}</label>
                  <textarea value={(editingQuestion as any)[key] ?? ''} onChange={e => setEditingQuestion(q => ({ ...q, [key]: e.target.value }))} rows={3}
                    className="w-full rounded-xl border border-[#a68a56]/30 bg-[#050504] px-3 py-2 font-nautical-mono text-xs text-[#ebe4d5] focus:border-[#d4af37] focus:outline-none resize-y" />
                </div>
              ))}

              {/* Test Cases */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-cinzel text-xs text-[#a68a56]">Public & Sealed Trials</label>
                  <button onClick={() => setEditingQuestion(q => ({ ...q, testCases: [...(q.testCases ?? []), { id: `tc-${Date.now()}`, input: '', expectedOutput: '', isHidden: false }] }))}
                    className="flex items-center gap-1 rounded-lg bg-[#1c160e] border border-[#a68a56]/30 px-2.5 py-1 font-cinzel text-[11px] text-[#f3d38c] hover:border-[#d4af37] bouncy-btn">
                    <Plus className="h-3 w-3" /> Add Trial
                  </button>
                </div>
                <div className="space-y-3">
                  {(editingQuestion.testCases ?? []).map((tc, i) => (
                    <div key={tc.id} className="rounded-xl border border-[#a68a56]/20 bg-[#050504] p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-cinzel text-[11px] text-[#d4af37]">Trial {i + 1}</span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 font-cinzel text-[11px] text-[#a68a56] cursor-pointer">
                            <input type="checkbox" checked={tc.isHidden} onChange={e => {
                              const tcs = [...(editingQuestion.testCases ?? [])];
                              tcs[i] = { ...tcs[i], isHidden: e.target.checked };
                              setEditingQuestion(q => ({ ...q, testCases: tcs }));
                            }} className="accent-[#d4af37]" />
                            Sealed (Hidden)
                          </label>
                          <button onClick={() => setEditingQuestion(q => ({ ...q, testCases: (q.testCases ?? []).filter((_, idx) => idx !== i) }))} className="text-red-400 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="font-nautical-mono text-[10px] text-[#a68a56] mb-1">Input</div>
                          <textarea value={tc.input} onChange={e => {
                            const tcs = [...(editingQuestion.testCases ?? [])];
                            tcs[i] = { ...tcs[i], input: e.target.value };
                            setEditingQuestion(q => ({ ...q, testCases: tcs }));
                          }} rows={2} className="w-full rounded-lg border border-[#a68a56]/20 bg-[#090704] px-2 py-1 font-nautical-mono text-xs text-[#f3d38c] focus:outline-none resize-none" />
                        </div>
                        <div>
                          <div className="font-nautical-mono text-[10px] text-[#a68a56] mb-1">Expected Output</div>
                          <textarea value={tc.expectedOutput} onChange={e => {
                            const tcs = [...(editingQuestion.testCases ?? [])];
                            tcs[i] = { ...tcs[i], expectedOutput: e.target.value };
                            setEditingQuestion(q => ({ ...q, testCases: tcs }));
                          }} rows={2} className="w-full rounded-lg border border-[#a68a56]/20 bg-[#090704] px-2 py-1 font-nautical-mono text-xs text-[#d4af37] focus:outline-none resize-none" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#a68a56]/20 pt-4">
                <button onClick={() => setShowQuestionModal(false)} className="rounded-xl border border-[#a68a56]/30 px-4 py-2 font-cinzel text-xs text-[#ebe4d5] hover:bg-[#1c160e]">Cancel</button>
                <button onClick={handleSaveQuestion} className="rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-5 py-2 font-cinzel text-xs font-bold text-[#050504] hover:brightness-110 shadow-[0_0_15px_rgba(212,175,55,0.25)] bouncy-btn">
                  {editingQuestion.id ? 'Save Inscription' : 'Inscribe Scroll'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import JSON Modal */}
      {showImportJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-2xl border border-[#d4af37]/40 bg-[#0c0906] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#a68a56]/20 pb-3">
              <h3 className="font-cinzel text-sm font-bold text-[#f3d38c]">Import Scrolls JSON Parchment</h3>
              <button onClick={() => setShowImportJsonModal(false)} className="text-[#a68a56] hover:text-[#ebe4d5]"><X className="h-5 w-5" /></button>
            </div>
            <textarea value={importJsonText} onChange={e => setImportJsonText(e.target.value)} placeholder='[{"title":"...", "testCases":[...]}]' rows={10}
              className="w-full rounded-xl border border-[#a68a56]/30 bg-[#050504] p-3 font-nautical-mono text-xs text-[#ebe4d5] focus:border-[#d4af37] focus:outline-none resize-y" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowImportJsonModal(false)} className="rounded-xl border border-[#a68a56]/30 px-4 py-2 font-cinzel text-xs text-[#ebe4d5] hover:bg-[#1c160e]">Cancel</button>
              <button onClick={handleImportQuestionsJSON} className="rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3d38c] to-[#a68a56] px-5 py-2 font-cinzel text-xs font-bold text-[#050504] hover:brightness-110 bouncy-btn">Import Scrolls</button>
            </div>
          </div>
        </div>
      )}

      {/* Code Inspector Modal */}
      {inspectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-[#d4af37]/40 bg-[#0c0906] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#a68a56]/20 px-6 py-4">
              <div>
                <div className="font-cinzel text-sm font-bold text-[#ebe4d5]">{inspectedSubmission.participantName} — {inspectedSubmission.questionTitle}</div>
                <div className="font-nautical-mono text-xs text-[#a68a56] mt-0.5 flex flex-wrap gap-3">
                  <span>{inspectedSubmission.language.toUpperCase()} · Score: <strong className="text-[#d4af37]">{inspectedSubmission.score}</strong>
                    {(inspectedSubmission as any).speedBonus > 0 && <span className="text-[#f3d38c] ml-1">(+{(inspectedSubmission as any).speedBonus} speed bonus)</span>}
                  </span>
                  <span>{inspectedSubmission.testCasesPassed}/{inspectedSubmission.totalTestCases} test cases passed</span>
                  {inspectedSubmission.isAutoSubmit && <span className="rounded bg-[#1c160e] border border-[#d4af37]/40 px-1.5 py-0.5 text-[10px] text-[#f3d38c] font-cinzel">AUTO-SUBMITTED</span>}
                </div>
                <div className="mt-1 font-nautical-mono text-[11px] text-[#a68a56] flex gap-4 flex-wrap">
                  {(() => {
                    const firstTs = (inspectedSubmission as any).firstSubmittedAt ?? inspectedSubmission.submittedAt;
                    const lastTs = inspectedSubmission.submittedAt ?? (inspectedSubmission as any).firstSubmittedAt;
                    const firstDur = (inspectedSubmission as any).firstExecTimeMs || inspectedSubmission.execTimeMs;
                    const lastDur = inspectedSubmission.execTimeMs || (inspectedSubmission as any).firstExecTimeMs;
                    const isUpdated = Boolean(firstTs && lastTs && (firstTs !== lastTs || (firstDur && lastDur && firstDur !== lastDur)));

                    return (
                      <>
                        <span>
                          🕐 First sealed:{' '}
                          <strong className="text-[#f3d38c]">
                            {new Date(firstTs).toLocaleString()} ({fmtDuration(firstDur)})
                          </strong>
                        </span>
                        <span>
                          🔄 Last sealed:{' '}
                          <strong className={isUpdated ? 'text-amber-300' : 'text-[#f3d38c]'}>
                            {new Date(lastTs).toLocaleString()} ({fmtDuration(lastDur)}){isUpdated ? ' (Updated)' : ''}
                          </strong>
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
              <button onClick={() => setInspectedSubmission(null)} className="text-[#a68a56] hover:text-[#ebe4d5]"><X className="h-5 w-5" /></button>
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
