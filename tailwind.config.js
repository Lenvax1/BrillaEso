/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        lg: "1.5rem",
      },
    },
    extend: {
      colors: {
        bg: "#0B0B12",
        surface: "#121225",
        text: {
          primary: "#F5F7FF",
          secondary: "#B7B9D3",
        },
        neon: {
          green: "#FD105E",
          purple: "#8A5CFF",
        },
        danger: "#FF4D6D",
      },
      boxShadow: {
        glowGreen: "0 0 24px rgba(253, 16, 94, 0.25)",
        glowPurple: "0 0 24px rgba(138, 92, 255, 0.25)",
      },
    },
  },
  plugins: [],
};
