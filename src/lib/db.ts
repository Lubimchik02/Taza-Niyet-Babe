/** Удобные псевдонимы над сгенерированными типами БД (src/lib/database.types.ts). */
import type { Database } from './database.types';

type PublicSchema = Database['public'];

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];

export type OrgRole = Enums<'org_role'>;
export type QuestDifficulty = Enums<'quest_difficulty'>;
export type QuestStatus = Enums<'quest_status'>;
