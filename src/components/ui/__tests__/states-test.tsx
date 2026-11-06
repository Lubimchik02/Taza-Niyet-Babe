import { fireEvent, render, screen } from '@testing-library/react-native';
import { useNetworkState } from 'expo-network';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/i18n';
import { DbError } from '@/lib/db-errors';

import { EmptyState } from '../EmptyState';
import { OfflineBanner } from '../OfflineBanner';
import { QueryState } from '../QueryState';

jest.mock('expo-network', () => ({ useNetworkState: jest.fn(() => ({})) }));
const mockedNetwork = jest.mocked(useNetworkState);

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('QueryState', () => {
  it('при загрузке — скелетон с подписью для экранного чтеца', async () => {
    await render(<QueryState isLoading error={null} onRetry={jest.fn()} skeletonRows={2} />);
    expect(screen.getByLabelText('Загрузка…')).toBeOnTheScreen();
    expect(screen.getByTestId('skeleton')).toBeOnTheScreen();
  });

  it('ошибка сети — понятный текст и «Повторить»', async () => {
    const onRetry = jest.fn();
    await render(<QueryState isLoading={false} error={new DbError('network')} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/интернет|сет/i);
    await fireEvent.press(screen.getByRole('button', { name: 'Повторить' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('данные готовы — ничего не рисует', async () => {
    await render(<QueryState isLoading={false} error={null} onRetry={jest.fn()} />);
    expect(screen.queryByTestId('skeleton')).toBeNull();
    expect(screen.queryByRole('alert', { includeHiddenElements: true })).toBeNull();
  });
});

describe('EmptyState', () => {
  it('объясняет и предлагает следующий шаг', async () => {
    const onPress = jest.fn();
    await render(
      <EmptyState
        icon="calendar-outline"
        title="Ты ещё не записан ни на один квест."
        action={{ title: 'Найти квест', onPress }}
      />,
    );
    expect(screen.getByText('Ты ещё не записан ни на один квест.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Найти квест' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('OfflineBanner', () => {
  it('появляется без сети и объясняет, что отметки не пропадут', async () => {
    mockedNetwork.mockReturnValue({ isConnected: false });
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <OfflineBanner />
      </SafeAreaProvider>,
    );
    // Плашка проявляется анимацией: в первый кадр она прозрачна.
    expect(screen.getByRole('alert', { includeHiddenElements: true })).toHaveTextContent(
      /Нет сети.*отправятся/,
    );
  });

  it('в сети и пока состояние неизвестно — скрыта', async () => {
    mockedNetwork.mockReturnValue({});
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <OfflineBanner />
      </SafeAreaProvider>,
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
