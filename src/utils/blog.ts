import { getCollection } from "astro:content";

export async function getAllPostByDate(order: "asc" | "desc") {
  const posts = await getCollection("blog");

  return posts.sort((a, b) => {
    return order === "asc"
      ? a.data.date.getTime() - b.data.date.getTime()
      : b.data.date.getTime() - a.data.date.getTime();
  });
}
