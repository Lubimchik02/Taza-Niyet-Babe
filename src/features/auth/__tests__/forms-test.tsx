import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n';

import { AuthFlowError } from '../api';
import { OtpFormView } from '../components/OtpFormView';
import { SignInFormView } from '../components/SignInFormView';

// Supabase-клиент не нужен: формы получают обработчики снаружи.
jest.mock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: {} }));

function renderWithI18n(ui: ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

beforeAll(async () => {
  await i18n.changeLanguage('ru');
});

describe('SignInFormView', () => {
  it('не отправляет некорректный контакт и показывает ошибку', async () => {
    const onSubmit = jest.fn();
    await renderWithI18n(<SignInFormView onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText('Email или телефон'), 'не контакт');
    await fireEvent.press(screen.getByRole('button', { name: 'Получить код' }));

    expect(await screen.findByText(/Введи корректный email/)).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('передаёт нормализованный телефон', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    await renderWithI18n(<SignInFormView onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText('Email или телефон'), '8 700 123 45 67');
    await fireEvent.press(screen.getByRole('button', { name: 'Получить код' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ kind: 'phone', value: '+77001234567' }),
    );
  });

  it('показывает понятную ошибку сервера', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new AuthFlowError('rateLimited'));
    await renderWithI18n(<SignInFormView onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText('Email или телефон'), 'aru@mail.kz');
    await fireEvent.press(screen.getByRole('button', { name: 'Получить код' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Слишком много попыток/);
  });
});

describe('OtpFormView', () => {
  it('оставляет в коде только цифры и отправляет его', async () => {
    const onVerify = jest.fn().mockResolvedValue(undefined);
    await renderWithI18n(<OtpFormView onVerify={onVerify} onResend={jest.fn()} />);

    await fireEvent.changeText(screen.getByLabelText('Код из сообщения'), '12-34 56');
    await fireEvent.press(screen.getByRole('button', { name: 'Войти' }));

    await waitFor(() => expect(onVerify).toHaveBeenCalledWith('123456'));
  });

  it('сообщает о неверном коде', async () => {
    const onVerify = jest.fn().mockRejectedValue(new AuthFlowError('wrongCode'));
    await renderWithI18n(<OtpFormView onVerify={onVerify} onResend={jest.fn()} />);

    await fireEvent.changeText(screen.getByLabelText('Код из сообщения'), '000000');
    await fireEvent.press(screen.getByRole('button', { name: 'Войти' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный или просроченный код');
  });

  it('кнопка повторной отправки заблокирована, пока идёт таймер', async () => {
    await renderWithI18n(<OtpFormView onVerify={jest.fn()} onResend={jest.fn()} />);
    expect(screen.getByRole('button', { name: /Повторно через 60/ })).toBeDisabled();
  });
});
