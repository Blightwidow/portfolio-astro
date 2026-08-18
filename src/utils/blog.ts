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
