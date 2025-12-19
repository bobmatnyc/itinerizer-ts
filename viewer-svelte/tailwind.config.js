import { skeleton } from '@skeletonlabs/tw-plugin';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@skeletonlabs/skeleton/**/*.{html,js,svelte,ts}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Minimal color palette - muted slate blue accent
        'minimal-bg': '#fafafa',
        'minimal-card': '#ffffff',
        'minimal-text': '#1f2937',
        'minimal-text-muted': '#6b7280',
        'minimal-border': '#e5e7eb',
        'minimal-accent': '#64748b',
        'minimal-accent-light': '#94a3b8',
      },
    },
  },
  plugins: [
    skeleton({
      themes: {
        preset: [
          {
            name: 'minimal',
            enhancements: true,
          },
        ],
      },
    }),
  ],
};
