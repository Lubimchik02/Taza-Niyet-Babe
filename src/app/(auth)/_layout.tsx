import { Stack } from 'expo-router';

// У группы нет index: без явного начального экрана переход в (auth) ведёт на несуществующий маршрут.
export const unstable_settings = {
  initialRouteName: 'sign-in',
};

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="verify" />
    </Stack>
  );
}
