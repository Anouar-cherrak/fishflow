// Ce qu'une fiche partagée par lien a le droit de montrer : tout sauf le cours d'origine (sourceText),
// qui peut contenir des notes personnelles. Utilisé par la page publique /p/[id].
export function publicFicheData<T extends Record<string, unknown>>(data: T): Omit<T, "sourceText"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sourceText, ...rest } = data;
  return rest;
}
