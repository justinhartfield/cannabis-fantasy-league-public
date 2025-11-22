import { useTranslation } from "@/contexts/LanguageContext";
import type {
  TranslateOptions,
  TranslationKey,
} from "@/i18n/translations";
import { ComponentPropsWithoutRef, ElementType } from "react";

type LocalizedTextProps<T extends ElementType> = {
  as?: T;
  id: TranslationKey;
  options?: TranslateOptions;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children">;

export function LocalizedText<T extends ElementType = "span">({
  as,
  id,
  options,
  ...rest
}: LocalizedTextProps<T>) {
  const { t } = useTranslation();
  const Component = (as || "span") as ElementType;

  return (
    <Component {...rest}>
      {t(id, options)}
    </Component>
  );
}

