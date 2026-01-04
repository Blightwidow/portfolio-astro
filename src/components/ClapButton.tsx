import { useAddPhotoClap, useGetPhotoClap } from "../utils/photography";

export function ClapButton({ postId }: { postId: string }) {
  const { data, isLoading } = useGetPhotoClap({ postId });
  const { mutateAsync: addPostClap } = useAddPhotoClap({ postId });

  console.log(data, isLoading);

  return (
    <button
      style={{ margin: "0 0.5rem", cursor: "pointer" }}
      onClick={async () => await addPostClap()}
    >
      <span>{data} Claps 👏🏼</span>
    </button>
  );
}
