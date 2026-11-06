import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

// Trang data-deletion là client component nên metadata khai báo ở layout.
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const isEn = lang === 'en';
  return pageMetadata({
    lang,
    path: '/data-deletion',
    title: isEn ? 'Data Deletion Request' : 'Yêu Cầu Xóa Dữ Liệu',
    description: isEn
      ? 'How to request deletion of your chat history and contact data from MCK Forklift and our Facebook Messenger chatbot.'
      : 'Hướng dẫn yêu cầu xóa lịch sử trò chuyện và thông tin liên hệ khỏi hệ thống Xe Nâng MCK và chatbot Facebook Messenger.',
  });
}

export default function DataDeletionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
