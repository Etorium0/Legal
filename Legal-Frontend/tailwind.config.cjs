module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx,html}'],
  theme: {
    extend: {
      colors: {
        primary: '#4B63FF',
        bg: '#0D1117',
        sidebar: '#0F172A',
      },
      borderRadius: {
        xl: '12px',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(0,0,0,0.24)',
      },
      backgroundImage: {
        aiPattern: "radial-gradient(1200px 600px at 100% 0%, rgba(75,99,255,0.08), transparent), radial-gradient(800px 400px at 0% 100%, rgba(75,99,255,0.06), transparent)",
        grid: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '40px 40px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
