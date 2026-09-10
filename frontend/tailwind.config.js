/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        akwa: {
          orange: '#E8611A',
          orangeDark: '#C94E0F',
          orangeLight: '#F97316',
          blanc: '#FAF8F3',
          beige: '#F4EFE6',
          vert: '#0B7A3E',
          vertClair: '#16A34A',
          gris: '#6B7280',
          grisCarte: '#4B5563',
          nuit: '#0D1B2A',
          texte: '#1E293B',
          frontiere: '#CBD5E1',
          rose: '#EC4899',
          bleu: '#2563EB',
          rouge: '#DC2626',
          violet: '#7C3AED',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        button: '8px',
        badge: '9999px',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.08)',
        sidebar: '4px 0 24px rgba(0,0,0,0.06)',
        haloOrange: '0 0 20px rgba(232,97,26,0.4)',
      },
      animation: {
        'pulse-akwa': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up': 'fadeInUp 300ms ease-out',
        'slide-in-right': 'slideInRight 500ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { width: '0', opacity: '0' },
          '100%': { width: '360px', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
