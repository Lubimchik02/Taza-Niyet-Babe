import { z } from 'zod';

/** Имя видят координаторы и админы организации, поэтому пустым оно быть не может. */
export const fullNameSchema = z
  .string()
  .trim()
  .min(2, { message: 'nameRequired' })
  .max(120, { message: 'nameRequired' });
