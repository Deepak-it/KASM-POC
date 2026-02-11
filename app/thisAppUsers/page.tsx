'use client'

import { useEffect, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'

export default function ThisAppUsers() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
    const fetchData = async () => {
      try {
        const res = await fetch('/api/getThisAppUser')
        const data = await res.json()

        const formatted = data.users.map((email: string, index: number) => ({
          id: index + 1,
          sno: index + 1,
          email,
        }))

        setRows(formatted)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
  const columns: GridColDef[] = [
    { field: 'sno', headerName: 'S.No.', width: 90 },
    { field: 'email', headerName: 'Email', flex: 1 },
    {
    field: 'actions',
    headerName: 'Actions',
    width: 120,
    renderCell: ({ row }) => (
        <Button
        size="small"
        color="error"
        onClick={async () => {
            await fetch('/api/deleteThisAppUser', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: row.email }),
            })

            // refresh grid
            fetchData()
        }}
        >
        Delete
        </Button>
    ),
    }
  ]

  useEffect(() => {
    fetchData()
  }, [])

  return (
        <>

      <div style={{ display: 'flex', justifyContent: 'space-between' }} className="text-center space-y-2">
        <div style={{ justifyContent: 'space-around' }}><h1 className="text-3xl font-bold">Allowed POC Creators</h1>
      </div>



              <div style={{ display: 'flex', marginBottom: '10px', alignItems: 'end', gap: '10px' }}>

          <Button
            href="/addThisAppUsers"
            type='submit'
            variant="contained"
            className="bg-purple-600 hover:bg-purple-700 transition px-5 py-2 rounded-xl font-medium text-center"
          >
            Add Creator
          </Button>
                  </div>    </div>

    <Box sx={{ width: '100%' }}>

      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        pageSizeOptions={[5, 10, 20]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10, page: 0 } },
        }}
      />
    </Box>
        </>

  )
}