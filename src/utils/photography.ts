import { getCollection } from "astro:content";

export async function getAllPostsByDate(order: "asc" | "desc") {
  const posts = await getCollection("photography");

  return posts
    .sort((a, b) => {
      return order === "asc"
        ? a.data.date.getTime() - b.data.date.getTime()
        : b.data.date.getTime() - a.data.date.getTime();
    })
    .map((post) => ({
      ...post,
      width: 1,
      height: 1,
      src: post.data.image.src,
      data: {
        ...post.data,
        date: post.data.date.toLocaleDateString(undefined, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      },
    }));
}

export async function getAllTags() {
  const posts = await getCollection("photography");
  const tags = new Set<string>();
  posts.forEach((post) => {
    post.data.tags?.forEach((tag: string) => {
      tags.add(tag);
    });
  });

  return Array.from(tags);
}
