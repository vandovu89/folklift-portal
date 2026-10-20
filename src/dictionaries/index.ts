const dictionaries = {
  en: () => import('./en.json').then((module) => module.default),
  vi: () => import('./vi.json').then((module) => module.default),
};

export const getDictionary = async (locale?: string) => {
  const normalizedLocale = locale === 'en' ? 'en' : 'vi';
  const loader = dictionaries[normalizedLocale] || dictionaries.vi;
  return loader();
};
