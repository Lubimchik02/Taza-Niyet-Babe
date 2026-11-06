import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';

/**
 * TanStack Query узнаёт о сети от expo-network: без связи запросы не дёргаются впустую
 * и не показывают ошибку, а при появлении сети данные обновляются сами.
 * isConnected === undefined (ещё неизвестно) считаем «в сети».
 */
let installed = false;
export function installOnlineManager() {
  if (installed) return;
  installed = true;
  onlineManager.setEventListener((setOnline) => {
    void Network.getNetworkStateAsync()
      .then((state) => setOnline(state.isConnected !== false))
      .catch(() => {});
    const subscription = Network.addNetworkStateListener((state) =>
      setOnline(state.isConnected !== false),
    );
    return () => subscription.remove();
  });
}
