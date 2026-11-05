import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import { parseCheckinToken } from '@/features/attendance/qr';
import { parseInviteCode } from '@/features/organizations/invite-link';
import { useTheme } from '@/theme/ThemeProvider';

export default function ScanScreen() {
  const { t } = useTranslation();
  const { colors, radius } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  // mode=in|out — сканер открыт с карточки квеста для отметки; без mode — для приглашений.
  const { mode } = useLocalSearchParams<{ mode?: 'in' | 'out' }>();
  const forAttendance = mode === 'in' || mode === 'out';
  const [notRecognized, setNotRecognized] = useState(false);
  // Камера присылает один и тот же код много раз в секунду — реагируем один раз.
  const handled = useRef(false);

  if (!permission) {
    return (
      <Screen edges={['bottom']}>
        <QueryState isLoading error={null} onRetry={() => {}} />
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen edges={['bottom']}>
        <AppText>
          {permission.canAskAgain
            ? t('organizations.scan.permission')
            : t('organizations.scan.denied')}
        </AppText>
        {permission.canAskAgain ? (
          <Button title={t('organizations.scan.allow')} onPress={() => void requestPermission()} />
        ) : null}
        <Button variant="secondary" title={t('common.back')} onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          if (handled.current) return;
          // Один сканер на всё: QR отметки на смене и QR-приглашения.
          const checkin = parseCheckinToken(data);
          if (checkin) {
            handled.current = true;
            router.replace({
              pathname: '/checkin/[token]',
              params: { token: checkin.token, mode: mode === 'out' ? 'out' : 'in' },
            });
            return;
          }
          const code = forAttendance ? null : parseInviteCode(data);
          if (!code) {
            setNotRecognized(true);
            return;
          }
          handled.current = true;
          router.replace({ pathname: '/join/[code]', params: { code } });
        }}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={[styles.frame, { borderColor: colors.reward, borderRadius: radius.lg }]} />
      </View>
      <View style={[styles.hint, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
        <AppText align="center" accessibilityLiveRegion="polite">
          {notRecognized
            ? forAttendance
              ? t('errors.qr_invalid')
              : t('organizations.invite.invalidCode')
            : forAttendance
              ? t('attendance.scanHint')
              : t('organizations.scan.hint')}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 260, height: 260, borderWidth: 4 },
  hint: { position: 'absolute', left: 16, right: 16, bottom: 32, padding: 16 },
});
