import { fireEvent, render, screen } from '@testing-library/react-native';

import { ChoiceGroup } from '../ChoiceGroup';

const options = [
  { value: 'admin', label: 'Администратор' },
  { value: 'volunteer', label: 'Волонтёр' },
] as const;

describe('ChoiceGroup', () => {
  it('объявляет выбранный вариант экранному чтецу', async () => {
    await render(
      <ChoiceGroup label="Роль" value="volunteer" options={options} onChange={jest.fn()} />,
    );
    expect(screen.getByRole('radio', { name: 'Волонтёр' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Администратор' })).not.toBeChecked();
  });

  it('сообщает о выборе', async () => {
    const onChange = jest.fn();
    await render(
      <ChoiceGroup label="Роль" value="volunteer" options={options} onChange={onChange} />,
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Администратор' }));
    expect(onChange).toHaveBeenCalledWith('admin');
  });
});
