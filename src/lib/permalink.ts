export type PostPermalink = { kind: 'post'; year: string; month: string; day: string; slug: string };
export type PagePermalink = { kind: 'page'; slug: string };

export function parsePermalink(value: string): PostPermalink | PagePermalink {
  const path = normalizePermalink(value);
  const post = path.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)\/$/);
  if (post) return { kind: 'post', year: post[1], month: post[2], day: post[3], slug: post[4] };
  const page = path.match(/^\/([^/]+)\/$/);
  if (page) return { kind: 'page', slug: page[1] };
  throw new Error(`Unsupported permalink: ${value}`);
}

export function normalizePermalink(value: string): string {
  const path = value.startsWith('/') ? value : `/${value}`;
  return path === '/' ? path : `${path.replace(/\/+$/, '')}/`;
}

export function formatPostPermalink(parts: Omit<PostPermalink, 'kind'>): string {
  return normalizePermalink(`/${parts.year}/${parts.month}/${parts.day}/${parts.slug}`);
}

export function formatPagePermalink(slug: string): string {
  return slug === 'home' ? '/' : normalizePermalink(`/${slug}`);
}

export function permalinkToRoute(value: string): string[] {
  return normalizePermalink(value).split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
}
