# Theme Color Usage Guide

## Overview
All colors in the app are centralized in `/constants/theme.ts` to avoid duplication and ensure consistency across light and dark modes.

## Available Colors

### Basic Colors
- `text` - Primary text color
- `background` - Background color
- `tint` - Tint color for highlights
- `primary` - Primary green color (#166534)
- `purple` - Purple accent color (#9333ea)
- `icon` - Icon color
- `secondaryText` - Secondary/muted text color

### Card & UI Colors
- `cardBackground` - Background for cards/panels
- `border` - Border color

### Purple Theme Colors
- `purpleLight` - rgba(147, 51, 234, 0.1) - Light purple background
- `purpleMedium` - rgba(147, 51, 234, 0.2) - Medium purple for borders
- `purpleDark` - rgba(147, 51, 234, 0.8) - Dark purple for active states
- `purpleFull` - rgba(147, 51, 234, 1) - Full purple for text/icons

## Usage Example

```typescript
import { useThemeColor } from '@/hooks/use-theme-color';

export default function MyScreen() {
  // Get theme colors
  const primaryColor = useThemeColor({}, 'primary');
  const secondaryTextColor = useThemeColor({}, 'secondaryText');
  const cardBg = useThemeColor({}, 'cardBackground');
  const purpleLight = useThemeColor({}, 'purpleLight');
  const purpleDark = useThemeColor({}, 'purpleDark');
  const purpleFull = useThemeColor({}, 'purpleFull');

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: purpleLight,
            borderColor: purpleDark,
          }
        ]}>
        <Text style={{ color: purpleFull }}>Button</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Benefits

1. **Consistency** - All pages use the same colors
2. **Dark Mode Support** - Colors automatically adapt to light/dark mode
3. **Easy Updates** - Change colors in one place
4. **Type Safety** - TypeScript ensures valid color keys
5. **No Duplication** - Avoid hardcoded color values

## Adding New Colors

To add new colors, edit `/constants/theme.ts`:

```typescript
export const Colors = {
  light: {
    // ... existing colors
    myNewColor: '#FF0000',
  },
  dark: {
    // ... existing colors
    myNewColor: '#FF6666', // Lighter version for dark mode
  },
};
```

Then use it in your component:

```typescript
const myColor = useThemeColor({}, 'myNewColor');
```
