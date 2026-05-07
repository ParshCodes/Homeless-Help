module.exports = {
  content: [
    './src/pages/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
    './src/context/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        safespot: {
          background: '#0f172a',
          surface: '#1e293b',
          primary: '#2563eb',
          primaryAccent: '#60a5fa',
        },
      },
    },
  },
  plugins: [],
};
