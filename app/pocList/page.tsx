'use client'

import { useEffect, useState } from 'react'

const LOGGED_IN_EMAIL = 'deepak@intersourcesinc.com' // replace later from session

const PocList = () => {
  const [data, setData] = useState([])

  /* ---------------- helpers ---------------- */

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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-success'
      case 'Stopped':
        return 'bg-warning text-dark'
      case 'Pending':
        return 'bg-info'
      case 'Removed':
        return 'bg-secondary'
      default:
        return 'bg-light text-dark'
    }
  }

  /* ---------------- API fetch ---------------- */

  useEffect(() => {
    const fetchPocs = async () => {
      const res = await fetch('/api/fetchResources')
      const json = await res.json()

      if (!json.success) return

      const rows = json.instances
        // 1️⃣ createdBy filter
        .filter(
          inst =>
            getTagValue(inst.Tags, 'createdBy') === LOGGED_IN_EMAIL
        )
        // 2️⃣ normalize data
        .map((inst) => ({
          clientName: getTagValue(inst.Tags, 'Project') || '—',
          pocId: inst.InstanceId,
          status: mapStatus(inst.State?.Name),
        }))

      setData(rows)
    }

    fetchPocs()
  }, [])

  /* ---------------- actions ---------------- */

  const onView = (item) => {
    console.log('View', item)
  }

  const onStart = (item) => {
    console.log('Start', item.pocId)
  }

  const onStop = (item) => {
    console.log('Stop', item.pocId)
  }

  const onTerminate = (item) => {
    console.log('Terminate', item.pocId)
  }

  const renderActions = (item) => {
    switch (item.status) {
      case 'Active':
        return (
          <button
            className="btn btn-sm btn-warning"
            onClick={() => onStop(item)}
          >
            Stop
          </button>
        )

      case 'Stopped':
        return (
          <>
            <button
              className="btn btn-sm btn-success me-2"
              onClick={() => onStart(item)}
            >
              Start
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => onTerminate(item)}
            >
              Terminate
            </button>
          </>
        )

      case 'Removed':
        return <span className="text-muted">No Action</span>

      case 'Pending':
        return <span className="text-muted">Initializing…</span>

      default:
        return null
    }
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="table-responsive">
      <table className="table table-bordered table-hover align-middle">
        <thead className="table-light">
          <tr>
            <th style={{ width: '60px' }}>S.No.</th>
            <th>Client Name</th>
            <th>POC ID</th>
            <th>Status</th>
            <th style={{ width: '180px' }}>Action</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center">
                No records found
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr key={item.pocId}>
                <td>{index + 1}</td>
                <td>{item.clientName}</td>
                <td>{item.pocId}</td>
                <td>
                  <span className={`badge ${getStatusBadge(item.status)}`}>
                    {item.status}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-primary me-2"
                    onClick={() => onView(item)}
                  >
                    View
                  </button>

                  {renderActions(item)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default PocList
