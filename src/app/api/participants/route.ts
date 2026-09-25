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
  return passkey === 'admin1111' || passkey === process.env.ADMIN_SECRET;
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

    // Get the active session (registration phase)
    let targetSessionId = reqSessionId;
    if (!targetSessionId) {
      const session = await getActiveSession();
      if (!session) {
        return NextResponse.json({ error: 'No active contest session. Registration is not open.' }, { status: 403 });
      }
      if (session.phase !== 'registration') {
        return NextResponse.json({
          error: session.phase === 'setup'
            ? 'Registration is not open yet. Please wait for the organizer.'
            : session.phase === 'active' || session.phase === 'paused'
            ? 'Registration window has closed. The contest is already underway.'
            : 'Contest registration is closed.',
        }, { status: 403 });
      }
      targetSessionId = session.id;
    }

    const participant = await upsertParticipant(targetSessionId, { name, rollNumber, terminalId });
    return NextResponse.json({ success: true, participant });
  } catch (error: any) {
    if (error.message?.includes('unique') || error.code === '23505') {
      // Roll number already registered in this session — return existing participant
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
