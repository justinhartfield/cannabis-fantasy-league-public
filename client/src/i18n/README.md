# Internationalization Guide

All user-facing copy in the Cannabis Fantasy League client should be retrieved
from `client/src/i18n/translations.ts`. The translation tree is grouped by
feature (for example `nav`, `dashboard`, `createLeague`) and keys are accessed
with dot notation such as `nav.leaderboard`.

## Fetching translations

- `useLanguage()` gives you access to `language`, `setLanguage`, and the raw
  `t(key)` helper.
- `useTranslation(namespace)` automatically prefixes keys so you can call
  `t("leaderboard")` when the namespace is `nav`.
- `<LocalizedText id="dashboard.createNewLeagueTitle" />` renders the translated
  string directly in JSX and accepts an `as` prop if you need a different
  element.

## Placeholders and interpolation

Pass replacements via the `TranslateOptions` object. Any `{token}` appearing in
the translation string will be replaced.

```ts
const { t } = useTranslation("prediction");
const message = t("submitError", { replacements: { message: error.message } });
```

## Notifications & clipboard helpers

Use the `useCopyToClipboard` hook when copying strings so success/error toasts
are automatically localized:

```ts
const { copy } = useCopyToClipboard();
await copy(inviteUrl);
```

## Adding new keys

1. Choose the appropriate namespace or create a new one inside
   `translations.ts`.
2. Provide both English and German values.
3. Reference the string via dot notation; avoid hard-coded literals in
   components, dialogs, and toasts.

