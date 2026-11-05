import QRCode from 'qrcode';

import { publicWebUrl } from '@/lib/env';

/** Адрес публичной проверки — именно он кодируется в QR на PDF. */
export function verifyUrl(certificateId: string, base: string = publicWebUrl): string {
  return `${base}/verify/${encodeURIComponent(certificateId)}`;
}

/** QR в виде SVG-строки для HTML сертификата (без сети и нативных модулей). */
export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}
