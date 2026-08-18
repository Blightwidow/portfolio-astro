import { getCollection, type DataEntryMap } from "astro:content";

export type BlogPost = ValueOf<DataEntryMap["blog"]>;

export async function getAllPostByDate(order: "asc" | "desc") {
  const posts = await getCollection("blog");

  return posts
    .filter((post) => post.data.date <= new Date())
    .sort((a, b) => {
      return order === "asc"
        ? a.data.date.getTime() - b.data.date.getTime()
        : b.data.date.getTime() - a.data.date.getTime();
    });
}

export interface Series {
  name: string;
  slug: string;
  posts: BlogPost[];
}

export interface SeriesNavigation extends Series {
  part: number;
  previous: BlogPost | undefined;
  next: BlogPost | undefined;
}

export function toSeriesSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Every series, newest first, with its parts ordered by `series.order`. Built from the
 * date-filtered post list so an unpublished part never leaks into navigation.
 */
export async function getAllSeries(): Promise<Series[]> {
  const posts = await getAllPostByDate("desc");
  const grouped = new Map<string, BlogPost[]>();

  posts.forEach((post) => {
    const name = post.data.series?.name;
    if (name === undefined) {
      return;
    }
    grouped.set(name, [...(grouped.get(name) ?? []), post]);
  });

  return Array.from(grouped, ([name, seriesPosts]) => ({
    name,
    slug: toSeriesSlug(name),
    posts: seriesPosts.sort((a, b) => (a.data.series?.order ?? 0) - (b.data.series?.order ?? 0)),
  }));
}

export async function getSeriesBySlug(slug: string): Promise<Series | undefined> {
  return (await getAllSeries()).find((series) => series.slug === slug);
}

export async function getSeriesNavigation(post: BlogPost): Promise<SeriesNavigation | undefined> {
  const name = post.data.series?.name;
  if (name === undefined) {
    return undefined;
  }

  const series = await getSeriesBySlug(toSeriesSlug(name));
  if (series === undefined) {
    return undefined;
  }

  const index = series.posts.findIndex((seriesPost) => seriesPost.id === post.id);
  if (index === -1) {
    return undefined;
  }

  return {
    ...series,
    part: index + 1,
    previous: index > 0 ? series.posts.at(index - 1) : undefined,
    next: series.posts.at(index + 1),
  };
}

export interface TagCount {
  tag: string;
  count: number;
}

/**
 * Blog topics with a post count, most used first. This vocabulary is deliberately separate
 * from the photography one: photo tags name a subject or a place, blog tags name a topic.
 */
export async function getAllTagsWithCounts(): Promise<TagCount[]> {
  const posts = await getAllPostByDate("desc");
  const counts = new Map<string, number>();

  posts.forEach((post) => {
    post.data.tags?.forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag),
  );
}

export async function getPostsByTag(tag: string): Promise<BlogPost[]> {
  const posts = await getAllPostByDate("desc");

  return posts.filter((post) => post.data.tags?.includes(tag) ?? false);
}

/**
 * What to read after this post: candidates are ranked by how many tags they share, ties broken
 * by recency, and the list is topped up with recent posts when too few share a tag.
 *
 * Other parts of the same series are excluded, because `SeriesNav` already links them and they
 * would otherwise take every slot on every series post.
 */
export async function getRelatedPosts(post: BlogPost, limit = 3): Promise<BlogPost[]> {
  const tags = new Set(post.data.tags ?? []);
  const seriesName = post.data.series?.name;

  const candidates = (await getAllPostByDate("desc")).filter(
    (candidate) =>
      candidate.id !== post.id &&
      (seriesName === undefined || candidate.data.series?.name !== seriesName),
  );

  const ranked = candidates
    .map((candidate) => ({
      post: candidate,
      sharedTags: (candidate.data.tags ?? []).filter((tag) => tags.has(tag)).length,
    }))
    .filter(({ sharedTags }) => sharedTags > 0)
    .sort(
      (a, b) =>
        b.sharedTags - a.sharedTags || b.post.data.date.getTime() - a.post.data.date.getTime(),
    )
    .map(({ post: relatedPost }) => relatedPost);

  const filler = candidates.filter((candidate) => !ranked.includes(candidate));

  return [...ranked, ...filler].slice(0, limit);
}
