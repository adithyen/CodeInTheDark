import { NextRequest, NextResponse } from 'next/server';
import { executeCode, ExecutionResult } from '@/lib/executor';
import { Language, TestCase } from '@/types';

export interface BatchTestResult {
  testCaseId: string;
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  statusDescription: string;
  timeMs: number;
  memoryKb: number;
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { language, code, stdin = '', testCases, passkey } = body;

    if (!language || !code) {
      return NextResponse.json(
        { error: 'Language and code are required' },
        { status: 400 }
      );
    }

    if (!['c', 'python', 'java'].includes(language)) {
      return NextResponse.json(
        { error: `Unsupported language "${language}". Supported: c, python, java` },
        { status: 400 }
      );
    }

    // Mode A: Single Execution with arbitrary stdin
    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      const result = await executeCode(language as Language, code, stdin);
      return NextResponse.json({
        success: result.isSuccess,
        language,
        result,
      });
    }

    // Mode B: Batch Test-Case Runner (evaluates suite of test cases)
    const batchResults: BatchTestResult[] = [];
    let passedCount = 0;

    for (const tc of testCases as TestCase[]) {
      const execResult: ExecutionResult = await executeCode(
        language as Language,
        code,
        tc.input || ''
      );

      const normalizedActual = (execResult.stdout || '').replace(/\r\n/g, '\n').trim();
      const normalizedExpected = (tc.expectedOutput || '').replace(/\r\n/g, '\n').trim();

      const passed = execResult.isSuccess && normalizedActual === normalizedExpected;
      if (passed) passedCount++;

      batchResults.push({
        testCaseId: tc.id || `tc-${Math.random().toString(36).substr(2, 5)}`,
        passed,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: normalizedActual,
        statusDescription: execResult.statusDescription,
        timeMs: execResult.timeMs,
        memoryKb: execResult.memoryKb,
        error: execResult.stderr || execResult.compileOutput || undefined,
      });
    }

    const totalCount = testCases.length;
    const passRatio = totalCount > 0 ? passedCount / totalCount : 0;

    return NextResponse.json({
      success: passedCount === totalCount,
      passedCount,
      totalCount,
      passRatio,
      allPassed: passedCount === totalCount,
      batchResults,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Execution failed' },
      { status: 500 }
    );
  }
}
