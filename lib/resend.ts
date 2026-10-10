import { Resend } from "resend";

// Créé seulement au premier envoi : le build n'a pas besoin de la clé.
let client: Resend | null = null;
function getResend() {
  if (!client) client = new Resend(process.env.RESEND_API_KEY!);
  return client;
}

// Version texte du mail : les boîtes mail se méfient des messages qui n'ont que du HTML.
export function htmlToText(html: string) {
  return html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g, "$2 : $1")
    .replace(/<\/(p|div|h[1-6])>/g, "\n\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Mail = { from: string; to: string | string[]; subject: string; html: string; headers?: Record<string, string> };
export function sendMail(mail: Mail) {
  return getResend().emails.send({ ...mail, text: htmlToText(mail.html) });
}

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