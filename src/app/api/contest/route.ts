import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveSession,
  getSessionById,
  getAllSessions,
  createSession,
  updateSession,
  renameSession,
  deleteSession,
  copyQuestionsToSession,
  autoTransitionSession,
} from '@/lib/db';

function isAdmin(passkey: string) {
  return passkey === 'admin1111' || passkey === process.env.ADMIN_SECRET;
}

// Converts a ContestSession to the legacy ContestState shape so arena/leaderboard keep working
function sessionToContestState(session: any) {
  return {
    isActive: session.phase === 'active' || session.phase === 'paused',
    isPaused: session.phase === 'paused' || session.is_paused,
    startTime: session.challenge_starts_at ?? null,
    durationMinutes: Math.round((session.challenge_duration_ms ?? 3000000) / 60000),
    endTime: session.challenge_ends_at ?? null,
    title: session.label,
    announcement: session.announcement ?? '',
    isRevealMode: session.is_reveal_mode ?? false,
    // New fields
    phase: session.phase,
    sessionId: session.id,
    registrationEndsAt: session.registration_ends_at ?? null,
    registrationOpensAt: session.registration_opens_at ?? null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    let session = sessionId ? await getSessionById(sessionId) : await getActiveSession();
    if (!session) {
      return NextResponse.json({ error: 'No contest session found' }, { status: 404 });
    }

    // Auto-transition phases based on timestamps (no cron needed)
    session = await autoTransitionSession(session);

    return NextResponse.json({
      contest: sessionToContestState(session),
      session,
      serverTime: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, passkey, sessionId: reqSessionId } = body;

    if (!isAdmin(passkey)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Admin Passkey' }, { status: 401 });
    }

    const now = Date.now();

    // ── Session Management Actions ──────────────────────────────────────
    if (action === 'createSession') {
      const { label, notes, scheduledAt, copyFromSessionId } = body;
      if (!label) return NextResponse.json({ error: 'Session label is required' }, { status: 400 });

      const newSession = await createSession(label, notes || '', scheduledAt);
      if (!newSession) return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });

      if (copyFromSessionId) {
        await copyQuestionsToSession(copyFromSessionId, newSession.id);
      }

      return NextResponse.json({ success: true, session: newSession });
    }

    if (action === 'getSessions') {
      const sessions = await getAllSessions();
      return NextResponse.json({ sessions });
    }

    // ── Session-specific actions (require sessionId) ─────────────────────
    const targetSessionId = reqSessionId;
    if (!targetSessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    let session = await getSessionById(targetSessionId);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    switch (action) {

      // ── REGISTRATION ──────────────────────────────────────────────────
      case 'openRegistration': {
        const durationMs = (body.durationMinutes ?? 3) * 60 * 1000;
        session = (await updateSession(targetSessionId, {
          phase: 'registration',
          registration_opens_at: now,
          registration_duration_ms: durationMs,
          registration_ends_at: now + durationMs,
          auto_start_on_reg_close: body.autoStart ?? true,
        }))!;
        break;
      }

      case 'extendRegistration': {
        const extraMs = (body.extraMinutes ?? 1) * 60 * 1000;
        const newEnd = (session.registration_ends_at ?? now) + extraMs;
        session = (await updateSession(targetSessionId, {
          registration_ends_at: newEnd,
        }))!;
        break;
      }

      case 'closeRegistration': {
        if (session.auto_start_on_reg_close) {
          const challengeEndsAt = now + (session.challenge_duration_ms ?? 3000000);
          session = (await updateSession(targetSessionId, {
            phase: 'active',
            challenge_starts_at: now,
            challenge_ends_at: challengeEndsAt,
          }))!;
        } else {
          session = (await updateSession(targetSessionId, { phase: 'setup' }))!;
        }
        break;
      }

      // ── CHALLENGE START (manual) ───────────────────────────────────────
      case 'startChallenge': {
        const durationMs = (body.durationMinutes ?? Math.round((session.challenge_duration_ms ?? 3000000) / 60000)) * 60 * 1000;
        session = (await updateSession(targetSessionId, {
          phase: 'active',
          challenge_starts_at: now,
          challenge_ends_at: now + durationMs,
          challenge_duration_ms: durationMs,
          is_paused: false,
        }))!;
        break;
      }

      // ── PAUSE / RESUME ─────────────────────────────────────────────────
      case 'pause': {
        session = (await updateSession(targetSessionId, {
          phase: 'paused',
          is_paused: true,
          pause_started_at: now,
        }))!;
        break;
      }

      case 'resume': {
        const pausedMs = session.pause_started_at ? now - session.pause_started_at : 0;
        const newEnd = (session.challenge_ends_at ?? now) + pausedMs;
        session = (await updateSession(targetSessionId, {
          phase: 'active',
          is_paused: false,
          pause_started_at: null,
          challenge_ends_at: newEnd,
        }))!;
        break;
      }

      // ── EXTEND TIME ───────────────────────────────────────────────────
      case 'extend': {
        const extraMinutes = Number(body.extraMinutes || 5);
        const newEnd = (session.challenge_ends_at ?? now) + extraMinutes * 60 * 1000;
        session = (await updateSession(targetSessionId, { challenge_ends_at: newEnd }))!;
        break;
      }

      // ── STOP / END ─────────────────────────────────────────────────────
      case 'stop':
      case 'endChallenge': {
        session = (await updateSession(targetSessionId, {
          phase: 'ended',
          is_paused: false,
        }))!;
        break;
      }

      // ── REVEAL ─────────────────────────────────────────────────────────
      case 'toggleReveal': {
        session = (await updateSession(targetSessionId, {
          phase: session.phase === 'reveal' ? 'ended' : 'reveal',
          is_reveal_mode: !session.is_reveal_mode,
        }))!;
        break;
      }

      // ── ANNOUNCEMENT ──────────────────────────────────────────────────
      case 'announcement': {
        session = (await updateSession(targetSessionId, {
          announcement: body.announcement || '',
        }))!;
        break;
      }

      // ── SESSION CONFIG ─────────────────────────────────────────────────
      case 'updateConfig': {
        const updates: any = {};
        if (body.label !== undefined) updates.label = body.label;
        if (body.notes !== undefined) updates.notes = body.notes;
        if (body.scheduledAt !== undefined) updates.scheduled_at = body.scheduledAt;
        if (body.maxParticipants !== undefined) updates.max_participants = body.maxParticipants;
        if (body.allowLateJoin !== undefined) updates.allow_late_join = body.allowLateJoin;
        if (body.durationMinutes !== undefined) updates.challenge_duration_ms = body.durationMinutes * 60 * 1000;
        if (body.autoStartOnRegClose !== undefined) updates.auto_start_on_reg_close = body.autoStartOnRegClose;
        session = (await updateSession(targetSessionId, updates))!;
        break;
      }

      // ── RENAME SESSION ─────────────────────────────────────────────────
      case 'renameSession': {
        const { label, notes } = body;
        if (!label || typeof label !== 'string' || !label.trim()) {
          return NextResponse.json({ error: 'Session label cannot be empty' }, { status: 400 });
        }
        session = (await renameSession(
          targetSessionId,
          label.trim(),
          notes !== undefined ? String(notes).trim() : undefined
        ))!;
        break;
      }

      // ── DELETE SESSION (AND ALL RELATED INFO CASCADE) ──────────────────
      case 'deleteSession': {
        const success = await deleteSession(targetSessionId);
        if (!success) {
          return NextResponse.json({ error: 'Failed to delete session and purge records' }, { status: 500 });
        }
        const remainingSessions = await getAllSessions();
        const nextActive = await getActiveSession();
        return NextResponse.json({
          success: true,
          message: 'Session and all associated questions, test cases, submissions, participants, and violations completely purged',
          sessions: remainingSessions,
          session: nextActive,
          contest: nextActive ? sessionToContestState(nextActive) : null,
          serverTime: now,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      contest: sessionToContestState(session),
      session,
      serverTime: now,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
