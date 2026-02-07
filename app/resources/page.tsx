'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    Box,
    Button,
    Checkbox,
    Container,
    FormControl,
    FormControlLabel,
    FormLabel,
    Paper,
    Radio,
    RadioGroup,
    Stack,
    TextField,
    Typography,
    Alert,
    IconButton,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import { useRouter } from 'next/router'

export default function ResourcesPage() {
    const [projectName, setProjectName] = useState('')
    const [multiServer, setMultiServer] = useState(false)
    const [licenses, setLicenses] = useState(1)
    const [region, setRegion] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [response, setResponse] = useState<any>(null)

    const router = useRouter()

    const handleSubmit = async () => {
        setLoading(true)
        setError(null)
        setResponse(null)

        if (!projectName.trim()) {
            setError('Client Name is required')
            setLoading(false)
            return
        }

        if (!region) {
            setError('Region is required')
            setLoading(false)
            return
        }

        if (licenses < 1) {
            setError('Number of licenses must be at least 1')
            setLoading(false)
            return
        }

        try {
            const res = await fetch('/api/addResources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientName: projectName,
                    aws_region: region,
                }),
            })

            const data = await res.json()

            if (!data.success) {
                setError(data.error || 'Failed to create EC2 instance')
            } else {
                setResponse(data)
                router.push('/')
            }
        } catch (err: any) {
            setError(err?.message || 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
            <Paper elevation={6} sx={{ p: 4, width: '100%', borderRadius: 3 }}>
                <Stack spacing={3}>
                    {/* Header */}
                    <Box textAlign="center">
                        <Typography variant="h5" fontWeight={600}>
                            Client Requirements
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Fill in all fields below
                        </Typography>
                    </Box>

                    {/* Client Name */}
                    <TextField
                        label="Client Name"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        required
                        fullWidth
                    />

                    {/* Multi Server */}
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={multiServer}
                                onChange={(e) => setMultiServer(e.target.checked)}
                            />
                        }
                        label="Multi-Server Setup"
                    />

                    {/* Licenses */}
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            Number of User Licenses *
                        </Typography>

                        <Stack direction="row" alignItems="center" spacing={1}>
                            <IconButton
                                onClick={() => setLicenses((l) => Math.max(1, l - 1))}
                            >
                                <RemoveIcon />
                            </IconButton>

                            <TextField
                                type="number"
                                value={licenses}
                                onChange={(e) => setLicenses(Math.max(1, Number(e.target.value)))}
                                inputProps={{ min: 1, style: { textAlign: 'center' } }}
                                sx={{ width: 90 }}
                            />

                            <IconButton onClick={() => setLicenses((l) => l + 1)}>
                                <AddIcon />
                            </IconButton>
                        </Stack>
                    </Box>

                    {/* Region */}
                    <FormControl>
                        <FormLabel>Region *</FormLabel>
                        <RadioGroup
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                        >
                            {['ap-south-1', 'us-east-2', 'ap-southeast-1'].map((r) => (
                                <FormControlLabel
                                    key={r}
                                    value={r}
                                    control={<Radio />}
                                    label={r}
                                />
                            ))}
                        </RadioGroup>
                    </FormControl>

                    {/* Actions */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Link href="/" style={{ textDecoration: 'none' }}>
                            <Typography variant="body2" color="text.secondary">
                                ← Back to Home
                            </Typography>
                        </Link>

                        <Button
                            variant="contained"
                            color="success"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? 'Submitting...' : 'Submit Requirements'}
                        </Button>
                    </Stack>

                    {/* Error */}
                    {error && <Alert severity="error">{error}</Alert>}

                    {/* Response */}
                    {response && (
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography fontWeight={600} gutterBottom>
                                EC2 Instances Created
                            </Typography>
                            <pre style={{ fontSize: 12, color: '#2e7d32' }}>
                                {JSON.stringify(response.instances, null, 2)}
                            </pre>
                        </Paper>
                    )}
                </Stack>
            </Paper>
        </Container>
    )
}