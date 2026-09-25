import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { Question } from '@/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const isAdmin = searchParams.get('admin') === 'true';
  const passkey = searchParams.get('passkey');

  const authenticated = isAdmin && (passkey === 'admin1111' || passkey === process.env.ADMIN_SECRET);

  if (authenticated) {
    // Return complete questions including all hidden test cases for organizers
    return NextResponse.json({ questions: store.questions });
  }

  // Sanitize for participants: strictly filter out hidden test cases
  const sanitized = store.questions.map((q) => ({
    ...q,
    testCases: q.testCases
      .filter((tc) => !tc.isHidden)
      .map((tc) => ({
        id: tc.id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: false,
        explanation: tc.explanation,
      })),
  }));

  return NextResponse.json({ questions: sanitized });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { passkey, question } = body;

    if (passkey !== 'admin1111' && passkey !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Admin Passkey' }, { status: 401 });
    }

    if (body.action === 'bulk_import') {
      const { questions } = body;
      if (!Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json({ error: 'Questions array is required for bulk import' }, { status: 400 });
      }
      store.questions = questions.map((q: any, idx: number) => ({
        ...q,
        id: q.id || `q-${Date.now()}-${idx + 1}`,
        order: idx + 1,
        testCases: q.testCases || [],
      }));
      return NextResponse.json({ success: true, count: store.questions.length, questions: store.questions });
    }

    if (!question || !question.title) {
      return NextResponse.json({ error: 'Invalid question payload' }, { status: 400 });
    }

    const newQuestion: Question = {
      ...question,
      id: question.id || `q-${Date.now()}`,
      order: store.questions.length + 1,
      testCases: question.testCases || [],
    };

    store.questions.push(newQuestion);
    return NextResponse.json({ success: true, question: newQuestion });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { passkey, question } = body;

    if (passkey !== 'admin1111' && passkey !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Admin Passkey' }, { status: 401 });
    }

    const index = store.questions.findIndex((q) => q.id === question.id);
    if (index === -1) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    store.questions[index] = { ...store.questions[index], ...question };
    return NextResponse.json({ success: true, question: store.questions[index] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const passkey = searchParams.get('passkey');

    if (passkey !== 'admin1111' && passkey !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Admin Passkey' }, { status: 401 });
    }

    store.questions = store.questions.filter((q) => q.id !== id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
