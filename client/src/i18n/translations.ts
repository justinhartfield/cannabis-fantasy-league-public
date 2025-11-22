export type LanguageCode = "en" | "de";

type TranslationLeaf = string;
type TranslationBranch = { [key: string]: TranslationNode };
export type TranslationNode = TranslationLeaf | TranslationBranch;
export type TranslationTree = TranslationBranch;
export type TranslationSchema = Record<LanguageCode, TranslationTree>;

const EN_TRANSLATIONS: TranslationTree = {
  nav: {
    home: "Home",
    dashboard: "Dashboard",
    leaderboard: "Leaderboard",
    inviteFriends: "Invite Friends",
    profile: "Profile",
    language: "Language",
    players: "Players",
    standings: "Standings",
    scoring: "Scoring",
    waivers: "Waivers",
    trades: "Trades",
    lineup: "Lineup",
    playoffs: "Playoffs",
    matchups: "Matchups",
    createLeague: "Create League",
    joinLeague: "Join League",
    admin: "Admin",
  },
  auth: {
    signIn: "Sign In",
    signOut: "Sign Out",
    welcomeBack: "Welcome back!",
    signInPrompt: "Please sign in to continue",
    continueWithEmail: "Continue with email",
    createAccount: "Create an account",
    profileLinkAria: "Open profile",
  },
  common: {
    loading: "Loading…",
    saving: "Saving…",
    confirm: "Confirm",
    cancel: "Cancel",
    close: "Close",
    continue: "Continue",
    copyLink: "Copy link",
    share: "Share",
    refresh: "Refresh",
    searchPlaceholder: "Search…",
    yes: "Yes",
    no: "No",
  },
  layout: {
    toggleSidebar: "Toggle sidebar",
    userMenu: "User menu",
  },
  dashboard: {
    platformStats: "Platform Stats",
    createNewLeagueTitle: "Create New League",
    createNewLeagueDescription: "Start a season-long fantasy experience",
    dailyChallengeTitle: "Daily Challenge",
    dailyChallengeDescription: "24-hour head-to-head battles",
    gotInviteCode: "Got invite code?",
    enterCodePlaceholder: "Enter code",
    joinButton: "Join",
    noLeaguesTitle: "Ready to Compete?",
    noLeaguesDescription:
      "Create your first league or join an existing one to start your fantasy journey.",
  },
  createLeague: {
    headerTitle: "Create New League",
    basicInfo: "Basic Information",
    basicInfoDescription: "Set the core settings for your league.",
    leagueName: "League name",
    descriptionPlaceholder: "Describe your league…",
    publicLeagueLabel: "Public league",
    seasonLength: "Season length",
    maxTeams: "Maximum teams",
    playoffTeams: "Playoff teams",
    draftSettings: "Draft Settings",
    draftDate: "Draft date (optional)",
    submit: "Create league",
    cancel: "Cancel",
    successToast: "League created successfully!",
    nameRequired: "Please enter a league name",
    errorToast: "Failed to create league. Please try again.",
  },
  invite: {
    pageTitle: "Invite friends",
    description:
      "Share your personal link and earn streak freeze rewards when friends join their first league.",
    inviteLinkLabel: "Shareable link",
    referralCodeLabel: "Your referral code",
    copySuccess: "Invite link copied to clipboard!",
    copyError: "Failed to copy link. Please copy it manually.",
    shareCta: "Share with friends",
    backButton: "Back to Dashboard",
    highlight: "+1 streak freeze per successful referral",
    cardTitle: "Your invite link",
    cardDescription:
      "Friends who join using this link and create a team will earn you a streak freeze token.",
    copyButton: "Copy",
    refreshButton: "Refresh",
    shareLink: "Copy link",
    rewardsTitle: "Rewards overview",
    rewardsDescription: "Track how your invites are turning into in-game power-ups.",
    stats: {
      streakTokens: "Streak freeze tokens",
      completed: "Completed referrals",
      total: "Total referrals",
    },
    howItWorksTitle: "How it works",
    howItWorksDescription:
      "Simple, transparent rewards tied to your friends' first league.",
    steps: {
      share: "Share your invite link or code with friends.",
      join: "Your friend signs up and joins their first league.",
      reward:
        "You automatically earn 1 streak freeze token for each friend who joins their first league.",
    },
    shareTitle: "Join my Cannabis Fantasy League",
    shareMessage:
      "Join me in the Cannabis Fantasy League! Use my link to get started and unlock rewards.",
  },
  scoring: {
    title: "Scoring",
    calculating: "Calculating scores…",
    calculateButton: "Recalculate scores",
    liveScores: "Live scores",
    weekSelectorLabel: "Week",
    yearSelectorLabel: "Year",
    noData: "No scoring data yet for this week.",
    calculateSuccess: "Scores calculated successfully!",
    calculateError: "Failed to calculate scores: {message}",
    liveUpdate: "{team} scored {points} points!",
    liveAllUpdated: "All scores updated!",
    weekComplete: "Scoring complete for Week {week}!",
    refreshing: "Refreshing...",
    refresh: "Refresh",
    calculatingLabel: "Calculating...",
    selectWeekTitle: "Select Week",
    leaderboardEmptyTitle: "No scores yet for this week.",
    leaderboardEmptyDescription:
      "Scores appear after weekly stats are synced and scoring has been run for the selected year and week.",
  },
  prediction: {
    title: "Prediction Streak",
    subtitle: "Pick the winners and build your streak",
    submitSuccess:
      "Predictions submitted! Check back tomorrow to see how you did.",
    submitError: "Submission failed: {message}",
    freezeActivated:
      "Streak freeze activated for today. One loss will not break your streak.",
    freezeAlreadyActive: "You already have an active streak freeze for today.",
    stats: {
      current: "Current Streak",
      best: "Best Streak",
      accuracy: "Accuracy",
      total: "Total Correct",
      freezes: "Streak Freezes",
      activate: "Activate for today",
      activating: "Activating...",
    },
    results: {
      title: "Yesterday's Results",
      summary: "You got {correct} out of {total} correct",
      accuracy: "{value}% accuracy",
      winner: "Winner: {name}",
    },
    matchups: {
      title: "Today's Matchups",
      empty: "No matchups available today. Check back tomorrow!",
      submitPending: "Submitting...",
      submitCta: "Submit Predictions ({current}/{total})",
      submitted:
        "✓ Predictions submitted! Check back tomorrow to see your results.",
    },
    errors: {
      incomplete: "Please make a prediction for all matchups.",
      freezeFailed: "Failed to activate streak freeze.",
    },
  },
  toasts: {
    genericSuccess: "Saved successfully!",
    genericError: "Something went wrong. Please try again.",
    linkCopied: "Link copied!",
  },
  errors: {
    generic: "Something went wrong. Please try again.",
    requiredField: "This field is required.",
    invalidCode: "Invite code must be exactly 6 characters.",
  },
  home: {
    hero: {
      subheading:
        "Germany's first fantasy league for medical cannabis. Build your dream portfolio, compete with friends, and dominate the leaderboard! 🇩🇪",
      getStarted: "Get Started",
      viewDashboard: "View Dashboard",
    },
    features: {
      title: "Why Play?",
      subtitle: "Experience the future of cannabis education through gamification",
      items: {
        compete: {
          title: "Compete & Win",
          description:
            "Build your fantasy team and compete in season-long leagues or daily challenges.",
        },
        friends: {
          title: "Play with Friends",
          description:
            "Create private leagues and invite your crew for friendly competition.",
        },
        track: {
          title: "Track Performance",
          description:
            "Real-time stats, live scoring, and detailed analytics for your portfolio.",
        },
        daily: {
          title: "Daily Challenges",
          description:
            "24-hour head-to-head battles with instant results and rewards.",
        },
      },
    },
    howItWorks: {
      title: "How It Works",
      subtitle: "Get started in three simple steps",
      steps: {
        create: {
          title: "Create Your League",
          description:
            "Choose between season-long leagues or daily challenges. Set your rules, invite friends, and get ready to draft.",
        },
        draft: {
          title: "Draft Your Team",
          description:
            "Select manufacturers, strains, and products to build your winning portfolio. Strategy is everything!",
        },
        compete: {
          title: "Compete & Win",
          description:
            "Track your team's performance, make strategic moves, and climb the leaderboard to claim victory!",
        },
      },
    },
    cta: {
      title: "Ready to Play?",
      subtitle: "Join Germany's most innovative cannabis fantasy league today!",
      primary: "Start Your Journey",
    },
    footer: {
      disclaimer:
        "© {year} {appTitle}. First fantasy league for medical cannabis in Germany 🇩🇪",
    },
  },
  login: {
    subtitle: "Welcome back! Sign in to continue your journey.",
  },
  signup: {
    subtitle: "Join the first fantasy league for medical cannabis in Germany!",
  },
  join: {
    heroTitle: "You've been invited!",
    heroSubtitle:
      "Join the Cannabis Fantasy League, build your team, and help your friend earn a streak freeze reward when you join your first league.",
    claimTitle: "Claim your invite",
    claimDescription:
      "Create an account or log in to accept this referral and start playing.",
    referralSaved: "Referral code saved for this session",
    rewardDescription:
      "As soon as you join your first league, your friend will automatically receive a streak freeze token they can use to protect their prediction streak.",
    primaryCta: "Get Started",
    secondaryCta: "I already have an account",
    nextTitle: "What happens next?",
    nextDescription: "Invites are simple and fair for everyone.",
    steps: {
      signup: "Sign up or log in to your Cannabis Fantasy League account.",
      draft: "Create or join your first league and draft your team.",
      reward: "Your friend earns a streak freeze token for your first league join.",
    },
    signedInPrefix: "You're already signed in. Head to your",
    leaguesLink: "leagues",
    signedInSuffix:
      "to create or join a league and trigger the referral reward.",
  },
};

const DE_TRANSLATIONS: TranslationTree = {
  nav: {
    home: "Startseite",
    dashboard: "Übersicht",
    leaderboard: "Bestenliste",
    inviteFriends: "Freunde einladen",
    profile: "Profil",
    language: "Sprache",
    players: "Spieler",
    standings: "Tabellen",
    scoring: "Bewertung",
    waivers: "Waiver",
    trades: "Trades",
    lineup: "Aufstellung",
    playoffs: "Playoffs",
    matchups: "Matchups",
    createLeague: "Liga erstellen",
    joinLeague: "Liga beitreten",
    admin: "Admin",
  },
  auth: {
    signIn: "Anmelden",
    signOut: "Abmelden",
    welcomeBack: "Willkommen zurück!",
    signInPrompt: "Bitte melde dich an, um fortzufahren",
    continueWithEmail: "Mit E-Mail fortfahren",
    createAccount: "Konto erstellen",
    profileLinkAria: "Profil öffnen",
  },
  common: {
    loading: "Lädt…",
    saving: "Speichern…",
    confirm: "Bestätigen",
    cancel: "Abbrechen",
    close: "Schließen",
    continue: "Weiter",
    copyLink: "Link kopieren",
    share: "Teilen",
    refresh: "Aktualisieren",
    searchPlaceholder: "Suchen…",
    yes: "Ja",
    no: "Nein",
  },
  layout: {
    toggleSidebar: "Seitenleiste umschalten",
    userMenu: "Benutzermenü",
  },
  dashboard: {
    platformStats: "Plattformstatistiken",
    createNewLeagueTitle: "Neue Liga erstellen",
    createNewLeagueDescription: "Starte eine Saison voller Fantasy-Action",
    dailyChallengeTitle: "Daily Challenge",
    dailyChallengeDescription: "24h Kopf-an-Kopf-Wettbewerbe",
    gotInviteCode: "Hast du einen Einladungscode?",
    enterCodePlaceholder: "Code eingeben",
    joinButton: "Beitreten",
    noLeaguesTitle: "Bereit zum Wettkampf?",
    noLeaguesDescription:
      "Erstelle deine erste Liga oder tritt einer bestehenden bei, um loszulegen.",
  },
  createLeague: {
    headerTitle: "Neue Liga erstellen",
    basicInfo: "Grundlegende Informationen",
    basicInfoDescription: "Lege die grundlegenden Informationen für deine Liga fest.",
    leagueName: "Liganame",
    descriptionPlaceholder: "Beschreibe deine Liga…",
    publicLeagueLabel: "Öffentliche Liga",
    seasonLength: "Saisonlänge",
    maxTeams: "Maximale Teams",
    playoffTeams: "Playoff-Teams",
    draftSettings: "Draft-Einstellungen",
    draftDate: "Draft-Datum (optional)",
    submit: "Liga erstellen",
    cancel: "Abbrechen",
    successToast: "Liga erfolgreich erstellt!",
    nameRequired: "Bitte gib einen Liganamen ein",
    errorToast: "Fehler beim Erstellen der Liga. Bitte versuche es erneut.",
  },
  invite: {
    pageTitle: "Freunde einladen",
    description:
      "Teile deinen persönlichen Link und erhalte Streak-Freezes, wenn Freunde ihrer ersten Liga beitreten.",
    inviteLinkLabel: "Teilbarer Link",
    referralCodeLabel: "Dein Empfehlungscode",
    copySuccess: "Einladungslink kopiert!",
    copyError: "Link konnte nicht kopiert werden. Bitte manuell kopieren.",
    shareCta: "Mit Freunden teilen",
    backButton: "Zurück zum Dashboard",
    highlight: "+1 Streak Freeze pro erfolgreicher Empfehlung",
    cardTitle: "Dein Einladungslink",
    cardDescription:
      "Freunde, die über diesen Link beitreten und ein Team erstellen, schenken dir einen Streak Freeze Token.",
    copyButton: "Kopieren",
    refreshButton: "Aktualisieren",
    shareLink: "Link kopieren",
    rewardsTitle: "Belohnungsübersicht",
    rewardsDescription:
      "Verfolge, wie sich deine Einladungen in Power-ups verwandeln.",
    stats: {
      streakTokens: "Streak Freeze Tokens",
      completed: "Abgeschlossene Empfehlungen",
      total: "Gesamte Empfehlungen",
    },
    howItWorksTitle: "So funktioniert's",
    howItWorksDescription:
      "Einfache, transparente Belohnungen, die an die erste Liga deiner Freunde gekoppelt sind.",
    steps: {
      share: "Teile deinen Link oder Code mit Freunden.",
      join: "Dein Freund meldet sich an und tritt seiner ersten Liga bei.",
      reward:
        "Du erhältst automatisch 1 Streak Freeze Token für jeden Freund, der seine erste Liga betritt.",
    },
    shareTitle: "Tritt meiner Cannabis Fantasy League bei",
    shareMessage:
      "Spiel mit mir in der Cannabis Fantasy League! Nutze meinen Link, um zu starten und Belohnungen freizuschalten.",
  },
  scoring: {
    title: "Bewertung",
    calculating: "Berechne Punkte…",
    calculateButton: "Punkte neu berechnen",
    liveScores: "Live-Punkte",
    weekSelectorLabel: "Woche",
    yearSelectorLabel: "Jahr",
    noData: "Für diese Woche liegen noch keine Daten vor.",
    calculateSuccess: "Punkte erfolgreich berechnet!",
    calculateError: "Berechnung fehlgeschlagen: {message}",
    liveUpdate: "{team} hat {points} Punkte erzielt!",
    liveAllUpdated: "Alle Punkte wurden aktualisiert!",
    weekComplete: "Bewertung für Woche {week} abgeschlossen!",
    refreshing: "Aktualisiere…",
    refresh: "Aktualisieren",
    calculatingLabel: "Berechne…",
    selectWeekTitle: "Woche auswählen",
    leaderboardEmptyTitle: "Für diese Woche gibt es noch keine Punkte.",
    leaderboardEmptyDescription:
      "Punkte erscheinen, nachdem die wöchentlichen Statistiken synchronisiert und die Bewertung für das ausgewählte Jahr und die Woche durchgeführt wurden.",
  },
  prediction: {
    title: "Prediction Streak",
    subtitle: "Tippe die Gewinner und baue deine Serie aus",
    submitSuccess:
      "Tipps gespeichert! Schau morgen wieder vorbei, um dein Ergebnis zu sehen.",
    submitError: "Übermittlung fehlgeschlagen: {message}",
    freezeActivated:
      "Streak Freeze aktiviert. Eine Niederlage bricht deine Serie heute nicht.",
    freezeAlreadyActive: "Du hast heute bereits einen aktiven Streak Freeze.",
    stats: {
      current: "Aktuelle Serie",
      best: "Beste Serie",
      accuracy: "Trefferquote",
      total: "Gesamt richtig",
      freezes: "Streak Freezes",
      activate: "Für heute aktivieren",
      activating: "Aktiviere…",
    },
    results: {
      title: "Ergebnisse von gestern",
      summary: "Du hast {correct} von {total} richtig",
      accuracy: "{value}% Trefferquote",
      winner: "Gewinner: {name}",
    },
    matchups: {
      title: "Matchups von heute",
      empty: "Heute gibt es keine Matchups. Schau morgen wieder vorbei!",
      submitPending: "Sende…",
      submitCta: "Tipps abschicken ({current}/{total})",
      submitted:
        "✓ Tipps abgeschickt! Schau morgen wieder vorbei, um deine Ergebnisse zu sehen.",
    },
    errors: {
      incomplete: "Bitte gib für alle Matchups einen Tipp ab.",
      freezeFailed: "Streak Freeze konnte nicht aktiviert werden.",
    },
  },
  toasts: {
    genericSuccess: "Erfolgreich gespeichert!",
    genericError: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
    linkCopied: "Link kopiert!",
  },
  errors: {
    generic: "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
    requiredField: "Dieses Feld ist erforderlich.",
    invalidCode: "Der Einladungscode muss genau 6 Zeichen haben.",
  },
  home: {
    hero: {
      subheading:
        "Deutschlands erste Fantasy-Liga für medizinisches Cannabis. Stelle dein Traumportfolio zusammen, konkurriere mit Freunden und dominiere die Bestenliste! 🇩🇪",
      getStarted: "Jetzt starten",
      viewDashboard: "Dashboard ansehen",
    },
    features: {
      title: "Warum spielen?",
      subtitle: "Erlebe die Zukunft der Cannabisbildung durch Gamification",
      items: {
        compete: {
          title: "Konkurrieren & gewinnen",
          description:
            "Stelle dein Fantasy-Team zusammen und spiele in Saison-Ligen oder Daily Challenges.",
        },
        friends: {
          title: "Mit Freunden spielen",
          description:
            "Erstelle private Ligen und lade deine Crew zu freundlichen Wettbewerben ein.",
        },
        track: {
          title: "Performance verfolgen",
          description:
            "Echtzeitstatistiken, Live-Scoring und detaillierte Analysen für dein Portfolio.",
        },
        daily: {
          title: "Daily Challenges",
          description:
            "24-Stunden-Duelle mit sofortigen Ergebnissen und Belohnungen.",
        },
      },
    },
    howItWorks: {
      title: "So funktioniert es",
      subtitle: "Starte in drei einfachen Schritten",
      steps: {
        create: {
          title: "Erstelle deine Liga",
          description:
            "Wähle zwischen Saison-Ligen oder Daily Challenges. Lege Regeln fest, lade Freunde ein und bereite den Draft vor.",
        },
        draft: {
          title: "Stelle dein Team zusammen",
          description:
            "Wähle Hersteller, Sorten und Produkte für dein Siegerportfolio. Strategie ist alles!",
        },
        compete: {
          title: "Wettkämpfen & siegen",
          description:
            "Verfolge die Performance deines Teams, reagiere strategisch und erklimme die Bestenliste!",
        },
      },
    },
    cta: {
      title: "Bereit zum Spielen?",
      subtitle:
        "Tritt heute Deutschlands innovativster Cannabis Fantasy Liga bei!",
      primary: "Jetzt loslegen",
    },
    footer: {
      disclaimer:
        "© {year} {appTitle}. Erste Fantasy-Liga für medizinisches Cannabis in Deutschland 🇩🇪",
    },
  },
  login: {
    subtitle: "Willkommen zurück! Melde dich an, um weiterzumachen.",
  },
  signup: {
    subtitle:
      "Tritt der ersten Fantasy-Liga für medizinisches Cannabis in Deutschland bei!",
  },
  join: {
    heroTitle: "Du wurdest eingeladen!",
    heroSubtitle:
      "Tritt der Cannabis Fantasy League bei, stelle dein Team zusammen und hilf deinem Freund, einen Streak Freeze zu verdienen, sobald du deiner ersten Liga beitrittst.",
    claimTitle: "Einladung annehmen",
    claimDescription:
      "Erstelle ein Konto oder melde dich an, um diese Empfehlung zu akzeptieren und loszulegen.",
    referralSaved: "Empfehlungscode für diese Sitzung gespeichert",
    rewardDescription:
      "Sobald du deiner ersten Liga beitrittst, erhält dein Freund automatisch einen Streak Freeze Token, um seine Serie zu schützen.",
    primaryCta: "Jetzt starten",
    secondaryCta: "Ich habe bereits ein Konto",
    nextTitle: "Wie geht es weiter?",
    nextDescription: "Einladungen sind für alle fair und transparent.",
    steps: {
      signup:
        "Melde dich bei deinem Cannabis Fantasy League Konto an oder registriere dich.",
      draft: "Erstelle oder tritt einer Liga bei und stelle dein Team zusammen.",
      reward:
        "Dein Freund erhält einen Streak Freeze Token, sobald du deiner ersten Liga beitrittst.",
    },
    signedInPrefix: "Du bist bereits angemeldet. Gehe zu deinen",
    leaguesLink: "Ligen",
    signedInSuffix:
      "um eine Liga zu erstellen oder beizutreten und die Empfehlung zu aktivieren.",
  },
};

export const TRANSLATIONS: TranslationSchema = {
  en: EN_TRANSLATIONS,
  de: DE_TRANSLATIONS,
};

export type TranslationKey = string;

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
] as const;

const LEGACY_KEY_MAP: Record<string, string> = {
  leaderboard: "nav.leaderboard",
  inviteFriends: "nav.inviteFriends",
  profile: "nav.profile",
  signIn: "auth.signIn",
  signOut: "auth.signOut",
  home: "nav.home",
  dashboard: "nav.dashboard",
  players: "nav.players",
  standings: "nav.standings",
  scoring: "nav.scoring",
  language: "nav.language",
};

export type TranslateOptions = {
  replacements?: Record<string, string | number>;
  defaultValue?: string;
};

const DOT = ".";

const isRecord = (value: TranslationNode): value is TranslationBranch =>
  typeof value === "object" && value !== null;

const applyReplacements = (
  template: string,
  replacements?: Record<string, string | number>
): string => {
  if (!replacements) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, token: string) => {
    const replacement = replacements[token];
    return replacement === undefined ? `{${token}}` : String(replacement);
  });
};

const normalizeKey = (key: string): string =>
  LEGACY_KEY_MAP[key] ?? key ?? "";

const resolveTranslation = (
  language: LanguageCode,
  key: string
): string | undefined => {
  if (!key) return undefined;
  const normalized = normalizeKey(key);
  const segments = normalized.split(DOT).filter(Boolean);
  let node: TranslationNode | undefined = TRANSLATIONS[language];

  for (const segment of segments) {
    if (node && isRecord(node) && segment in node) {
      node = node[segment];
    } else {
      node = undefined;
      break;
    }
  }

  return typeof node === "string" ? node : undefined;
};

export function translate(
  key: TranslationKey,
  language: LanguageCode,
  options?: TranslateOptions
): string {
  const template =
    resolveTranslation(language, key) ??
    resolveTranslation(DEFAULT_LANGUAGE, key) ??
    options?.defaultValue ??
    key;

  return applyReplacements(template, options?.replacements);
}
