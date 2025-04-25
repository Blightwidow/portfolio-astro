import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import playformCompress from "@playform/compress";
import { imageService } from "@unpic/astro/service";

// https://astro.build/config
export default defineConfig({
  site: "https://dammaretz.fr",
  trailingSlash: "never",
  output: "static",
  integrations: [
    sitemap(),
    playformCompress({
      Image: false,
    }),
  ],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  experimetal: {
    responsiveImage: true,
  },
  image: {
    service: imageService({
      fallbackService: "sharp",
      placeholder: "blurhash",
      layout: "constrained",
    }),
  },
});
