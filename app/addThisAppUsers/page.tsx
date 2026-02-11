'use client'

import { useState } from 'react'
import {
  Box,
  TextField,
  Button,
  InputAdornment,
  Typography,
} from '@mui/material'
import { useRouter } from 'next/navigation'

const USERNAME_REGEX = /^[a-z0-9._]+$/

export default function ADDThisAppUsers() {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter();

  const handleChange = (value: string) => {
    const formatted = value.toLowerCase().replace(/\s/g, '') // remove spaces

    if (formatted && !USERNAME_REGEX.test(formatted)) {
      setError('Only lowercase letters, numbers, dot and underscore allowed')
    } else {
      setError('')
    }

    setUsername(formatted)
  }

  const handleSubmit = async () => {
    if (!username.trim()) return

    if (!USERNAME_REGEX.test(username)) {
      setError('Invalid username format')
      return
    }

    const fullEmail = `${username}${process.env.NEXT_PUBLIC_EMAIL_DOMAIN}`

    try {
      setLoading(true)

      const res = await fetch('/api/addThisAppUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fullEmail }),
      })

      const data = await res.json()

      if (res.ok) {
        alert('User added successfully')
        setUsername('')
            router.push('/thisAppUsers')
      } else {
        alert(data.error || 'Failed')
      }
    } catch (err) {
      console.error(err)
      alert('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box sx={{ width: 400 }}>
        <Typography variant="h5" mb={3}>
          Add Allowed User
        </Typography>

        <TextField
          fullWidth
          label="Email Username"
          value={username}
          onChange={(e) => handleChange(e.target.value)}
          error={!!error}
          helperText={error}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end" sx={{ ml: 0 }}>
                {process.env.NEXT_PUBLIC_EMAIL_DOMAIN}
              </InputAdornment>
            ),
            sx: {
              '& .MuiInputAdornment-positionEnd': {
                marginLeft: 0,
              },
            },
          }}
        />

        <Button
          fullWidth
          variant="contained"
          sx={{ mt: 3 }}
          onClick={handleSubmit}
          disabled={loading || !!error}
        >
          {loading ? 'Adding...' : 'Submit'}
        </Button>
      </Box>
    </Box>
  )
}