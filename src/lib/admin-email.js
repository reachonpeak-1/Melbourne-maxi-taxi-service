// Shared by the client login/guard and the server-side verifyAdmin check.
// NEXT_PUBLIC_ADMIN_EMAIL is inlined at build time, so changing it requires a rebuild/redeploy.
const normalize = (email) => (email || '').trim().toLowerCase();

export function getAdminEmail() {
  return normalize(process.env.NEXT_PUBLIC_ADMIN_EMAIL || process.env.ADMIN_EMAIL);
}

export function isAdminEmail(email) {
  const expected = getAdminEmail();
  return Boolean(expected) && normalize(email) === expected;
}
