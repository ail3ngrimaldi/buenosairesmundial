// Emails that get admin access to the panel. Keep in sync with the
// `is_admin()` SQL function in supabase/migrations.
export const ADMIN_EMAILS = ["ailenrgrimaldi@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
