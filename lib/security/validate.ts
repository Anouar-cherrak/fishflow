// Vérification des données envoyées par le navigateur : on ne fait jamais confiance à ce qui arrive.

export const PASSWORD_MIN = 8;
// Au-delà de 72 caractères, Supabase ignore la fin du mot de passe : on refuse plutôt que de tromper la personne.
export const PASSWORD_MAX = 72;

// Lit un corps JSON en refusant les envois trop gros. Renvoie null si ce n'est pas un objet JSON valide.
export async function readJson(req: Request, maxBytes = 10_000): Promise<Record<string, unknown> | null> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return null;
  try {
    const text = await req.text();
    if (text.length > maxBytes) return null;
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function asEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function asString(value: unknown, max: number): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > max) return null;
  return value;
}

// Code reçu par email : seulement des chiffres (6 à 10 selon le réglage Supabase).
export function asCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.replace(/\s/g, "");
  return /^\d{6,10}$/.test(code) ? code : null;
}

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Choisis un mot de passe d'au moins ${PASSWORD_MIN} caractères.`;
  if (password.length > PASSWORD_MAX) return `Ton mot de passe est trop long : ${PASSWORD_MAX} caractères au maximum.`;
  return null;
}
