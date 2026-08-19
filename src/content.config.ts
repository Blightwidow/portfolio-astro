import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    date: z.date(),
    // Nested so a post can never declare a series without its position in it.
    series: z
      .object({
        name: z.string(),
        order: z.number().int().positive(),
      })
      .optional(),
    // Topics, in their own namespace: photography tags describe subject and location, these
    // describe what a post is about, and the two lists are never merged.
    tags: z.array(z.string()).optional(),
  }),
});

/**
 * A roll of film. Camera, stock, format and development are properties of the roll, not of
 * each frame, so they live here once instead of being repeated on every photo.
 */
const rolls = defineCollection({
  loader: glob({ pattern: "*.yaml", base: "./src/content/rolls" }),
  schema: z.object({
    camera: z.string(),
    film: z.string(),
    format: z.string().default("35mm"),
    process: z.array(z.string()).default([]),
    // All optional because older rolls were shot before any of this was written down.
    // `shotMonth` (YYYY-MM) is for rolls where only the month is remembered; prefer the
    // shotFrom/shotTo window when the real dates are known.
    shotMonth: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .optional(),
    shotFrom: z.date().optional(),
    shotTo: z.date().optional(),
    developed: z.date().optional(),
  }),
});

const photography = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/photography" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      alt: z.string(),
      description: z.string().optional(),
      date: z.date(),
      image: image(),
      roll: reference("rolls"),
      // Position on the strip, 1-based, in scan order.
      frame: z.number().int().positive(),
      tags: z.array(z.string()).optional(),
      hideFromGallery: z.boolean().default(false),
    }),
});

/**
 * Destination guides. Every entry is the public rewrite of a private Obsidian note, curated by
 * hand. Nothing here is synced from the vault, which also holds notes that must never reach a
 * build.
 */
const travel = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/travel" }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    country: z.string(),
    /** Where the marker sits on the world map. */
    coordinates: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    }),
    date: z.date(),
    updated: z.date().optional(),
    /** Photography tags to pull matching film frames onto the guide. */
    photoTags: z.array(z.string()).optional(),
  }),
});

export const collections = {
  blog,
  photography,
  rolls,
  travel,
};
