/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // SKKU 건축 미니멀 팔레트
        primary: '#1a1a1a',
        secondary: '#4a4a4a',
        accent: '#c9a227',
        muted: '#8a8a8a',
        surface: '#fafafa',
        'surface-dark': '#f0f0f0',
        border: '#e5e5e5',
        'border-dark': '#d0d0d0',
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
        serif: ['Space Grotesk', 'Georgia', 'serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      fontSize: {
        'display-lg': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display': ['3.5rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'display-sm': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'heading': ['1.75rem', { lineHeight: '1.3' }],
        'subheading': ['1.25rem', { lineHeight: '1.4' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'caption': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.05em' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      maxWidth: {
        'content': '1200px',
        'prose': '65ch',
      },
      aspectRatio: {
        'cinema': '16 / 9',
        'portrait': '3 / 4',
        'wide': '21 / 9',
      },
      gridTemplateColumns: {
        'home': '80px 1fr 320px',
        'home-md': '1fr 280px',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'slide-in-right': 'slideInRight 0.5s ease-out',
        'underline': 'underlineExpand 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        underlineExpand: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

