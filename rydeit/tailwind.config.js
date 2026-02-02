/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./{components,src}/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
        heading: ['Black Ops One', 'sans-serif'],
      },
      colors: {
        brand: {
          orange: '#FF5F1F',
          yellow: '#FFC700',
          teal: '#00C2C7',
          black: '#121212',
          gray: {
            light: '#F5F5F5',
            dark: '#222222',
          }
        }
      }
    }
  },
  plugins: [],
}
