// Des questions de curiosité pour « Apprendre », qui tournent chaque jour. Il n'y a pas besoin d'examen pour revenir.
export const CURIOSITY: string[] = [
  "Pourquoi le ciel est-il bleu ?",
  "Comment fonctionne la mémoire humaine ?",
  "Pourquoi oublie-t-on ce qu'on vient d'apprendre ?",
  "Comment fonctionne un trou noir ?",
  "Qu'est-ce que l'inflation, et pourquoi les prix montent ?",
  "Comment les vaccins entraînent-ils le corps ?",
  "Pourquoi les saisons existent-elles ?",
  "Comment fonctionne Internet, de ton téléphone au site ?",
  "Qu'est-ce que le théorème de Pythagore, et à quoi sert-il ?",
  "Comment les avions arrivent-ils à voler ?",
  "Pourquoi la Révolution française a-t-elle eu lieu ?",
  "Comment fonctionne le sommeil, et pourquoi en a-t-on besoin ?",
  "Qu'est-ce que l'ADN, expliqué simplement ?",
  "Comment une idée devient-elle une loi en France ?",
  "Pourquoi la Lune a-t-elle des phases ?",
  "Comment fonctionne une cellule solaire ?",
  "Qu'est-ce que la philosophie stoïcienne ?",
  "Comment fonctionne la bourse, expliquée simplement ?",
  "Pourquoi les dinosaures ont-ils disparu ?",
  "Comment l'IA apprend-elle à répondre à une question ?",
  "Qu'est-ce que l'effet de serre ?",
  "Comment fonctionne un intérêt composé ?",
  "Pourquoi parle-t-on plusieurs langues dans le monde ?",
  "Comment fonctionne le cœur humain ?",
  "Qu'est-ce que la relativité d'Einstein, sans formule ?",
  "Comment s'est construite l'Union européenne ?",
  "Pourquoi un aimant attire-t-il le fer ?",
  "Comment fonctionne l'imprimerie, et pourquoi a-t-elle tout changé ?",
  "Qu'est-ce que la méthode scientifique ?",
  "Comment retenir durablement ce qu'on apprend ?",
  "Pourquoi la mer est-elle salée ?",
  "Comment fonctionne un moteur électrique ?",
];

export function questionOfTheDay(offset = 0): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return CURIOSITY[(dayOfYear + offset) % CURIOSITY.length];
}
