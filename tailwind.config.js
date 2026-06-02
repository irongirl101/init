export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./assets/**/*.{html,js,css}"
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
};