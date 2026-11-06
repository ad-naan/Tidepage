import {
  coastAvatarSchema,
  type CoastAppearance,
  type CoastPose,
} from "@/shared/contracts/coast-space";

export const avatarColors = {
  coat: { sea: "#668e91", moss: "#7c8b69", coral: "#c98879", cream: "#e5d5b4" },
  skin: { light: "#f1c9aa", warm: "#dba27c", deep: "#956449" },
  hair: { chestnut: "#63483b", ink: "#303b40", honey: "#bb8b51" },
} as const;

export const avatarSchema = coastAvatarSchema;
export type CoastAvatar = CoastAppearance;
export type AvatarPose = CoastPose;
export const defaultAvatar: CoastAvatar = {
  version: 1,
  coat: "sea",
  skin: "warm",
  hairColor: "chestnut",
  hairStyle: "waves",
  accessory: "satchel",
};

export function restoreAvatar(value: unknown): CoastAvatar {
  const result = avatarSchema.safeParse(value);
  return result.success ? result.data : { ...defaultAvatar };
}
