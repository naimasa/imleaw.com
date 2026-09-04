export const siteConfig = {
  title: 'Im Leaw イム・レーオ',
  subtitle: '須坂の小さなパン工房 イム・レーオ',
  url: 'https://imleaw.com',
  nav: [
    { label: 'Home', href: '/' },
    { label: 'About the lesson', href: '/about-the-lesson/' },
    { label: 'Courses', href: '/basic-course/' },
    { label: 'Blog', href: '/blogs/' },
    { label: 'Instagram', href: '/instagram/' },
    { label: 'Who am I', href: '/who-am-i/' },
    { label: 'Access & Contacts', href: '/contacts/' },
  ],
  categories: {
    '%e3%83%91%e3%83%b3%e3%81%ab%e3%81%a4%e3%81%84%e3%81%a6': { name: 'パンについて', slug: '%e3%83%91%e3%83%b3%e3%81%ab%e3%81%a4%e3%81%84%e3%81%a6', description: 'パン作り、レッスン、焼き上がりの記録。', color: 'var(--color-category-bread)' },
    '%e6%97%a5%e3%80%85%e3%81%ae%e6%9a%ae%e3%82%89%e3%81%97': { name: '日々の暮らし', slug: '%e6%97%a5%e3%80%85%e3%81%ae%e6%9a%ae%e3%82%89%e3%81%97', description: '季節と食卓を楽しむ日々の便り。', color: 'var(--color-category-life)' },
    '%e9%a0%88%e5%9d%82': { name: '須坂', slug: '%e9%a0%88%e5%9d%82', description: '須坂の町、お店、風景のこと。', color: 'var(--color-category-suzaka)' },
    '%e5%ba%ad%e3%81%ab%e3%81%a4%e3%81%84%e3%81%a6': { name: '庭について', slug: '%e5%ba%ad%e3%81%ab%e3%81%a4%e3%81%84%e3%81%a6', description: '工房の庭と草花の成長記録。', color: 'var(--color-category-garden)' },
    uncategorized: { name: '未分類', slug: 'uncategorized', description: 'イム・レーオからのお知らせと記録。', color: 'var(--color-category-default)' },
  },
  store: {
    address: '長野県須坂市上中町193-1牧半みぎ',
    email: 'imleaw17@gmail.com',
    emailSubject: 'イム・レーオへのお問い合わせ',
    lineUrl: 'https://lin.ee/ZlTm2kO',
    instagramUrl: 'https://www.instagram.com/im_leaw_suzaka/',
  },
} as const;

export type CategorySlug = keyof typeof siteConfig.categories;
