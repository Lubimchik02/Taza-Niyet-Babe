import * as api from './api';
import * as device from './device';
import { usePushState } from './push-store';

/**
 * Проверяет разрешение, при `ask` спрашивает его и регистрирует токен устройства на сервере.
 * Ошибки сети не мешают работе приложения: попробуем при следующем запуске.
 */
export async function syncPushRegistration(options: { ask: boolean; channelName: string }) {
  if (!device.pushSupported) {
    usePushState.setState({ status: 'unavailable', token: null });
    return;
  }
  await device.ensureAndroidChannel(options.channelName);
  let permission = await device.getPermission();
  if (permission === 'undetermined' && options.ask) permission = await device.requestPermission();
  if (permission !== 'granted') {
    usePushState.setState({ status: permission, token: null });
    return;
  }
  const token = await device.getPushToken();
  if (!token) {
    usePushState.setState({ status: 'unavailable', token: null });
    return;
  }
  await api.registerPushToken(token, device.platform());
  usePushState.setState({ status: 'granted', token });
}

/** Перед выходом: этот телефон больше не получает пуши ушедшего пользователя. */
export async function releasePushToken() {
  const { token } = usePushState.getState();
  usePushState.setState({ status: 'unknown', token: null });
  if (!token) return;
  try {
    await api.unregisterPushToken(token);
  } catch {
    // Нет сети — токен перейдёт к следующему, кто войдёт на этом телефоне.
  }
}
