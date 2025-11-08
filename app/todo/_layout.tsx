import { Stack } from 'expo-router';

export default function TodoLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          headerTitle: '',
          headerBackTitle: 'Back',
          presentation: 'card',
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
