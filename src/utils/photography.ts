import { getCollection, type DataEntryMap } from "astro:content";
import { queryClient, useMutation, useQuery } from "./store";

export type Photo = ValueOf<DataEntryMap["photography"]>;

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

export function useGetPhotoClap({ postId }: { postId: string }) {
  return useQuery<string>({
    queryKey: ["photo-clap", postId],
    queryFn: async () => {
      return fetch(`/api/post-clap/photo-${postId}`).then((res) => res.text());
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddPhotoClap({ postId }: { postId: string }) {
  return useMutation({
    mutationFn: async () => {
      return fetch(`/api/post-clap/photo-${postId}`, {
        method: "POST",
      });
    },
    onMutate: () => {
      queryClient.setQueryData(
        ["photo-clap", postId],
        (old: number) => old + 1,
      );
    },
    onError: (error) => {
      console.error(error);
      queryClient.setQueryData(
        ["photo-clap", postId],
        (old: number) => old - 1,
      );
    },
  });
}
