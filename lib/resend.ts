import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY!);

export function emailLayout(
  content: string,
  ctaLabel: string = "Ouvrir FishFlow",
  ctaUrl: string = "https://fishflow.fr/generer",
  unsubscribeUrl?: string
) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px; background:#ffffff;">
    <div style="text-align:center;margin-bottom:28px;">
      <img src="https://fishflow.fr/icons/icon-512.png" width="40" height="40" alt="FishFlow" style="border-radius:9px;vertical-align:middle;margin-right:10px;" />
      <span style="font-size:20px;font-weight:700;color:#111111;vertical-align:middle;">FishFlow</span>
    </div>
    ${content}
    <div style="text-align:center;margin:28px 0 8px;">
      <a href="${ctaUrl}" style="background:#22C55E;color:#ffffff;padding:12px 30px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">${ctaLabel}</a>
    </div>
    <p style="color:#9CA3AF;font-size:12px;text-align:center;margin-top:24px;">FishFlow — fiches de révision par IA</p>
    ${unsubscribeUrl ? `<p style="text-align:center;margin-top:8px;"><a href="${unsubscribeUrl}" style="color:#9CA3AF;font-size:12px;">Se désinscrire de ces emails</a></p>` : ""}
  </div>`;
}

// Fabrique le header List-Unsubscribe (norme reconnue par Gmail/Outlook pour juger la réputation d'un expéditeur).
export function unsubscribeHeaders(userId: string) {
  const url = `https://fishflow.fr/api/unsubscribe?id=${userId}`;
  return {
    "List-Unsubscribe": `<${url}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}