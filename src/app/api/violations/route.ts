import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { Violation } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { participantId, type, details } = body;

    const participant = store.participants.get(participantId);
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    participant.strikes += 1;
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
