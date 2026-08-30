import { z } from 'zod';

export const watchHistorySchema = z.object({
  movie_slug: z.string().min(1),
  movie_title: z.string().nullish().default(""),
  poster_url: z.string().nullish().default(""),
  episode_slug: z.string().min(1),
  episode_name: z.string().nullish().default(""),
  duration: z.number().min(0).default(0),
  playback_time: z.number().min(0).default(0),
});

export type WatchHistoryInput = z.infer<typeof watchHistorySchema>;
