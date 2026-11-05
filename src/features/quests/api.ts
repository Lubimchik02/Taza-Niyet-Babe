import type { QuestDifficulty, Tables } from '@/lib/db';
import { DbError, unwrap } from '@/lib/db-errors';
import { supabase } from '@/lib/supabase';

import type { toQuestPayload } from './schemas';

export const QUEST_PHOTOS_BUCKET = 'quest-photos';

export type FeedQuest = Awaited<ReturnType<typeof fetchFeed>>[number];
export type QuestDetails = NonNullable<Awaited<ReturnType<typeof fetchQuest>>>;
export type MyQuest = Awaited<ReturnType<typeof fetchMyQuests>>[number];
export type Skill = Pick<Tables<'skills'>, 'id' | 'code' | 'name'>;

/** Навык в карточке квеста (jsonb из get_quest). */
export interface QuestSkill {
  id: string;
  code: string;
  name: Record<'kk' | 'ru' | 'en', string>;
  xp: number;
}

export async function fetchFeed() {
  return unwrap(await supabase.rpc('quest_feed', {}));
}

export async function fetchQuest(questId: string) {
  const rows = unwrap(await supabase.rpc('get_quest', { p_quest_id: questId }));
  const row = rows[0];
  return row ? { ...row, skills: row.skills as unknown as QuestSkill[] } : null;
}

export async function fetchParticipants(questId: string) {
  return unwrap(await supabase.rpc('list_quest_participants', { p_quest_id: questId }));
}

export async function fetchMyQuests() {
  return unwrap(await supabase.rpc('my_quests'));
}

export async function signUp(questId: string) {
  return unwrap(await supabase.rpc('signup_for_quest', { p_quest_id: questId }));
}

export async function cancelSignUp(questId: string) {
  return unwrap(await supabase.rpc('cancel_signup', { p_quest_id: questId }));
}

export async function fetchSkills(): Promise<Skill[]> {
  return unwrap(await supabase.from('skills').select('id, code, name').order('code'));
}

export async function fetchOrgTimeZone(orgId: string): Promise<string> {
  const row = unwrap(
    await supabase.from('organizations').select('timezone').eq('id', orgId).maybeSingle(),
  );
  return row?.timezone ?? 'Asia/Almaty';
}

export async function saveQuest(input: {
  questId: string | null;
  orgId: string;
  payload: ReturnType<typeof toQuestPayload> & { before_photo_path?: string | null };
  skillIds: string[];
}) {
  return unwrap(
    await supabase.rpc('save_quest', {
      p_quest_id: input.questId ?? undefined,
      p_org_id: input.orgId,
      p_data: input.payload,
      p_skill_ids: input.skillIds,
    }),
  );
}

/**
 * Загружает фото в приватный бакет. Путь начинается с org_id — по нему Storage-политики
 * решают, кто может читать и загружать.
 */
export async function uploadQuestPhoto(
  orgId: string,
  uri: string,
  mimeType: string,
): Promise<string> {
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${orgId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const body = await (await fetch(uri)).arrayBuffer();
  const { error } = await supabase.storage
    .from(QUEST_PHOTOS_BUCKET)
    .upload(path, body, { contentType: mimeType, upsert: false });
  if (error) throw new DbError('photo_upload_failed', error);
  return path;
}

export async function signedPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(QUEST_PHOTOS_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) throw new DbError('generic', error);
  return data.signedUrl;
}

export type { QuestDifficulty };
