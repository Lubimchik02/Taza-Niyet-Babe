import type { ConfirmDraft } from './components/ConfirmRow';

export type DraftPatch = Partial<ConfirmDraft> | ((current: ConfirmDraft) => Partial<ConfirmDraft>);

/**
 * Сливает правку с актуальным черновиком человека. Правка — только изменённые поля
 * или функция от текущего значения, поэтому быстрые действия подряд (звезда, затем
 * комментарий; два нажатия «+15») не затирают друг друга устаревшим состоянием.
 */
export function applyDraftPatch(
  drafts: Record<string, ConfirmDraft>,
  userId: string,
  initial: ConfirmDraft,
  patch: DraftPatch,
): Record<string, ConfirmDraft> {
  const current = drafts[userId] ?? initial;
  return {
    ...drafts,
    [userId]: { ...current, ...(typeof patch === 'function' ? patch(current) : patch) },
  };
}
