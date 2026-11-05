/**
 * Ссылки-приглашения. Один и тот же адрес кодируется в QR и отправляется ссылкой:
 * tazaniyet://join/<код> (в Expo Go — exp://…/--/join/<код>).
 */
import * as Linking from 'expo-linking';

export const INVITE_CODE_PATTERN = /^[A-Za-z0-9_-]{16}$/;

export function buildInviteLink(code: string): string {
  return Linking.createURL(`/join/${code}`);
}

/**
 * Достаёт код приглашения из того, что отсканировали или вставили:
 * полная ссылка любой схемы с путём …/join/<код> или сам код. null — не приглашение.
 */
export function parseInviteCode(input: string): string | null {
  const text = input.trim();
  if (INVITE_CODE_PATTERN.test(text)) return text;
  const match = /(?:^|\/)join\/([A-Za-z0-9_-]{16})(?:[/?#]|$)/.exec(text);
  return match?.[1] ?? null;
}
