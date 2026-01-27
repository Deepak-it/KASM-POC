"use client";

import * as React from "react";
import { AppProvider, SignInPage } from "@toolpad/core";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { signIn } from "next-auth/react";
import { getDesignTokens, inputsCustomizations } from "./customTheme";

const theme = createTheme({
  ...getDesignTokens("light"),
  components: {
    ...inputsCustomizations,
  },
});

export default function SignIn() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <SignInPage
          providers={[
            {
              id: "google",
              name: "Google",
            },
          ]}
          signIn={async (provider) => {
            if (provider.id === "google") {
              // Trigger NextAuth Google login
              await signIn("google", { callbackUrl: "/" });

              // Toolpad still expects a return object
              return {
                success: "true",
                redirectTo: "/",
              };
            }

            return {
              success: "false",
              error: "Only Google sign-in is enabled",
            };
          }}
        />
      </AppProvider>
    </ThemeProvider>
  );
}
