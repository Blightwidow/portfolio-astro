import { useAddPhotoClap, useGetPhotoClap } from "../utils/store";

export function ClapButton({ postId }: { postId: string }) {
  const { data, isLoading } = useGetPhotoClap({ postId });
  const { mutateAsync: addPostClap } = useAddPhotoClap({ postId });

  return (
    <button
      style={{ margin: "0 0.5rem", cursor: "pointer" }}
      onClick={async () => await addPostClap()}
    >
      <span>{isLoading ? <div className="loader" /> : data ?? 0} Claps 👏🏼</span>
    </button>
  );
}
