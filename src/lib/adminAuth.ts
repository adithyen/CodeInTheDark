/**
 * Unified Admin Passkey verification
 */
export function isAdmin(passkey?: string | null): boolean {
  if (!passkey) return false;
  const k = passkey.trim();
  const envSecret = (process.env.ADMIN_SECRET || '').trim();
  const envPublic = (process.env.NEXT_PUBLIC_ADMIN_PASSKEY || '').trim();

  const decoded = decodeURIComponent(k);
  return (
    k === 'CD#11:11' ||
    k.toLowerCase() === 'cd#11:11' ||
    decoded === 'CD#11:11' ||
    decoded.toLowerCase() === 'cd#11:11' ||
    (Boolean(envSecret) && (k === envSecret || decoded === envSecret)) ||
    (Boolean(envPublic) && (k === envPublic || decoded === envPublic))
  );
}
