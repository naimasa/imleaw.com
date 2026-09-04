import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { siteConfig } from '../config/site.config';

export async function GET(context: { site?: URL }) {
  const posts = (await getCollection('posts')).sort((a,b) => b.data.date.valueOf() - a.data.date.valueOf());
  return rss({
    title: siteConfig.title,
    description: siteConfig.subtitle,
    site: context.site ?? siteConfig.url,
    trailingSlash: true,
    items: posts.map((post) => ({ title: post.data.title, pubDate: post.data.date, link: post.data.permalink, description: (post.body ?? '').replace(/[#*_>`\[\]]/g,' ').replace(/\s+/g,' ').trim().slice(0,240) })),
    customData: '<language>ja</language>',
  });
}
