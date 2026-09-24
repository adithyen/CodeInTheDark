import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET() {
  return NextResponse.json({
    contest: store.contest,
    serverTime: Date.now(),
    participantCount: store.participants.size,
    submissionCount: store.submissions.size,
    questionCount: store.questions.length,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, durationMinutes, announcement, passkey } = body;

    // Validate admin passkey
    if (passkey !== 'admin1111' && passkey !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Admin Passkey' }, { status: 401 });
    }

    const now = Date.now();

    switch (action) {
      case 'start':
        store.contest.isActive = true;
        store.contest.isPaused = false;
        store.contest.startTime = now;
        const duration = store.contest.durationMinutes || 50;
        store.contest.endTime = now + duration * 60 * 1000;
        break;

      case 'pause':
        store.contest.isPaused = !store.contest.isPaused;
        break;

      case 'extend':
        const extraMinutes = Number(body.extraMinutes || 5);
        if (store.contest.endTime) {
          store.contest.endTime += extraMinutes * 60 * 1000;
        }
        break;

      case 'stop':
        store.contest.isActive = false;
        store.contest.isPaused = false;
        break;

      case 'setDuration':
        if (durationMinutes && durationMinutes > 0) {
          store.contest.durationMinutes = durationMinutes;
          if (store.contest.isActive && store.contest.startTime) {
            store.contest.endTime = store.contest.startTime + durationMinutes * 60 * 1000;
          }
        }
        break;

      case 'announcement':
        store.contest.announcement = announcement || '';
        break;

      case 'toggleReveal':
        store.contest.isRevealMode = !store.contest.isRevealMode;
        break;

      case 'reset':
        store.contest.isActive = false;
        store.contest.isPaused = false;
        store.contest.startTime = null;
        store.contest.endTime = null;
        store.contest.isRevealMode = false;
        store.submissions.clear();
        store.violations = [];
        break;

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      contest: store.contest,
      serverTime: now,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
