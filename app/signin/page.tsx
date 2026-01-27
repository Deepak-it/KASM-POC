// app/signIn/page.tsx
'use client'


import * as React from 'react'
import { AppProvider, SignInPage } from '@toolpad/core'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { signIn } from 'next-auth/react'


export const getDesignTokens = (mode: 'light' | 'dark') => ({
  palette: {
    mode,
    primary: { main: '#1976d2' },
    background: {
      default: mode === 'dark' ? '#0f172a' : '#f8fafc',
      paper: mode === 'dark' ? 'rgba(15,23,42,0.6)' : '#ffffff',
    },
  },
  shape: { borderRadius: 16 },
})


export const inputsCustomizations = {}


const theme = createTheme({
  ...getDesignTokens('dark'),
  components: {
    ...inputsCustomizations,
  },
})


export default function SignIn() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-slate-900/60 backdrop-blur rounded-2xl shadow-xl p-8 flex justify-center">
            <SignInPage
              providers={[{ id: 'google', name: 'Google' }]}
              signIn={async (provider) => {
                if (provider.id === 'google') {
                  await signIn('google', { callbackUrl: '/' })
                  return { success: 'true', redirectTo: '/' }
                }
                return { success: 'false', error: 'Only Google sign-in is enabled' }
              }}
            />
          </div>
        </div>
      </AppProvider>
    </ThemeProvider>
  )
}