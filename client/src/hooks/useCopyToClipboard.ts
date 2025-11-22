import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";

type CopyOptions = {
  successKey?: TranslationKey;
  errorKey?: TranslationKey;
};

const DEFAULT_SUCCESS_KEY: TranslationKey = "toasts.linkCopied";
const DEFAULT_ERROR_KEY: TranslationKey = "errors.generic";

export function useCopyToClipboard(defaults?: CopyOptions) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (value: string, options?: CopyOptions) => {
      const successKey =
        options?.successKey ?? defaults?.successKey ?? DEFAULT_SUCCESS_KEY;
      const errorKey =
        options?.errorKey ?? defaults?.errorKey ?? DEFAULT_ERROR_KEY;

      try {
        if (typeof navigator === "undefined" || !navigator.clipboard) {
          throw new Error("Clipboard API unavailable");
        }

        await navigator.clipboard.writeText(value);
        setCopied(true);
        toast.success(t(successKey));
      } catch (error) {
        setCopied(false);
        toast.error(t(errorKey, { replacements: { message: String(error) } }));
        throw error;
      }
    },
    [defaults?.errorKey, defaults?.successKey, t]
  );

  const reset = useCallback(() => setCopied(false), []);

  return { copy, copied, reset };
}

