// Vérifie le VRAI contenu des fichiers envoyés (les premiers octets), pas seulement leur nom ou le type annoncé par le navigateur :
// un fichier renommé en « .pdf » ou en « .jpg » est refusé.

export type ImageType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export function isPdf(bytes: Uint8Array): boolean {
  // « %PDF- » doit apparaître au tout début (on tolère quelques octets avant, comme les lecteurs PDF).
  const head = Buffer.from(bytes.subarray(0, 1024)).toString("latin1");
  return head.includes("%PDF-");
}

export function imageType(bytes: Uint8Array): ImageType | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 12 && Buffer.from(b.subarray(0, 4)).toString("latin1") === "RIFF" && Buffer.from(b.subarray(8, 12)).toString("latin1") === "WEBP") return "image/webp";
  if (b.length >= 6 && Buffer.from(b.subarray(0, 6)).toString("latin1").startsWith("GIF8")) return "image/gif";
  return null;
}

// Coupe une opération trop longue (ex. un PDF piégé qui ferait tourner le serveur sans fin).
export function withTimeout<T>(promise: Promise<T>, ms: number, label = "TIMEOUT"): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error(label), { code: label })), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}
