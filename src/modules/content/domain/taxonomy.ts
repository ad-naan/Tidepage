import { z } from "zod";

export const categorySchema = z.enum(["technology", "product", "life"]);
export const sketchSchema = z.enum(["sun", "mountain", "boat", "tree"]);
