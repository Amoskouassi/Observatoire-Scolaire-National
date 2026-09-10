/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ivoire: {
          orange: '#E8611A',
          'orange-dark': '#C94E0F',
          vert: '#0B7A3E',
          'vert-clair': '#16A34A',
          blanc: '#FAF8F3',
          beige: '#F4EFE6',
          gris: '#6B7280',
          'gris-carte': '#4B5563',
          nuit: '#0D1B2A',
          texte: '#1E293B',
          frontiere: '#CBD5E1',
          rose: '#EC4899',
          bleu: '#2563EB',
          rouge: '#DC2626',
          violet: '#7C3AED',
        },
        surface: {
          DEFAULT: '#F4EFE6',
          dim: '#cfdaf2',
          bright: '#f9f9ff',
          container: { low: '#f0f3ff', DEFAULT: '#e7eeff', high: '#dee8ff', highest: '#d8e3fb' },
          'container-lowest': '#ffffff',
        },
        primary: { DEFAULT: '#E8611A', container: '#C94E0F', fixed: '#ffdbcd', 'fixed-dim': '#ffb597' },
        secondary: { DEFAULT: '#0B7A3E', container: '#93f5ab', fixed: '#96f7ad', 'fixed-dim': '#7adb93' },
        error: { DEFAULT: '#ba1a1a', container: '#ffdad6' },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '900' }],
        'headline-sm': ['1.125rem', { lineHeight: '1.35', fontWeight: '700' }],
        'headline-md': ['1.375rem', { lineHeight: '1.3', letterSpacing: '-0.015em', fontWeight: '700' }],
        'headline-lg': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.025em', fontWeight: '900' }],
        'headline-lg-mobile': ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.02em', fontWeight: '900' }],
        'kpi-metric': ['2.5rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '900' }],
        'kpi-metric-mobile': ['1.875rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '900' }],
        'label-sm': ['0.75rem', { lineHeight: '1.2', letterSpacing: '0.05em', fontWeight: '700' }],
        'label-md': ['0.875rem', { lineHeight: '1.25', letterSpacing: '0.01em', fontWeight: '600' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.5', letterSpacing: '0.01em', fontWeight: '400' }],
        'body-md': ['0.9375rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-lg': ['1.125rem', { lineHeight: '1.65', fontWeight: '400' }],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.06)',
        sheet: '0 -4px 20px rgba(0,0,0,0.08)',
        halo: '0 0 20px rgba(232,97,26,0.35)',
        nav: '0 -4px 20px rgba(0,0,0,0.06)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 300ms ease-out',
        'slide-up': 'slideUp 500ms cubic-bezier(0.4,0,0.2,1)',
        'pulse-dot': 'pulseDot 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
};
