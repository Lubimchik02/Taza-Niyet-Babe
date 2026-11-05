/**
 * QR отметки на смене. Токен выдаёт и проверяет сервер:
 *   <quest_id>.<номер 30-секундного окна>.<HMAC-подпись, 32 hex>
 * В QR кодируется ссылка tazaniyet://checkin/<токен>, чтобы системная камера тоже открывала приложение.
 */
import * as Linking from 'expo-linking';

const TOKEN_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(\d{1,15})\.([0-9a-f]{32})$/;

export interface CheckinToken {
  token: string;
  questId: string;
  window: number;
}

export function buildCheckinUrl(token: string): string {
  return Linking.createURL(`/checkin/${token}`);
}

/** Токен из отсканированного текста: ссылка …/checkin/<токен> или сам токен. null — не QR отметки. */
export function parseCheckinToken(input: string): CheckinToken | null {
  const text = input.trim();
  const fromUrl = /(?:^|\/)checkin\/([^/?#\s]+)/.exec(text)?.[1];
  const candidate = fromUrl ? decodeURIComponent(fromUrl) : text;
  const match = TOKEN_PATTERN.exec(candidate);
  if (!match?.[1] || !match[2]) return null;
  return { token: candidate, questId: match[1], window: Number(match[2]) };
}

export interface ShiftQrToken {
  token: string;
  valid_from: string;
  valid_until: string;
}

/**
 * Токен для показа сейчас из заранее полученной пачки (работает без сети).
 * null — пачка закончилась или ещё не начала действовать.
 */
export function pickCurrentToken(batch: readonly ShiftQrToken[], now: Date = new Date()) {
  const t = now.getTime();
  return (
    batch.find(
      (b) => new Date(b.valid_from).getTime() <= t && t < new Date(b.valid_until).getTime(),
    ) ?? null
  );
}

/** Сколько ещё минут хватит пачки токенов — чтобы вовремя докачать. */
export function batchMinutesLeft(batch: readonly ShiftQrToken[], now: Date = new Date()): number {
  const last = batch.at(-1);
  if (!last) return 0;
  return Math.max(0, (new Date(last.valid_until).getTime() - now.getTime()) / 60000);
}
