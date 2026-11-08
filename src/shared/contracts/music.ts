import { z } from "zod";
import { safeWebUrl } from "@/shared/contracts/rich-text";

export const defaultMusicSettings = {
  enabled: false,
  apiUrl: "https://api.injahow.cn/meting/",
  server: "netease" as const,
  playlistId: "",
};

export const musicHttpsUrl = safeWebUrl.max(2048).refine((value) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.hash &&
      (!url.port || url.port === "443")
    );
  } catch {
    return false;
  }
});

export const musicSettingsSchema = z
  .object({
    enabled: z.boolean(),
    apiUrl: musicHttpsUrl,
    server: z.enum(["netease", "tencent"]),
    playlistId: z
      .string()
      .trim()
      .regex(/^\d{1,30}$|^$/),
  })
  .superRefine((value, ctx) => {
    if (value.enabled && !value.playlistId)
      ctx.addIssue({
        code: "custom",
        path: ["playlistId"],
        message: "Playlist ID is required",
      });
  });

export type MusicSettings = z.infer<typeof musicSettingsSchema>;
export type MusicTrack = {
  title: string;
  artist: string;
  source: string;
  cover: string;
  lyricsSource?: string;
  lyricsKey?: string;
};

export type LyricLine = { time: number; text: string; translation?: string };
export type MusicLyrics = { lines: LyricLine[]; plain: string[] };
