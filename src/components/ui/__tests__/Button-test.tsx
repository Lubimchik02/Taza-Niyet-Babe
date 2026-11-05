import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '../Button';

describe('Button', () => {
  it('вызывает onPress и доступна экранному чтецу по названию', async () => {
    const onPress = jest.fn();
    await render(<Button title="Принять квест" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Принять квест' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('не нажимается в состоянии загрузки', async () => {
    const onPress = jest.fn();
    await render(<Button title="Отправить" loading onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Отправить' });
    expect(button).toBeDisabled();
    expect(button).toBeBusy();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('имеет высоту не меньше 56 dp (работа в перчатках)', async () => {
    await render(<Button title="Начать задание" />);
    expect(screen.getByRole('button')).toHaveStyle({ minHeight: 56 });
  });
});
