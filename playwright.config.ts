import { defineConfig, devices } from "@playwright/test";

// Parcours complets sur téléphone (iPhone, Android) et ordinateur, en clair et en sombre.
// Le site doit tourner (npm run build puis npm start, ou BASE=https://… pour un aperçu Vercel).
// Moteur : Chromium partout (le vrai Safari de l'iPhone n'est pas installé ici : à tester sur un vrai téléphone).
const BASE = process.env.BASE || "http://localhost:3000";
const iphone = { ...devices["iPhone 13"], browserName: "chromium" as const, defaultBrowserType: "chromium" as const };

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  fullyParallel: true,
  workers: 4,
  reporter: [["list"]],
  use: { baseURL: BASE, trace: "off" },
  projects: [
    { name: "iphone-clair", use: { ...iphone, colorScheme: "light" } },
    { name: "iphone-sombre", use: { ...iphone, colorScheme: "dark" } },
    { name: "android-clair", use: { ...devices["Pixel 7"], colorScheme: "light" } },
    { name: "android-sombre", use: { ...devices["Pixel 7"], colorScheme: "dark" } },
    { name: "ordi-clair", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, colorScheme: "light" } },
    { name: "ordi-sombre", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, colorScheme: "dark" } },
  ],
});
