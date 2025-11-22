export type LanguageCode = "en" | "de";

type TranslationValue = Record<LanguageCode, string>;

export const TRANSLATIONS = {
  leaderboard: { en: "Leaderboard", de: "Bestenliste" },
  inviteFriends: { en: "Invite Friends", de: "Freunde einladen" },
  profile: { en: "Profile", de: "Profil" },
  signIn: { en: "Sign In", de: "Anmelden" },
  signOut: { en: "Sign Out", de: "Abmelden" },
  home: { en: "Home", de: "Startseite" },
  dashboard: { en: "Dashboard", de: "Übersicht" },
  players: { en: "Players", de: "Spieler" },
  standings: { en: "Standings", de: "Tabellen" },
  scoring: { en: "Scoring", de: "Bewertung" },
  language: { en: "Language", de: "Sprache" },
} as const satisfies Record<string, TranslationValue>;

export type TranslationKey = keyof typeof TRANSLATIONS;

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export const SUPPORTED_LANGUAGES: Array<{
  code: LanguageCode;
  label: string;
  flag: string;
}> = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
];

export function translate(key: TranslationKey, language: LanguageCode): string {
  const entry = TRANSLATIONS[key];
  if (!entry) {
    return key;
  }
  return entry[language] ?? entry[DEFAULT_LANGUAGE];
}
