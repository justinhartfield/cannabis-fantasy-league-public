import {
  DEFAULT_LANGUAGE,
  LanguageCode,
 ...
import {
  DEFAULT_LANGUAGE,
  LanguageCode,
  SUPPORTED_LANGUAGES,
  translate,
  TranslationKey,
} from "@/i18n/translations";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  t: (key: TranslationKey) => string;
  availableLanguages: typeof SUPPORTED_LANGUAGES;
};

const STORAGE_KEY = "cfl-language";

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const getInitialLanguage = (): LanguageCode => {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "de") {
    return stored;
  }

  const browserLanguage = window.navigator?.language?.toLowerCase();
  if (browserLanguage?.startsWith("de")) {
    return "de";
  }

  return DEFAULT_LANGUAGE;
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>(getInitialLanguage);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, language);
    }
  }, [language]);

  const setLanguageSafe = useCallback((code: LanguageCode) => {
    setLanguage(code);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: setLanguageSafe,
      t: (key: TranslationKey) => translate(key, language),
      availableLanguages: SUPPORTED_LANGUAGES,
    }),
    [language, setLanguageSafe]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
import {
  AVAILABLE_LANGUAGES,
  DEFAULT_LANGUAGE,
  SupportedLanguage,
  TranslationKey,
  translations,
} from "@/i18n/translations";
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type LanguageContextValue = {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: TranslationKey) => string;
  availableLanguages: typeof AVAILABLE_LANGUAGES;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "cfl-language";

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] =
    useState<SupportedLanguage>(() => {
      if (typeof window === "undefined") {
        return DEFAULT_LANGUAGE;
      }
      const stored = window.localStorage.getItem(
        STORAGE_KEY
      ) as SupportedLanguage | null;
      return stored && translations[stored] ? stored : DEFAULT_LANGUAGE;
    });

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, lang);
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      availableLanguages: AVAILABLE_LANGUAGES,
      t: (key) => translations[language][key],
    }),
    [language, setLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

