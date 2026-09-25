import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:CodeInTheDark@db.ljdiufspcgbijgjuelnw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

await client.connect();

// Reset the test session back to 'setup' phase
await client.query(`
  UPDATE contest_sessions
  SET phase = 'setup',
      registration_opens_at = NULL,
      registration_ends_at = NULL,
      challenge_starts_at = NULL,
      challenge_ends_at = NULL,
      is_paused = false,
      announcement = '',
      is_reveal_mode = false,
      updated_at = NOW()
  WHERE id = '626016a3-6474-43ca-b7ee-1210ecc336a5'
`);

console.log('✅ Session reset to setup phase. Ready for your real event!');
await client.end();
