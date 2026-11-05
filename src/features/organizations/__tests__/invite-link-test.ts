import { buildInviteLink, parseInviteCode } from '../invite-link';

jest.mock('expo-linking', () => ({
  createURL: (path: string) => `tazaniyet://${path.replace(/^\//, '')}`,
}));

const CODE = 'Ab3_dE-fGh1JkL9m';

describe('parseInviteCode', () => {
  it.each([
    [CODE],
    [`  ${CODE}  `],
    [`tazaniyet://join/${CODE}`],
    [`exp://192.168.1.5:8081/--/join/${CODE}`],
    [`https://taza-niyet.kz/join/${CODE}?utm=qr`],
    [`http://localhost:8081/join/${CODE}#x`],
  ])('находит код в %p', (input) => {
    expect(parseInviteCode(input)).toBe(CODE);
  });

  it.each([
    [''],
    ['hello'],
    ['tazaniyet://join/short'],
    [`tazaniyet://join/${CODE}extra`],
    [`tazaniyet://quests/${CODE}`],
    ['Ab3 dE fGh1JkL9m'],
  ])('отклоняет %p', (input) => {
    expect(parseInviteCode(input)).toBeNull();
  });

  it('ссылка, которую мы строим, разбирается обратно', () => {
    expect(parseInviteCode(buildInviteLink(CODE))).toBe(CODE);
  });
});
