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
  // Même univers que le site : un bandeau d'eau profonde en haut, le message sur une « plaque » claire,
  // le bouton bleu FishFlow (texte foncé : contraste 7,7:1). Styles en ligne seulement (les boîtes mail l'exigent).
  return `
  <div style="background:#DCEFF9;padding:24px 12px;">
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto;">
    <div style="background:#0B3352;background-image:linear-gradient(180deg,#11476E,#0B3352);border-radius:24px 24px 0 0;padding:22px 20px;text-align:center;">
      <img src="https://fishflow.fr/brand/logo-email.png" width="44" height="44" alt="FishFlow" style="vertical-align:middle;margin-right:8px;" />
      <span style="font-size:21px;font-weight:800;color:#EAF6FF;vertical-align:middle;letter-spacing:-0.3px;">Fish<span style="color:#38BDF8;">Flow</span></span>
    </div>
    <div style="background:#ffffff;border-radius:0 0 20px 20px;padding:28px 22px 26px;color:#052036;font-size:15px;line-height:1.55;">
      ${content}
      <div style="text-align:center;margin:26px 0 4px;">
        <a href="${ctaUrl}" style="background:#38BDF8;color:#052036;padding:13px 30px;border-radius:999px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">${ctaLabel}</a>
      </div>
    </div>
    <p style="color:#2D506B;font-size:12px;text-align:center;margin-top:18px;">FishFlow : révise en profondeur, à partir de tes propres cours.</p>
    ${unsubscribeUrl ? `<p style="text-align:center;margin-top:6px;"><a href="${unsubscribeUrl}" style="color:#2D506B;font-size:12px;">Ne plus recevoir ces e-mails</a></p>` : ""}
  </div>
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