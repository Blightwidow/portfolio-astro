import { readFile } from "node:fs/promises";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import type { APIRoute } from "astro";
import { getAllPostByDate, type BlogPost } from "../../../utils/blog";
import { formatDate } from "../../../utils/date";

export async function getStaticPaths() {
  const posts = await getAllPostByDate("desc");

  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const BACKGROUND_COLOR = "#fcfcf8";
const FOREGROUND_COLOR = "#444444";

const fontDirectory = path.join(process.cwd(), "node_modules/@fontsource/metropolis/files");

function titleFontSize(title: string): number {
  if (title.length > 70) {
    return 48;
  }
  if (title.length > 40) {
    return 56;
  }
  return 68;
}

function buildCardMarkup(post: BlogPost) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        backgroundColor: BACKGROUND_COLOR,
        color: FOREGROUND_COLOR,
        padding: "72px 80px",
        fontFamily: "Metropolis",
        borderTop: `16px solid ${FOREGROUND_COLOR}`,
      },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", gap: "28px" },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: titleFontSize(post.data.title),
                    fontWeight: 700,
                    lineHeight: 1.15,
                    lineClamp: 3,
                  },
                  children: post.data.title,
                },
              },
              {
                type: "div",
                props: {
                  style: { fontSize: 32, opacity: 0.7, lineHeight: 1.4, lineClamp: 2 },
                  children: post.data.subtitle,
                },
              },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              justifyContent: "space-between",
              fontSize: 28,
              opacity: 0.6,
            },
            children: [
              { type: "div", props: { children: "dammaretz.fr" } },
              { type: "div", props: { children: formatDate(post.data.date) } },
            ],
          },
        },
      ],
    },
  };
}

export const GET: APIRoute = async ({ props }) => {
  const { post } = props as { post: BlogPost };

  const [regularFont, boldFont] = await Promise.all([
    readFile(path.join(fontDirectory, "metropolis-latin-400-normal.woff")),
    readFile(path.join(fontDirectory, "metropolis-latin-700-normal.woff")),
  ]);

  const svg = await satori(buildCardMarkup(post) as unknown as Parameters<typeof satori>[0], {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    fonts: [
      { name: "Metropolis", data: regularFont, weight: 400, style: "normal" },
      { name: "Metropolis", data: boldFont, weight: 700, style: "normal" },
    ],
  });

  const png = new Resvg(svg, { fitTo: { mode: "width", value: CARD_WIDTH } }).render().asPng();

  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
