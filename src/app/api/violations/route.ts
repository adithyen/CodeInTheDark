import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { Violation } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { participantId, name, rollNumber, terminalId, type, details, currentStrikes } = body;

    if (!participantId) {
      return NextResponse.json({ error: 'Participant ID is required' }, { status: 400 });
    }

    let participant = store.participants.get(participantId);
    if (!participant) {
      // Auto-hydrate in serverless runtime containers
      const now = Date.now();
      participant = {
        id: participantId,
        name: name || participantId,
        rollNumber: rollNumber || 'UNKNOWN',
        terminalId: terminalId || 'NODE-1',
        registeredAt: now,
        strikes: currentStrikes !== undefined ? Math.max(0, currentStrikes - 1) : 0,
        isLockedOut: false,
        lastActiveAt: now,
      };
      store.participants.set(participantId, participant);
    }

    if (currentStrikes !== undefined) {
      participant.strikes = Math.max(participant.strikes + 1, currentStrikes);
    } else {
      participant.strikes += 1;
    }

    if (participant.strikes >= 3) {
      participant.isLockedOut = true;
    }

    const violation: Violation = {
      id: `viol-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      participantId,
      participantName: participant.name,
      type: type || 'tab_blur',
      timestamp: Date.now(),
      strikeCount: participant.strikes,
      details: details || '',
    };

    store.violations.unshift(violation);

    return NextResponse.json({
      success: true,
      strikes: participant.strikes,
      isLockedOut: participant.isLockedOut,
      message: participant.isLockedOut
        ? 'STRIKE 3: Participant locked out due to repeated anti-cheat violations.'
        : `WARNING: Anti-cheat violation recorded. Strike ${participant.strikes}/3.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const passkey = searchParams.get('passkey');

  if (passkey !== 'admin1111' && passkey !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ violations: store.violations });
}
