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

// ─────────────────────────────────────────────────────────────────────
// 1. PISTON RUNNER (Ultra-fast, self-hostable, zero rate limits)
// ─────────────────────────────────────────────────────────────────────
async function executeWithPiston(
  pistonBaseUrl: string,
  language: Language,
  code: string,
  stdin: string = ''
): Promise<ExecutionResult> {
  const langMap: Record<Language, { lang: string; version: string; file: string }> = {
    c: { lang: 'c', version: '*', file: 'main.c' },
    python: { lang: 'python', version: '*', file: 'main.py' },
    java: { lang: 'java', version: '*', file: 'Main.java' },
  };

  const target = langMap[language];
  const url = `${pistonBaseUrl.replace(/\/+$/, '')}/api/v2/execute`;

  const startTime = Date.now();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      'User-Agent': 'CodeInTheDark-11-11-Runner',
    },
    body: JSON.stringify({
      language: target.lang,
      version: target.version,
      files: [{ name: target.file, content: code }],
      stdin: stdin,
      run_timeout: 3500,
      compile_timeout: 5000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Piston runner offline (HTTP ${response.status}): ${errText.slice(0, 100)}`);
  }

  const data = await response.json();
  const run = data.run || {};
  const compile = data.compile || {};

  const stdout = (run.stdout || '').trim();
  const stderr = (run.stderr || compile.stderr || '').trim();
  const compileOutput = (compile.output || compile.stderr || '').trim();

  // Compilation Error
  if (compile.code && compile.code !== 0) {
    return {
      stdout: '',
      stderr: compileOutput || compile.stderr || 'Compilation error',
      compileOutput,
      statusId: 6,
      statusDescription: 'Compilation Error',
      timeMs: Date.now() - startTime,
      memoryKb: 0,
      isSuccess: false,
    };
  }

  // Time Limit Exceeded (killed by signal)
  if (run.signal === 'SIGTERM' || run.signal === 'SIGKILL') {
    return {
      stdout,
      stderr: 'Time Limit Exceeded (3.5s)',
      compileOutput,
      statusId: 5,
      statusDescription: 'Time Limit Exceeded',
      timeMs: Date.now() - startTime,
      memoryKb: 0,
      isSuccess: false,
    };
  }

  const isSuccess = run.code === 0 && !stderr;

  return {
    stdout,
    stderr,
    compileOutput,
    statusId: isSuccess ? 3 : 11, // 3 = Accepted, 11 = Runtime Error
    statusDescription: isSuccess ? 'Accepted' : (stderr ? 'Runtime Error' : 'Unknown Error'),
    timeMs: Date.now() - startTime,
    memoryKb: 0,
    isSuccess,
  };
}

// ─────────────────────────────────────────────────────────────────────
// 2. JUDGE0 RUNNER (Self-hosted or RapidAPI or public demo)
// ─────────────────────────────────────────────────────────────────────
async function executeWithJudge0(
  language: Language,
  code: string,
  stdin: string = ''
): Promise<ExecutionResult> {
  const languageId = JUDGE0_LANGUAGE_IDS[language];

  const baseUrl = process.env.JUDGE0_URL || process.env.JUDGE0_API_URL || 'https://ce.judge0.com';
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  const rapidApiHost = process.env.RAPIDAPI_HOST || 'judge0-ce.p.rapidapi.com';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (rapidApiKey) {
    headers['X-RapidAPI-Key'] = rapidApiKey;
    headers['X-RapidAPI-Host'] = rapidApiHost;
  }

  const url = `${baseUrl.replace(/\/+$/, '')}/submissions?wait=true`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
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
}

// ─────────────────────────────────────────────────────────────────────
// 3. MAIN EXECUTOR (Auto-selects Piston if PISTON_URL is provided, else Judge0)
// ─────────────────────────────────────────────────────────────────────
export async function executeCode(
  language: Language,
  code: string,
  stdin: string = ''
): Promise<ExecutionResult> {
  const pistonUrl = process.env.PISTON_URL || process.env.NEXT_PUBLIC_PISTON_URL;

  if (pistonUrl && pistonUrl.trim()) {
    try {
      return await executeWithPiston(pistonUrl.trim(), language, code, stdin);
    } catch (pistonErr: any) {
      console.warn('Piston runner offline/error, seamlessly falling back to Judge0 cloud:', pistonErr?.message || pistonErr);
    }
  }

  try {
    return await executeWithJudge0(language, code, stdin);
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

