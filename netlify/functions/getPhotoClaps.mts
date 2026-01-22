import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (_: Request, context: Context) => {
  const store = getStore("photo-claps");
  const postId = context.params.postId;

  if (!postId) {
    return new Response("Post ID is required", { status: 400 });
  }

  const claps = (await store.get(postId, { type: "text" })) ?? "0";

  return new Response(claps.toString());
};

export const config: Config = {
  path: "/api/post-clap/:postId",
  method: "GET",
};
