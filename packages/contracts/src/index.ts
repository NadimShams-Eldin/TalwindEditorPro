import { z } from 'zod';

export const safeRelativePath = z
  .string()
  .min(1, { message: 'المسار مطلوب' })
  .refine((value) => !value.startsWith('/') && !value.includes('..') && !value.includes('\0'), {
    message: 'مسار غير آمن',
  });

export const writeFileInput = z.object({
  path: safeRelativePath,
  content: z.string(),
});

export const readFileInput = z.object({ path: safeRelativePath });

export const openProjectInput = z.object({ root: z.string().min(1) });

export const applyClassInput = z.object({
  path: safeRelativePath,
  elementId: z.string().min(1, { message: 'معرّف العنصر مطلوب' }),
  add: z.array(z.string()).default([]),
  remove: z.array(z.string()).default([]),
});

export type WriteFileInput = z.infer<typeof writeFileInput>;
export type ReadFileInput = z.infer<typeof readFileInput>;
export type OpenProjectInput = z.infer<typeof openProjectInput>;
export type ApplyClassInput = z.infer<typeof applyClassInput>;

export function validate<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => issue.message).join('; '));
  }
  return result.data;
}
