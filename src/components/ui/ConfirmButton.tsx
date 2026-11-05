import { useEffect, useState, type ComponentProps } from 'react';

import { Button } from './Button';

const CONFIRM_WINDOW_MS = 4000;

interface ConfirmButtonProps extends Omit<ComponentProps<typeof Button>, 'onPress'> {
  /** Текст на кнопке после первого нажатия. */
  confirmTitle: string;
  onConfirm: () => void;
}

/**
 * Опасное действие подтверждается вторым нажатием в течение 4 секунд.
 * Работает одинаково на iOS, Android и в вебе и не требует системных диалогов.
 */
export function ConfirmButton({ title, confirmTitle, onConfirm, ...rest }: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS);
    return () => clearTimeout(id);
  }, [armed]);

  return (
    <Button
      {...rest}
      title={armed ? confirmTitle : title}
      onPress={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
    />
  );
}
