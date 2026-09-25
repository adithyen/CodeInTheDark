/**
 * Sets Supabase env vars on the Vercel project via REST API.
 * Run: node scripts/set_vercel_env.mjs <VERCEL_TOKEN>
 *
 * Get your Vercel token from: https://vercel.com/account/tokens
 */

const VERCEL_TOKEN = process.argv[2];
const PROJECT_ID   = 'prj_9a768iVUkGmcFRRCZOqhy5UiTPmh';
const TEAM_ID      = 'team_kqLIPLbA9YNNZfu2bdc7pPbD';

if (!VERCEL_TOKEN) {
  console.error('Usage: node scripts/set_vercel_env.mjs <VERCEL_TOKEN>');
  console.error('Get your token from: https://vercel.com/account/tokens');
  process.exit(1);
}

const envVars = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    value: 'https://ljdiufspcgbijgjuelnw.supabase.co',
    type: 'plain',
    target: ['production', 'preview', 'development'],
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZGl1ZnNwY2diaWpnanVlbG53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDM0NjYyMSwiZXhwIjoyMTA1OTIyNjIxfQ.eFiKQSPS3o2ytb6qRoBN-tCdqHkZ6Tja9HW-leH4ZR4',
    type: 'sensitive',
    target: ['production', 'preview', 'development'],
  },
  {
    key: 'ADMIN_SECRET',
    value: 'admin1111',
    type: 'sensitive',
    target: ['production', 'preview', 'development'],
  },
];

const BASE = `https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}&upsert=true`;

for (const v of envVars) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key: v.key,
      value: v.value,
      type: v.type,
      target: v.target,
    }),
  });

  if (res.ok) {
    console.log(`✅ Set ${v.key}`);
  } else {
    const err = await res.json().catch(() => ({}));
    console.error(`❌ Failed ${v.key}: ${err.error?.message ?? res.status}`);
  }
}

console.log('\nDone. Now run: npx vercel --prod to deploy.');
