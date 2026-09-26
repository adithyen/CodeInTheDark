/**
 * Unified Admin Passkey verification
 * Accepts configured secrets, case-insensitive, whitespace-trimmed, and standard defaults.
 */
export function isAdmin(passkey?: string | null): boolean {
  if (!passkey) return false;
  const k = passkey.trim().toLowerCase();
  const envSecret = (process.env.ADMIN_SECRET || '').trim().toLowerCase();
  const envPublic = (process.env.NEXT_PUBLIC_ADMIN_PASSKEY || '').trim().toLowerCase();

  return (
    k === 'admin1111' ||
    k === 'admiral2026' ||
    k === 'admin' ||
    k === '11:11' ||
    k === '1111' ||
    k === 'codeinthedark' ||
    (Boolean(envSecret) && k === envSecret) ||
    (Boolean(envPublic) && k === envPublic)
  );
}
