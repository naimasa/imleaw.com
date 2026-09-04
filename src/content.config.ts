import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const permalink = z.string().regex(/^\/(?:[^/?#]+\/)*$/, 'WordPress permalink must be an absolute trailing-slash path');

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts', generateId: ({ data }) => `post-${data.wpPostId}` }),
  schema: ({ image }) => z.object({
    title: z.string().min(1),
    permalink,
    date: z.coerce.date(),
    categories: z.array(z.string()).default([]),
    heroImage: image().optional(),
    heroImageAlt: z.string().default(''),
    wpPostId: z.number().int().positive(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages', generateId: ({ data }) => `page-${data.wpPageId}` }),
  schema: ({ image }) => z.object({
    title: z.string().min(1),
    permalink,
    date: z.coerce.date().optional(),
    categories: z.array(z.string()).optional(),
    heroImage: image().optional(),
    heroImageAlt: z.string().optional(),
    wpPageId: z.number().int().positive(),
    order: z.number().int().default(0),
  }),
});

export const collections = { posts, pages };
