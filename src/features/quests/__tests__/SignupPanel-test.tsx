import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n';

import type { QuestDetails } from '../api';
import { cancelDeadline, SignupPanel } from '../components/SignupPanel';

const mockSignUp = jest.fn();
const mockCancel = jest.fn();
jest.mock('../queries', () => ({
  useSignUp: () => ({ mutateAsync: mockSignUp, isPending: false }),
  useCancelSignUp: () => ({ mutateAsync: mockCancel, isPending: false }),
}));
jest.mock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: {} }));

const now = new Date('2026-11-05T12:00:00Z');
const base = {
  id: 'q1',
  status: 'published',
  starts_at: '2026-11-07T04:00:00Z', // через ~40 часов
  ends_at: '2026-11-07T07:00:00Z',
  cancel_deadline_hours: 12,
  capacity: 10,
  taken: 4,
  waitlisted: 0,
  my_status: null,
  my_waitlist_position: null,
} as unknown as QuestDetails;

const renderPanel = (quest: Partial<QuestDetails>): Promise<unknown> =>
  render(
    (
      <I18nextProvider i18n={i18n}>
        <SignupPanel quest={{ ...base, ...quest } as QuestDetails} now={now} />
      </I18nextProvider>
    ) as ReactElement,
  );

beforeAll(() => i18n.changeLanguage('ru'));
beforeEach(() => jest.clearAllMocks());

describe('SignupPanel', () => {
  it('есть места — «Принять квест»', async () => {
    mockSignUp.mockResolvedValue({});
    await renderPanel({});
    await fireEvent.press(screen.getByRole('button', { name: 'Принять квест' }));
    expect(mockSignUp).toHaveBeenCalledWith('q1');
  });

  it('мест нет — «Встать в лист ожидания»', async () => {
    await renderPanel({ taken: 10, capacity: 10 });
    expect(screen.getByRole('button', { name: 'Встать в лист ожидания' })).toBeOnTheScreen();
  });

  it('записан и срок не прошёл — отмена со второго нажатия', async () => {
    mockCancel.mockResolvedValue({});
    await renderPanel({ my_status: 'signed_up' });
    await fireEvent.press(screen.getByRole('button', { name: 'Отменить запись' }));
    expect(mockCancel).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Нажми ещё раз, чтобы отменить' }));
    expect(mockCancel).toHaveBeenCalledWith('q1');
  });

  it('срок отмены прошёл — кнопки отмены нет, есть подсказка', async () => {
    await renderPanel({
      my_status: 'signed_up',
      starts_at: '2026-11-05T20:00:00Z',
      ends_at: '2026-11-05T23:00:00Z',
    });
    expect(screen.queryByRole('button', { name: 'Отменить запись' })).toBeNull();
    expect(screen.getByText(/Срок отмены прошёл/)).toBeOnTheScreen();
  });

  it('в очереди — позиция и выход из очереди', async () => {
    await renderPanel({ my_status: 'waitlisted', my_waitlist_position: 2, taken: 10 });
    expect(screen.getByText(/место в очереди: 2/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Выйти из очереди' })).toBeOnTheScreen();
  });

  it('квест начался — запись закрыта', async () => {
    await renderPanel({ starts_at: '2026-11-05T10:00:00Z' });
    expect(screen.getByText('Запись закрыта.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Принять квест' })).toBeNull();
  });

  it('ошибка сервера показывается понятным текстом', async () => {
    mockSignUp.mockRejectedValue({ message: 'quest_closed' });
    await renderPanel({});
    await fireEvent.press(screen.getByRole('button', { name: 'Принять квест' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Запись на этот квест закрыта.'),
    );
  });
});

describe('cancelDeadline', () => {
  it('начало минус N часов', () => {
    expect(cancelDeadline(base).toISOString()).toBe('2026-11-06T16:00:00.000Z');
  });
});
