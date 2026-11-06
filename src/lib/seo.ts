import type { Metadata } from 'next';

/**
 * Domain chính thức mà Google nên index.
 * xenangmck.jp (không www) đang redirect 308 sang www, nên mọi canonical,
 * hreflang, sitemap đều phải dùng bản www — nếu không Google thấy tín hiệu
 * mâu thuẫn (canonical trỏ tới một URL redirect) và bỏ qua trang.
 */
export const SITE_URL = 'https://www.xenangmck.jp';
export const SITE_NAME = 'Xe Nâng MCK';

/** Các trạng thái xe được hiển thị công khai (giống catalog / trang chủ). */
export const PUBLIC_FORKLIFT_STATUSES = ['Available', 'Incoming', 'Reserved', 'Unpacking', 'InJapan'];

type Lang = 'vi' | 'en';

export function normalizeLang(lang: string): Lang {
  return lang === 'en' ? 'en' : 'vi';
}

/**
 * Metadata chuẩn cho một trang công khai: title, description, canonical
 * tự trỏ về chính nó, hreflang vi/en và Open Graph.
 * `path` là phần sau locale, VD '' (trang chủ), '/catalog', '/machine/abc'.
 */
export function pageMetadata({
  lang,
  path,
  title,
  description,
  images,
  noindex,
  absoluteTitle,
}: {
  lang: string;
  path: string;
  title: string;
  description: string;
  images?: string[];
  noindex?: boolean;
  /** true: không gắn hậu tố "| Xe Nâng MCK" từ template ở layout. */
  absoluteTitle?: boolean;
}): Metadata {
  const l = normalizeLang(lang);
  const url = `${SITE_URL}/${l}${path}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: url,
      languages: {
        vi: `${SITE_URL}/vi${path}`,
        en: `${SITE_URL}/en${path}`,
        'x-default': `${SITE_URL}/vi${path}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: l === 'vi' ? 'vi_VN' : 'en_US',
      type: 'website',
      ...(images && images.length > 0 ? { images } : {}),
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
