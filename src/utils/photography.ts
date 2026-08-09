import { getCollection, type DataEntryMap } from "astro:content";
import sharp from "sharp";
import path from "node:path";

export type Photo = ValueOf<DataEntryMap["photography"]>;

const CONTENT_DIR = path.join(
  process.cwd(),
  "src/content/photography",
);

export async function generatePlaceholder(
  photoId: string,
): Promise<string> {
  const filePath = path.join(CONTENT_DIR, `${photoId}.jpg`);
  const buffer = await sharp(filePath)
    .resize(20)
    .blur(5)
    .toFormat("webp")
    .toBuffer();
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}

export async function generatePlaceholders(
  photos: Photo[],
): Promise<Map<string, string>> {
  const entries = await Promise.all(
    photos.map(async (photo) => {
      const placeholder = await generatePlaceholder(photo.id);
      return [photo.id, placeholder] as const;
    }),
  );
  return new Map(entries);
}

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

export async function getAllTagsWithCounts(): Promise<{ tag: string; count: number }[]> {
  const posts = await getCollection("photography");
  const counts = new Map<string, number>();
  posts.forEach((post) => {
    post.data.tags?.forEach((tag: string) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag),
  );
}
