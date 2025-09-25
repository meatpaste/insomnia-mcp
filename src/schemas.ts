import { z } from "zod";

export const collectionIdSchema = z.string().min(1, "collectionId is required");
export const requestIdSchema = z.string().min(1, "requestId is required");
export const folderIdSchema = z.string().min(1, "folderId is required");

export const requestHeadersSchema = z
  .array(
    z.object({
      name: z.string(),
      value: z.string(),
      disabled: z.boolean().optional(),
    })
  )
  .optional();

export const requestBodySchema = z
  .object({
    mimeType: z.string().optional(),
    text: z.string().optional(),
  })
  .passthrough()
  .optional();

export const requestScriptSchema = z.string().optional();
