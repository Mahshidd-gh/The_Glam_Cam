module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      animation: {
        scan: "scan 2s linear infinite",
        float: "float 6s ease-in-out infinite"
      },
      keyframes: {
        scan: {
          "0%": { top: "0%" },
          "100%": { top: "100%" }
        },
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" }
        }
      }
    }
  },
  plugins: []
};