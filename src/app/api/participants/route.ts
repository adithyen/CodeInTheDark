import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { Participant } from '@/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const passkey = searchParams.get('passkey');

  if (passkey !== 'admin1111' && passkey !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const list = Array.from(store.participants.values());
  return NextResponse.json({ participants: list });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, rollNumber, terminalId } = body;

    if (!name || !rollNumber) {
      return NextResponse.json({ error: 'Name and Roll Number / Team are required' }, { status: 400 });
    }

    // Participant ID key: sanitized rollNumber
    const id = rollNumber.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const existing = store.participants.get(id);

    const now = Date.now();
    const participant: Participant = existing || {
      id,
      name: name.trim(),
      rollNumber: rollNumber.trim().toUpperCase(),
      terminalId: terminalId ? terminalId.trim().toUpperCase() : `NODE-${Math.floor(100 + Math.random() * 900)}`,
      registeredAt: now,
      strikes: 0,
      isLockedOut: false,
      lastActiveAt: now,
    };

    participant.lastActiveAt = now;
    store.participants.set(id, participant);

    return NextResponse.json({ success: true, participant });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { passkey, participantId, action } = body;

    if (passkey !== 'admin1111' && passkey !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Passkey' }, { status: 401 });
    }

    if (!participantId) {
      return NextResponse.json({ error: 'Participant ID is required' }, { status: 400 });
    }

    const participant = store.participants.get(participantId);
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    if (action === 'reset_strikes') {
      participant.strikes = 0;
      participant.isLockedOut = false;
    } else if (action === 'add_strike') {
      participant.strikes += 1;
      if (participant.strikes >= 3) {
        participant.isLockedOut = true;
      }
    } else if (action === 'toggle_lockout') {
      participant.isLockedOut = !participant.isLockedOut;
    } else if (action === 'delete') {
      store.participants.delete(participantId);
      return NextResponse.json({ success: true, message: 'Participant deleted' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, participant });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
