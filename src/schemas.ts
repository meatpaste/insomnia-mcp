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

const templatePlaceholderPattern = /\{\{[^}]+\}\}/;

function isValidAbsoluteUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function containsTemplatePlaceholder(value: string): boolean {
  return templatePlaceholderPattern.test(value);
}

export const requestUrlSchema = z
  .string()
  .min(1, "url is required")
  .refine((value) => containsTemplatePlaceholder(value) || isValidAbsoluteUrl(value), {
    message: "url must be a valid URL",
  });
