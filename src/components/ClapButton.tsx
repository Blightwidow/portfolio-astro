import "react";

import { useAddPhotoClap, useGetPhotoClap } from "../utils/store";

export function ClapButton({ postId }: { postId: string }) {
  const { data } = useGetPhotoClap({ postId });
  const { mutateAsync: addPostClap } = useAddPhotoClap({ postId });

  return (
    <button
      style={{ margin: "0 0.5rem", cursor: "pointer" }}
      onClick={async () => await addPostClap()}
    >
      <span>{data} Claps 👏🏼</span>
    </button>
  );
}
