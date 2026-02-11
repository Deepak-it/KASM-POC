'use client'

import { useState, useEffect } from 'react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { DataGrid } from '@mui/x-data-grid'
import { Box, Button, Chip, FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import { IconButton, Tooltip } from '@mui/material'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'

const REGIONS = [
  { label: 'Singapore', value: 'ap-southeast-1' },
  { label: 'US (Ohio)', value: 'us-east-2' },
  { label: 'Bombay', value: 'ap-south-1' },
]

export default function Home() {
  const { data: session, status } = useSession()
  const [error, setError] = useState<string | null>(null)
  const [dataForGrid, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [region, setRegion] = useState('us-east-2')
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})

  /* ---------- api ---------- */
  const fetchPocs = async () => {
    setLoading(true)

    const res = await fetch(`/api/fetchResources?region=${region}`)
    const json = await res.json()

    const rows =
      json?.instances?.map((inst: any, index: number) => ({
        id: inst.InstanceId,
        sno: index + 1,
        clientName: getTagValue(inst.Tags, 'ClientName') || '—',
        pocId: getTagValue(inst.Tags, 'pocId'),
        instanceId: inst.InstanceId,
        statusCode: inst.State?.Code,
        status: mapStatusFromCode(inst.State?.Code),
        url: `https://${getTagValue(inst.Tags, 'pocId')}.poc.saas.prezm.com`,
        kasmStatus: getTagValue(inst.Tags, 'KasmSetupStatus') || 'PENDING',
        kasmPassword: inst.kasmPassword
      })) || []

    setData(rows)
    setLoading(false)
  }

  const mapStatusFromCode = (code) => {
    switch (code) {
      case 0:
        return 'Pending'
      case 16:
        return 'Active'
      case 64:
        return 'Pending'
      case 80:
        return 'Stopped'
      case 32:
      case 48:
        return 'Removed'
      default:
        return 'Unknown'
    }
  }

  const getTagValue = (tags = [], key) =>
    tags.find(t => t.Key === key)?.Value || ''


  useEffect(() => {
    fetchPocs()
    const interval = setInterval(fetchPocs, 15000)
    return () => clearInterval(interval)
  }, [region])
  /* ---------- helpers ---------- */

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading session...</p>
      </main>
    )
  }

  const togglePassword = (id: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id],
    }))
  }
  const startStopInstance = async (instanceId, pocId, action) => {
    try {
      const res = await fetch('/api/toggleStopStartResource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId, action, pocId }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        // refresh list after successful start/stop
        fetchPocs()
      } else {
        console.error('Action failed:', data.message)
      }
    } catch (err) {
      console.error('API error:', err)
    }
  }

  /* ---------- actions ---------- */

  const onView = (row) => console.log('View', row)

  const onStart = (row) => startStopInstance(row.instanceId, '', 'start')

  const onStop = (row) => startStopInstance(row.instanceId, '', 'stop')

  const getStatusColorFromCode = (code) => {
    switch (code) {
      case 16: // running
        return 'success'
      case 80: // stopped
        return 'warning'
      case 0:  // pending
      case 64: // stopping
        return 'info'
      case 32: // shutting-down
      case 48: // terminated
        return 'default'
      default:
        return 'default'
    }
  }

  const onTerminate = (row) => startStopInstance(row.instanceId, row.pocId, 'terminate')

  /* ---------- columns ---------- */

  const columns = [
    { field: 'sno', headerName: 'S.No.', width: 80 },
    { field: 'clientName', headerName: 'Client Name', flex: 1 },
    { field: 'pocId', headerName: 'POC ID', flex: 1.5 },
    {
      field: 'url',
      headerName: 'URL',
      flex: 1.5,
      renderCell: ({ row }) => {
        const status = row.kasmStatus
        console.log(status, '1234')
        return (
          <div style={{ display: 'flex' }}>
            <div style={{ marginRight: '10px' }}>{row.url}</div>
            <Chip
              label={status}
              size="small"
              color={
                status.toLowerCase() === 'active'
                  ? 'success'
                  : status.toLowerCase() === 'failed'
                    ? 'error'
                    : 'info'
              }
            />
          </div>
        )
      },
    },
    {
      field: 'kasmPassword',
      headerName: 'Password',
      flex: 1,
      sortable: false,
      renderCell: ({ row }) => {
        const isVisible = visiblePasswords[row.InstanceId]
        const password = row.kasmPassword || '-'

        return (
          <>
           <div>admin@kasm.local</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'monospace' }}>
              {isVisible ? password : '••••••••••'}
            </span>

            {password !== '-' && (
              <Tooltip title={isVisible ? 'Hide Password' : 'Show Password'}>
                <IconButton
                  size="small"
                  onClick={() => togglePassword(row.InstanceId)}
                >
                  {isVisible ? (
                    <VisibilityOffIcon fontSize="small" />
                  ) : (
                    <VisibilityIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            )}
            </div>
          </>
        )
      },
    },

    { field: 'instanceId', headerName: 'EC2 ID', flex: 1.5 },

    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: ({ row }) => (
        <Chip
          label={row.status}
          color={getStatusColorFromCode(row.statusCode)}
          size="small"
        />
      ),
    },

    {
      field: 'action',
      headerName: 'Action',
      width: 240,
      sortable: false,
      renderCell: ({ row }) => {
        switch (row.statusCode) {
          // 16 → running
          case 16:
            return (
              <Button
                size="small"
                color="warning"
                onClick={() => onStop(row)}
              >
                Stop
              </Button>
            )

          // 80 → stopped
          case 80:
            return (
              <>
                <Button
                  size="small"
                  color="success"
                  sx={{ mr: 1 }}
                  onClick={() => onStart(row)}
                >
                  Start
                </Button>

                <Button
                  size="small"
                  color="error"
                  onClick={() => onTerminate(row)}
                >
                  Terminate
                </Button>
              </>
            )

          // transitional states
          // 0 → pending, 64 → stopping, 32 → shutting-down
          case 0:
          case 64:
          case 32:
            return (
              <span style={{ color: '#1976d2' }}>
                In Progress…
              </span>
            )

          // 48 → terminated
          case 48:
            return (
              <span style={{ color: '#aaa' }}>
                No Action
              </span>
            )

          // fallback safety
          default:
            return (
              <span style={{ color: '#aaa' }}>
                —
              </span>
            )
        }
      },
    }

  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between' }} className="text-center space-y-2">
        <div style={{ justifyContent: 'space-around' }}><h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-slate-400">
            Welcome, {session?.user?.name || session?.user?.email || 'User'} 👋
          </p></div>
        <div style={{ display: 'flex', marginBottom: '10px', alignItems: 'end' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Region</InputLabel>
            <Select
              value={region}
              label="Region"
              onChange={(e) => setRegion(e.target.value)}
            >
              {REGIONS.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
        <div style={{ display: 'flex', marginBottom: '10px', alignItems: 'end', gap: '10px' }}>

          <Button
            href="/thisAppUsers"
            type='submit'
            variant="contained"
            className="bg-purple-600 hover:bg-purple-700 transition px-5 py-2 rounded-xl font-medium text-center"
          >
            Creators
          </Button>

          <Button
            href="/resources"
            type='submit'
            variant="contained"
            className="bg-purple-600 hover:bg-purple-700 transition px-5 py-2 rounded-xl font-medium text-center"
          >
            Add POC
          </Button>

          <Button
            variant="outlined"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="bg-red-600 hover:bg-red-700 transition px-5 py-2 rounded-xl font-medium"
          >
            Logout
          </Button>
        </div>
      </div>
      <Box sx={{ width: '100%' }}>
        <DataGrid
          rows={dataForGrid}
          columns={columns}
          loading={loading}
          pageSizeOptions={[5, 10]}
          disableRowSelectionOnClick
          getRowHeight={() => 'auto'}   // 👈 THIS
        />
      </Box>
    </>
  )
}