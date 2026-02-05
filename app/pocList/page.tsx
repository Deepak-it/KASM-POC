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

  const mapStatus = (state) => {
    switch (state) {
      case 'running':
        return 'Active'
      case 'stopped':
        return 'Stopped'
      case 'pending':
        return 'Pending'
      case 'terminated':
      case 'shutting-down':
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

  /* ---------- fetch ---------- */

  useEffect(() => {
    const fetchPocs = async () => {
      setLoading(true)
      const res = await fetch('/api/fetchResources')
      const json = await res.json()

      const rows = json.instances.map((inst, index) => ({
        id: inst.InstanceId,               // REQUIRED by DataGrid
        sno: index + 1,
        clientName: getTagValue(inst.Tags, 'Project') || '—',
        pocId: inst.InstanceId,
        status: mapStatus(inst.State?.Name),
      }))

      setData(rows)
      setLoading(false)
    }

    fetchPocs()
  }, [])

  /* ---------- actions ---------- */

  const onView = (row) => console.log('View', row)
  const onStart = (row) => console.log('Start', row.pocId)
  const onStop = (row) => console.log('Stop', row.pocId)
  const onTerminate = (row) => console.log('Terminate', row.pocId)

  /* ---------- columns ---------- */

  const columns = [
    { field: 'sno', headerName: 'S.No.', width: 80 },
    { field: 'clientName', headerName: 'Client Name', flex: 1 },
    { field: 'pocId', headerName: 'POC ID', flex: 1.5 },

    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },

    {
      field: 'action',
      headerName: 'Action',
      width: 220,
      sortable: false,
      renderCell: ({ row }) => (
        <>
          <Button
            size="small"
            variant="contained"
            sx={{ mr: 1 }}
            onClick={() => onView(row)}
          >
            View
          </Button>

          {row.status === 'Active' && (
            <Button
              size="small"
              color="warning"
              onClick={() => onStop(row)}
            >
              Stop
            </Button>
          )}

          {row.status === 'Stopped' && (
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
          )}

          {(row.status === 'Removed' || row.status === 'Pending') && (
            <span style={{ color: '#aaa', marginLeft: 8 }}>
              No Action
            </span>
          )}
        </>
      ),
    },
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
          />
        </div>
      </div>
    </main>
  )
}

export default PocList
