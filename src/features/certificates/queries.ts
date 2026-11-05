import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/features/auth/session-store';
import type { Language } from '@/i18n/languages';
import { useFormatDuration } from '@/lib/use-format-duration';

import * as api from './api';
import type { CertificateLabels } from './template';

export const certificateKeys = {
  all: ['certificates'] as const,
  mine: (userId: string) => ['certificates', 'mine', userId] as const,
  certifiable: (userId: string) => ['certificates', 'orgs', userId] as const,
  detail: (id: string) => ['certificates', id] as const,
};

function useUserId() {
  return useSession((s) => s.session?.user.id) ?? '';
}

export function useMyCertificates() {
  const userId = useUserId();
  return useQuery({
    queryKey: certificateKeys.mine(userId),
    queryFn: () => api.fetchMyCertificates(userId),
    enabled: userId !== '',
  });
}

export function useCertifiableOrgs() {
  const userId = useUserId();
  return useQuery({
    queryKey: certificateKeys.certifiable(userId),
    queryFn: () => api.fetchCertifiableOrgs(userId),
    enabled: userId !== '',
  });
}

/** Работает и без входа — для публичной страницы проверки. */
export function useCertificate(id: string, enabled = true) {
  return useQuery({
    queryKey: certificateKeys.detail(id),
    queryFn: () => api.fetchCertificate(id),
    enabled,
    retry: false,
  });
}

export function useIssueCertificate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.issueCertificate,
    onSuccess: () => client.invalidateQueries({ queryKey: certificateKeys.all }),
  });
}

/** Подписи PDF на текущем языке интерфейса. */
export function useCertificateLabels(): {
  labels: CertificateLabels;
  lang: Language;
  locale: string;
} {
  const { t, i18n } = useTranslation();
  const duration = useFormatDuration();
  const lang = (['kk', 'ru', 'en'].includes(i18n.language) ? i18n.language : 'ru') as Language;
  const p = useCallback(
    (key: string) => t(`certificates.pdf.${key}` as 'certificates.pdf.title'),
    [t],
  );
  return {
    lang,
    locale: i18n.language,
    labels: {
      title: p('title'),
      subtitle: p('subtitle'),
      awardedTo: p('awardedTo'),
      organization: p('organization'),
      hours: p('hours'),
      quests: p('quests'),
      avgRating: p('avgRating'),
      skills: p('skills'),
      questList: p('questList'),
      columnDate: p('columnDate'),
      columnQuest: p('columnQuest'),
      columnHours: p('columnHours'),
      columnRating: p('columnRating'),
      verifyTitle: p('verifyTitle'),
      verifyHint: p('verifyHint'),
      issued: p('issued'),
      number: p('number'),
      revoked: p('revoked'),
      duration,
    },
  };
}
