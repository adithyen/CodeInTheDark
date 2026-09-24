import { Language } from '@/types';

const JUDGE0_LANGUAGE_IDS: Record<Language, number> = {
  c: 103, // C (GCC 14.1.0)
  python: 100, // Python (3.12.5)
  java: 91, // Java (JDK 17.0.6)
};

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  compileOutput?: string;
  statusId: number;
  statusDescription: string;
  timeMs: number;
  memoryKb: number;
  isSuccess: boolean;
}

export async function executeCode(
  language: Language,
  code: string,
  stdin: string = ''
): Promise<ExecutionResult> {
  const languageId = JUDGE0_LANGUAGE_IDS[language];

  try {
    const response = await fetch('https://ce.judge0.com/submissions?wait=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language_id: languageId,
        source_code: code,
        stdin: stdin,
        cpu_time_limit: 3.5,
        memory_limit: 128000, // 128MB
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        stdout: '',
        stderr: `Execution service error: ${response.status} - ${errText}`,
        statusId: 13,
        statusDescription: 'Internal Error',
        timeMs: 0,
        memoryKb: 0,
        isSuccess: false,
      };
    }

    const data = await response.json();
    const stdout = (data.stdout || '').trim();
    const stderr = (data.stderr || '').trim();
    const compileOutput = (data.compile_output || '').trim();
    const timeMs = Math.round(parseFloat(data.time || '0') * 1000);
    const memoryKb = data.memory || 0;
    const statusId = data.status?.id || 0;
    const statusDescription = data.status?.description || 'Unknown';

    // Status ID 3 = Accepted
    const isSuccess = statusId === 3;

    return {
      stdout,
      stderr: stderr || compileOutput,
      compileOutput,
      statusId,
      statusDescription,
      timeMs,
      memoryKb,
      isSuccess,
    };
  } catch (error: any) {
    return {
      stdout: '',
      stderr: error.message || 'Network connection failed during sandbox execution',
      statusId: 13,
      statusDescription: 'Sandbox Connection Failed',
      timeMs: 0,
      memoryKb: 0,
      isSuccess: false,
    };
  }
}
