/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors : {
        white : {
          "1000" : "#fff",
          "500" : "rgb(255,255,255,0.5)",
          "blur" : "rgb(253,229,238)",
          "blur2" : "rgb(240,230,237)",
        }
      },
      fontFamily : {
        "Rubik-Microbe" : "'Rubik Microbe', cursive"
      },
      screens : {
        "xsm" : "576px",
      }
    },
  },
  plugins: [],
}
