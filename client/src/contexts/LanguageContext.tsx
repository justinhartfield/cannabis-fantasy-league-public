import {
  DEFAULT_LANGUAGE,
  LanguageCode,
  SUPPORTED_LANGUAGES,
  TranslateOptions,
  TranslationKey,
  translate,
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
  t: (key: TranslationKey, options?: TranslateOptions) => string;
  availableLanguages: typeof SUPPORTED_LANGUAGES;
};

const STORAGE_KEY = "cfl-language";

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

const getInitialLanguage = (): LanguageCode => {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
  if (stored && SUPPORTED_LANGUAGES.some(lang => lang.code === stored)) {
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
      t: (key: TranslationKey, options?: TranslateOptions) =>
        translate(key, language, options),
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

export function useTranslation(namespace?: string) {
  const context = useLanguage();

  const namespacedTranslate = useCallback(
    (key: TranslationKey, options?: TranslateOptions) => {
      const trimmedKey = key?.trim();
      const prefix = namespace?.trim();
      const fullKey =
        prefix && trimmedKey
          ? `${prefix}.${trimmedKey}`
          : prefix && !trimmedKey
            ? prefix
            : trimmedKey;
      return context.t(fullKey ?? "", options);
    },
    [context, namespace]
  );

  return {
    t: namespacedTranslate,
    language: context.language,
    setLanguage: context.setLanguage,
    availableLanguages: context.availableLanguages,
  };
}

export type { TranslateOptions } from "@/i18n/translations";
