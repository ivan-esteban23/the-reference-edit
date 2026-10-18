type Locale = 'es' | 'zh-Hans' | 'zh-Hant' | 'ja' | 'ko';
const translations: Record<Locale, Record<TKey, string>> = {
  "es": i18nEs,
  "zh-Hans": i18nZhHans,
  "zh-Hant": i18nZhHant,
  "ja": i18nJa,
  "ko": i18nKo
};
