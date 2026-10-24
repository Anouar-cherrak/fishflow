// Change le thème d'un coup, sans clignotement : pendant le changement, les transitions de couleur
// sont coupées (sinon chaque bouton et chaque carte changerait de couleur à sa propre vitesse).
export function setDarkClass(dark: boolean) {
  const root = document.documentElement;
  root.classList.add("ff-theme-switch");
  root.classList.toggle("dark", dark);
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("ff-theme-switch")));
}
