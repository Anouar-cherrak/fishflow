"use client";

// Retirer ou changer son accord pour les cookies doit être aussi simple que le donner (CNIL) :
// on oublie le choix, puis la page se recharge et la bannière revient.
export function CookieChoice({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        try {
          localStorage.removeItem("ff-consent");
        } catch {}
        location.reload();
      }}
    >
      Gérer les cookies
    </button>
  );
}
