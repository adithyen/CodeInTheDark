import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveSession,
  getSessionById,
  getParticipantsForSession,
  upsertParticipant,
  updateParticipant,
  deleteParticipant,
  getParticipantById,
} from '@/lib/db';

function isAdmin(passkey: string) {
  return passkey === 'admin1111' || passkey === 'admiral2026' || passkey === process.env.ADMIN_SECRET || passkey === process.env.NEXT_PUBLIC_ADMIN_PASSKEY;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const passkey = searchParams.get('passkey') || '';
  const sessionId = searchParams.get('sessionId');

  if (!isAdmin(passkey)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let targetSessionId = sessionId;
  if (!targetSessionId) {
    const active = await getActiveSession();
    targetSessionId = active?.id ?? null;
  }

  if (!targetSessionId) {
    return NextResponse.json({ participants: [] });
  }

  const participants = await getParticipantsForSession(targetSessionId);
  return NextResponse.json({ participants });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, rollNumber, terminalId, sessionId: reqSessionId } = body;

    if (!name || !rollNumber) {
      return NextResponse.json({ error: 'Name and Roll Number are required' }, { status: 400 });
    }

    // 1. Resolve session
    const session = reqSessionId ? await getSessionById(reqSessionId) : await getActiveSession();
    if (!session) {
      return NextResponse.json({ error: 'No active contest session found. Registration is not open.' }, { status: 403 });
    }

    // 2. Fetch existing participants for this session
    const existingParticipants = await getParticipantsForSession(session.id);
    const maxCapacity = (session.max_participants && session.max_participants > 0) ? session.max_participants : 200;
    const isAlreadyRegistered = existingParticipants.some(
      (p) => p.rollNumber.toLowerCase() === rollNumber.trim().toLowerCase()
    );

    // 3. Validate Phase & Late Join rule
    if (session.phase === 'setup') {
      return NextResponse.json({
        error: 'Registration is not open yet. Please wait for the organizer to initiate the voyage muster.',
      }, { status: 403 });
    }

    if (session.phase === 'active' || session.phase === 'paused') {
      if (!session.allow_late_join && !isAlreadyRegistered) {
        return NextResponse.json({
          error: 'Registration window has closed and late joining is disabled for this voyage.',
        }, { status: 403 });
      }
    } else if (session.phase === 'ended' || session.phase === 'reveal') {
      return NextResponse.json({
        error: 'This contest voyage has already concluded.',
      }, { status: 403 });
    }

    // 4. Enforce Max Participants Capacity
    if (!isAlreadyRegistered && existingParticipants.length >= maxCapacity) {
      return NextResponse.json({
        error: `Voyage roster is full. Maximum capacity of ${maxCapacity} navigators has been reached.`,
      }, { status: 403 });
    }

    // 4. Register or update participant
    const participant = await upsertParticipant(session.id, {
      name: name.trim(),
      rollNumber: rollNumber.trim(),
      terminalId,
    });
    return NextResponse.json({ success: true, participant, sessionPhase: session.phase });
  } catch (error: any) {
    if (error.message?.includes('unique') || error.code === '23505') {
      return NextResponse.json({ error: 'Roll number already registered for this session.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { passkey, participantId, action } = body;

    if (!isAdmin(passkey)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Passkey' }, { status: 401 });
    }

    if (!participantId) {
      return NextResponse.json({ error: 'Participant ID is required' }, { status: 400 });
    }

    const participant = await getParticipantById(participantId);
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    if (action === 'reset_strikes') {
      await updateParticipant(participantId, { strikes: 0, isLockedOut: false });
    } else if (action === 'add_strike') {
      const newStrikes = participant.strikes + 1;
      await updateParticipant(participantId, {
        strikes: newStrikes,
        isLockedOut: newStrikes >= 3,
      });
    } else if (action === 'toggle_lockout') {
      await updateParticipant(participantId, { isLockedOut: !participant.isLockedOut });
    } else if (action === 'delete') {
      await deleteParticipant(participantId);
      return NextResponse.json({ success: true, message: 'Participant deleted' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updated = await getParticipantById(participantId);
    return NextResponse.json({ success: true, participant: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
