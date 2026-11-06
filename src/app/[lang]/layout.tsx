import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;

  // Lưu ý: KHÔNG đặt alternates/canonical ở đây — metadata được merge nông,
  // trang nào không tự khai báo sẽ thừa hưởng canonical của layout và bị Google
  // coi là bản trùng của trang chủ. Mỗi trang công khai tự gọi pageMetadata().
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: "Xe Nâng MCK | Xe Nâng Cũ Nhật Bản Nhập Khẩu Trực Tiếp",
      template: "%s | Xe Nâng MCK",
    },
    description: "Xe Nâng MCK bán xe nâng cũ Nhật Bản nhập khẩu trực tiếp: xe nâng điện cũ, xe nâng dầu, xe nâng gas Toyota, Komatsu, TCM, Nichiyu. Giá tốt, bảo hành 12 tháng.",
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    openGraph: {
      siteName: SITE_NAME,
      locale: lang === 'en' ? 'en_US' : 'vi_VN',
      type: "website",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const resolvedParams = await params;
  return (
    <html lang={resolvedParams.lang}>
      <body className={`${inter.variable}`}>
        {children}
      </body>
    </html>
  );
}
