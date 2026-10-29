import { z } from "zod";
import { locales, defaultLocale } from "./config";
export const localeSchema = z.enum(locales);
export const localeQuerySchema = localeSchema.default(defaultLocale);
