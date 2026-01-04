import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (_: Request, context: Context) => {
  const store = getStore("photo-claps");
  const postId = context.params.postId;
  const claps = (await store.get(postId, { type: "text" })) ?? "0";

  try {
    await store.set(postId, (Number.parseInt(claps) + 1).toString());
  } catch (error) {
    console.error(error);
    return new Response("Failed to increase photo claps", { status: 500 });
  }

  return new Response("", { status: 200 });
};

export const config: Config = {
  path: "/api/post-clap/:postId",
  method: "POST",
};
