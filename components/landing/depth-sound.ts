// « Clic » mécanique du profondimètre, joué seulement si la personne a activé le son.
// Web Audio : aucun fichier à télécharger. Plus on descend, plus le clic est grave.
let ctx: AudioContext | null = null;
let last = 0;

export function enableDepthSound(): boolean {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;
    ctx = ctx ?? new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return true;
  } catch {
    return false;
  }
}

export function disableDepthSound() {
  void ctx?.suspend();
}

export function depthClick(meters: number) {
  if (!ctx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  if (now - last < 0.045) return; // jamais plus de ~20 clics par seconde
  last = now;
  const freq = Math.max(700, 2600 - meters * 1.6);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.03);
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = 6;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.04);
  // Un petit « tic » dans la main aussi, sur les téléphones qui le permettent (tous les 50 m).
  if (Math.round(meters) % 50 === 0) navigator.vibrate?.(4);
}
