/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        slsc: {
          red: "#E63329",
          yellow: "#FFD700",
        },
      },
    },
  },
  plugins: [],
}

