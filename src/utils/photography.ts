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
      src: post.data.image.src,
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
