import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  themeColor: '#3B82F6',
};

export const metadata: Metadata = {
  title: {
    default: '肿瘤就医决策助手',
    template: '%s | 肿瘤就医决策助手',
  },
  description:
    '肿瘤就医决策助手 - 基于AI的专业就医决策辅助工具，帮助患者了解症状、推荐科室、解答治疗疑问、指导就医流程。',
  keywords: [
    '肿瘤就医',
    '就医决策',
    '症状自查',
    '科室推荐',
    '治疗相关',
    '就医指导',
    '医疗辅助',
    'AI医生助手',
  ],
  authors: [{ name: 'Coze Code Team', url: 'https://code.coze.cn' }],
  generator: 'Coze Code',
  // icons: {
  //   icon: '',
  // },
  openGraph: {
    title: '扣子编程 | 你的 AI 工程师已就位',
    description:
      '我正在使用扣子编程 Vibe Coding，让创意瞬间上线。告别拖拽，拥抱心流。',
    url: 'https://code.coze.cn',
    siteName: '扣子编程',
    locale: 'zh_CN',
    type: 'website',
    // images: [
    //   {
    //     url: '',
    //     width: 1200,
    //     height: 630,
    //     alt: '扣子编程 - 你的 AI 工程师',
    //   },
    // ],
  },
  // twitter: {
  //   card: 'summary_large_image',
  //   title: 'Coze Code | Your AI Engineer is Here',
  //   description:
  //     'Build and deploy full-stack applications through AI conversation. No env setup, just flow.',
  //   // images: [''],
  // },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`antialiased`}>
        {children}
      </body>
    </html>
  );
}
