export const getDesignTokens = (mode: "light" | "dark") => ({
  palette: {
    mode,
    primary: {
      main: "#1976d2",
    },
    background: {
      default: mode === "dark" ? "#0f172a" : "#f8fafc",
      paper: mode === "dark" ? "rgba(15,23,42,0.6)" : "#ffffff",
    },
  },
  shape: {
    borderRadius: 16,
  },
});

export const inputsCustomizations = {
  MuiContainer: {
    styleOverrides: {
      root: {
        minHeight: "unset",
        height: "auto",
        display: "block", 
      },
    },
  },
};
