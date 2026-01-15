import { QueryClient } from "@tanstack/react-query";
import { useQuery as useTanstackQuery } from "@tanstack/react-query";
import { useMutation as useTanstackMutation } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";

export const queryClient = new QueryClient();

export function useQuery<T>(options: UseQueryOptions<T, Error>) {
  return useTanstackQuery<T, Error>(options, queryClient);
}

export function useMutation<T>(options: UseMutationOptions<T, Error>) {
  return useTanstackMutation<T, Error>(options, queryClient);
}

export function useGetPhotoClap({ postId }: { postId: string }) {
  return useQuery<string>({
    queryKey: ["photo-clap", postId],
    queryFn: async () => {
      const response = await fetch(`/api/post-clap/photo-${postId}`);

      if (!response.ok) {
        throw new Error("Failed to get photo clap");
      }

      return response.text();
    },
    staleTime: 1000 * 60 * 5,
    enabled: true,
  });
}

export function useAddPhotoClap({ postId }: { postId: string }) {
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/post-clap/photo-${postId}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to add photo clap");
      }

      return response.text();
    },
    onMutate: () => {
      queryClient.setQueryData(["photo-clap", postId], (old: number) => old + 1);
    },
    onError: (error) => {
      console.error(error);
      queryClient.setQueryData(["photo-clap", postId], (old: number) => old - 1);
    },
  });
}
