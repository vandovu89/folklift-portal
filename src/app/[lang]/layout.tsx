import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Xe Nâng MCK | Bán Xe Nâng Cũ Nhập Khẩu Trực Tiếp Từ Nhật Bản",
    template: "%s | Xe Nâng MCK",
  },
  description: "Xe Nâng MCK chuyên cung cấp, bán và cho thuê các loại xe nâng bãi, xe nâng cũ nhập khẩu trực tiếp từ Nhật Bản: Komatsu, Toyota, TCM... Uy tín, chất lượng.",
  keywords: ["xe nâng", "xe nâng cũ", "xe nâng Nhật Bản", "xe nâng nhập khẩu", "bán xe nâng", "xe nâng Komatsu", "xe nâng Toyota", "Xe nâng MCK"],
  authors: [{ name: "Xe Nâng MCK" }],
  creator: "Xe Nâng MCK",
  publisher: "Xe Nâng MCK",
  alternates: {
    canonical: "https://xenangmck.jp",
  },
  openGraph: {
    title: "Xe Nâng MCK | Xe Nâng Nhập Khẩu Trực Tiếp Từ Nhật Bản",
    description: "Chuyên cung cấp, bán và cho thuê các loại xe nâng bãi, xe nâng cũ nhập khẩu trực tiếp từ Nhật Bản. Đảm bảo chất lượng và uy tín.",
    url: "https://xenangmck.jp",
    siteName: "Xe Nâng MCK",
    locale: "vi_VN",
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
