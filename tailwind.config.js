/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'media', // or 'class'
  theme: {
    extend: {
      colors: {
        'pycelium-purple': '#9370DB',
        'pycelium-dark-purple': '#6a4a9b',
        'dark-background': '#121212',
        'dark-secondary': '#1E1E1E',
        'light-text': '#F5F5F5',
        'dark-text': '#E0E0E0',
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      textColor: {
        'primary': '#F5F5F5', // White text for primary text
        'link-primary': '#9370DB', // Light purple for links
      },
    },
  },
  plugins: [],
}
