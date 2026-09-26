import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveSession,
  getSessionById,
  getQuestionsForSession,
  upsertQuestion,
  deleteQuestion,
  bulkImportQuestions,
} from '@/lib/db';
import { Question } from '@/types';

import { isAdmin } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adminFlag = searchParams.get('admin') === 'true';
  const passkey = searchParams.get('passkey') || '';
  const sessionId = searchParams.get('sessionId');

  const authenticated = adminFlag && isAdmin(passkey);

  let targetSessionId = sessionId;
  if (!targetSessionId) {
    const session = await getActiveSession();
    targetSessionId = session?.id ?? null;
  }

  if (!targetSessionId) {
    return NextResponse.json({ questions: [] });
  }

  const questions = await getQuestionsForSession(targetSessionId, authenticated);
  return NextResponse.json({ questions });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { passkey, question, questions, action, sessionId: reqSessionId } = body;

    if (!isAdmin(passkey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve session
    let targetSessionId = reqSessionId;
    if (!targetSessionId) {
      const session = await getActiveSession();
      targetSessionId = session?.id ?? null;
    }
    if (!targetSessionId) {
      return NextResponse.json({ error: 'No active session found' }, { status: 404 });
    }

    if (action === 'bulk_import') {
      if (!Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json({ error: 'Questions array required' }, { status: 400 });
      }
      await bulkImportQuestions(targetSessionId, questions);
      const updated = await getQuestionsForSession(targetSessionId, true);
      return NextResponse.json({ success: true, count: updated.length, questions: updated });
    }

    if (!question || !question.title) {
      return NextResponse.json({ error: 'Invalid question payload' }, { status: 400 });
    }

    const saved = await upsertQuestion(targetSessionId, question as Partial<Question>);
    return NextResponse.json({ success: true, question: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { passkey, question, sessionId: reqSessionId } = body;

    if (!isAdmin(passkey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let targetSessionId = reqSessionId;
    if (!targetSessionId) {
      const session = await getActiveSession();
      targetSessionId = session?.id ?? null;
    }
    if (!targetSessionId) {
      return NextResponse.json({ error: 'No active session' }, { status: 404 });
    }

    const saved = await upsertQuestion(targetSessionId, question as Partial<Question>);
    return NextResponse.json({ success: true, question: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const passkey = searchParams.get('passkey') || '';

    if (!isAdmin(passkey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Question ID required' }, { status: 400 });
    }

    await deleteQuestion(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
