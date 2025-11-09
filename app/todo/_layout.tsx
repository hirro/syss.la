import { Stack } from 'expo-router';

export default function TodoLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerBackTitle: 'Home',
        presentation: 'card',
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerTransparent: false,
      }}>
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
