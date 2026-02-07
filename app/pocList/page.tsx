'use client'

import { useEffect, useState } from 'react'
import { DataGrid } from '@mui/x-data-grid'
import { Button, Chip } from '@mui/material'
import Link from 'next/link'

const PocList = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  /* ---------- helpers ---------- */

  const getTagValue = (tags = [], key) =>
    tags.find(t => t.Key === key)?.Value || ''

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'success'
      case 'Stopped':
        return 'warning'
      case 'Pending':
        return 'info'
      case 'Removed':
        return 'default'
      default:
        return 'default'
    }
  }
    const fetchPocs = async () => {
      setLoading(true)
      const res = await fetch('/api/fetchResources')
      const json = await res.json()

      const rows = json.instances.map((inst, index) => ({
        id: inst.InstanceId,               // REQUIRED by DataGrid
        sno: index + 1,
        clientName: getTagValue(inst.Tags, 'ClientName') || '—',
        pocId: getTagValue(inst.Tags, 'pocId'),
        instanceId: inst.InstanceId,
        statusCode: inst.State?.Code,     
        status: mapStatusFromCode(inst.State?.Code),
        url: `https://${getTagValue(inst.Tags, 'pocId')}.poc.saas.prezm.com`,
        kasmStatus: getTagValue(inst.Tags, 'KasmSetupStatus') || 'PENDING',
      }))

      setData(rows)
      setLoading(false)
    }
  /* ---------- fetch ---------- */

  useEffect(() => {
    fetchPocs(); 
    const interval = setInterval(() => {
      fetchPocs();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

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
          <div>
            <div>{row.url}</div>
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
    { field: 'kasmStatus', headerName: 'Poc Status', flex: 1.5 },

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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-5xl bg-slate-900/60 backdrop-blur rounded-2xl shadow-xl p-6">
        <Link href="/" className="text-slate-400 hover:text-white text-sm">
            ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold mb-4 text-center">POC</h1>

        <div style={{ height: 420, width: '100%' }}>
          <DataGrid
            rows={data}
            columns={columns}
            loading={loading}
            pageSizeOptions={[5, 10]}
            disableRowSelectionOnClick
            getRowHeight={() => 'auto'}   // 👈 THIS
          />
        </div>
      </div>
    </main>
  )
}

export default PocList
