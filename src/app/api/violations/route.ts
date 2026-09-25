import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveSession,
  getParticipantById,
  updateParticipant,
  insertViolation,
  getViolationsForSession,
} from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { participantId, name, type, details, currentStrikes, sessionId: reqSessionId } = body;

    if (!participantId) {
      return NextResponse.json({ error: 'Participant ID is required' }, { status: 400 });
    }

    let targetSessionId = reqSessionId;
    if (!targetSessionId) {
      const session = await getActiveSession();
      targetSessionId = session?.id ?? null;
    }
    if (!targetSessionId) {
      return NextResponse.json({ error: 'No active session' }, { status: 403 });
    }

    const participant = await getParticipantById(participantId);
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Sync strike count — take max of DB value and client-reported value
    const newStrikes = Math.max(participant.strikes + 1, (currentStrikes ?? 0) + 1);
    const isLockedOut = newStrikes >= 3;

    await updateParticipant(participantId, { strikes: newStrikes, isLockedOut });
    await insertViolation({
      sessionId: targetSessionId,
      participantId,
      participantName: participant.name,
      type: type || 'tab_blur',
      details: details || '',
      strikeCount: newStrikes,
    });

    return NextResponse.json({
      success: true,
      strikes: newStrikes,
      isLockedOut,
      message: isLockedOut
        ? 'STRIKE 3: Participant locked out due to repeated anti-cheat violations.'
        : `WARNING: Anti-cheat violation recorded. Strike ${newStrikes}/3.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const passkey = searchParams.get('passkey') || '';
  const sessionId = searchParams.get('sessionId');

  if (passkey !== 'admin1111' && passkey !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let targetSessionId = sessionId;
  if (!targetSessionId) {
    const session = await getActiveSession();
    targetSessionId = session?.id ?? null;
  }
  if (!targetSessionId) return NextResponse.json({ violations: [] });

  const violations = await getViolationsForSession(targetSessionId);
  return NextResponse.json({ violations });
}
