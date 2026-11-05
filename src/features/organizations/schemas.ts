import { z } from 'zod';

import { SLUG_PATTERN } from './slug';

/** Те же ограничения, что в БД (organizations), — ошибки ловятся до запроса. */
export const createOrgSchema = z.object({
  name: z.string().trim().min(2, { message: 'nameLength' }).max(120, { message: 'nameLength' }),
  slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN, { message: 'slugFormat' }),
  description: z.string().trim().max(2000, { message: 'descriptionLength' }),
});
export type CreateOrgForm = z.infer<typeof createOrgSchema>;

export const joinRequestSchema = z.object({
  message: z.string().trim().max(500, { message: 'messageLength' }),
});
export type JoinRequestForm = z.infer<typeof joinRequestSchema>;

export const ORG_ROLES = ['admin', 'coordinator', 'volunteer'] as const;
