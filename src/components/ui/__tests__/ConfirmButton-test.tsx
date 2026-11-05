import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ConfirmButton } from '../ConfirmButton';

describe('ConfirmButton', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('срабатывает только со второго нажатия', async () => {
    const onConfirm = jest.fn();
    await render(<ConfirmButton title="Исключить" confirmTitle="Точно?" onConfirm={onConfirm} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Исключить' }));
    expect(onConfirm).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Точно?' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Исключить' })).toBeOnTheScreen();
  });

  it('через 4 секунды подтверждение сбрасывается', async () => {
    const onConfirm = jest.fn();
    await render(<ConfirmButton title="Покинуть" confirmTitle="Точно?" onConfirm={onConfirm} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Покинуть' }));
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Покинуть' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
