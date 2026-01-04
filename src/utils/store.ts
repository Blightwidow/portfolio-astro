import { QueryClient } from "@tanstack/react-query";
import { useQuery as useTanstackQuery } from "@tanstack/react-query";
import { useMutation as useTanstackMutation } from "@tanstack/react-query";
import type {
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";

export const queryClient = new QueryClient();

export function useQuery<T>(options: UseQueryOptions<T, Error>) {
  return useTanstackQuery<T, Error>(options, queryClient);
}

export function useMutation<T>(options: UseMutationOptions<T, Error>) {
  return useTanstackMutation<T, Error>(options, queryClient);
}
