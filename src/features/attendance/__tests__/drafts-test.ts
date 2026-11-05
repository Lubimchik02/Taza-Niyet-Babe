import type { ConfirmDraft } from '../components/ConfirmRow';
import { applyDraftPatch } from '../drafts';

const initial: ConfirmDraft = {
  minutes: 15,
  reason: '',
  quality: 4,
  activity: 4,
  teamwork: 4,
  comment: '',
};

describe('applyDraftPatch', () => {
  it('звезда, затем комментарий подряд — оба изменения сохраняются', () => {
    let drafts: Record<string, ConfirmDraft> = {};
    drafts = applyDraftPatch(drafts, 'u1', initial, { quality: 5 });
    drafts = applyDraftPatch(drafts, 'u1', initial, { comment: 'Отличная работа!' });
    expect(drafts.u1).toMatchObject({ quality: 5, comment: 'Отличная работа!' });
  });

  it('два «+15» подряд дают +30', () => {
    let drafts: Record<string, ConfirmDraft> = {};
    const plus15 = (d: ConfirmDraft) => ({ minutes: d.minutes + 15 });
    drafts = applyDraftPatch(drafts, 'u1', initial, plus15);
    drafts = applyDraftPatch(drafts, 'u1', initial, plus15);
    expect(drafts.u1?.minutes).toBe(45);
  });

  it('черновики разных людей независимы', () => {
    let drafts: Record<string, ConfirmDraft> = {};
    drafts = applyDraftPatch(drafts, 'u1', initial, { quality: 1 });
    drafts = applyDraftPatch(drafts, 'u2', initial, { quality: 5 });
    expect([drafts.u1?.quality, drafts.u2?.quality]).toEqual([1, 5]);
  });
});
