import type { Config } from 'tailwindcss'
import {
  adminChart,
  adminStatus,
  lumiaColors,
  lumiaFonts,
  lumiaLayout,
  lumiaShadows,
  lumiaTransitions,
} from './shared/design-system/tokens'

/** Tailwind consume los tokens de shared/design-system/tokens.ts (ver docs/design-system.md). */
export default {
  content: ['./app/**/*.{vue,js,ts}', './shared/**/*.{js,ts}'],
  theme: {
    extend: {
      colors: {
        lumia: lumiaColors,
        status: adminStatus,
        chart: adminChart,
      },
      fontFamily: lumiaFonts,
      maxWidth: { content: lumiaLayout.maxContent },
      width: { sidebar: lumiaLayout.sidebarWidth },
      boxShadow: {
        soft: lumiaShadows.soft,
        'soft-lg': lumiaShadows.softLg,
      },
      transitionDuration: {
        150: lumiaTransitions.fast,
        200: lumiaTransitions.normal,
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.35s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
