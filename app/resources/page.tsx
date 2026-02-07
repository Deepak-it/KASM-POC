'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ResourcesPage() {
    const [projectName, setProjectName] = useState('')
    const [multiServer, setMultiServer] = useState(false)
    const [licenses, setLicenses] = useState(1)
    const [region, setRegion] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [response, setResponse] = useState<any>(null)

    const handleSubmit = async () => {
        setLoading(true)
        setError(null)
        setResponse(null)

        // Validate all fields
        if (!projectName.trim()) {
            setError('Project Name is required')
            setLoading(false)
            return
        }
        if (!region.trim()) {
            setError('Region is required')
            setLoading(false)
            return
        }
        if (!licenses || licenses < 1) {
            setError('Number of Licenses must be at least 1')
            setLoading(false)
            return
        }
        // multiServer is boolean, default is false, no need for null check

        try {
            const res = await fetch('/api/addResources', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ clientName: projectName, aws_region: region }),
            })

            const data = await res.json()

            if (!data.success) {
                setError(data.error || 'Failed to create EC2 instance')
            } else {
                setResponse(data)
                
            }
        } catch (err: any) {
            console.error(err)
            setError(err?.message || 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center p-6">
            <div className="w-full max-w-xl bg-slate-900/60 backdrop-blur rounded-2xl shadow-xl p-8 space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">Client Requirements</h1>
                    <p className="text-slate-400 text-sm">Fill in all fields below</p>
                </div>

                <div className="space-y-5">
                    {/* Project Name */}
                    <div className="bg-slate-800/60 p-4 rounded-xl space-y-2">
                        <label className="font-medium">Client Name *</label>
                        <input
                            type="text"
                            placeholder="Enter client name"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                        />
                    </div>

                    {/* Multi-Server */}
                    <div className="flex items-center justify-between bg-slate-800/60 p-4 rounded-xl">
                        <label className="font-medium">Multi‑Server Setup *</label>
                        <input
                            type="checkbox"
                            checked={multiServer}
                            onChange={(e) => setMultiServer(e.target.checked)}
                            className="w-5 h-5 accent-purple-600"
                        />
                    </div>

                    {/* Licenses */}
                    <div className="bg-slate-800/60 p-4 rounded-xl space-y-2">
                        <label className="font-medium">Number of User Licenses *</label>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setLicenses((l) => Math.max(1, l - 1))}
                                className="bg-slate-700 px-3 py-1 rounded-lg text-lg"
                            >
                                −
                            </button>
                            <input
                                type="number"
                                value={licenses}
                                onChange={(e) => setLicenses(Math.max(1, Number(e.target.value)))}
                                className="w-20 text-center bg-slate-900 border border-slate-700 rounded-lg py-1"
                                min={1}
                            />
                            <button
                                type="button"
                                onClick={() => setLicenses((l) => l + 1)}
                                className="bg-slate-700 px-3 py-1 rounded-lg text-lg"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Region */}
                    <div className="bg-slate-800/60 p-4 rounded-xl space-y-3">
                        <label className="font-medium">Region *</label>

                        <div className="space-y-2">
                            {[
                            "ap-south-1",
                            "us-east-2",
                            "ap-southeast-1",
                            ].map((value) => (
                            <label
                                key={value}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <input
                                type="radio"
                                name="region"
                                value={value}
                                checked={region === value}
                                onChange={(e) => setRegion(e.target.value)}
                                className="accent-blue-500"
                                />
                                <span>{value}</span>
                            </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center pt-4 gap-4">
                    <Link href="/" className="text-slate-400 hover:text-white text-sm">
                        ← Back to Home
                    </Link>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 transition px-5 py-2 rounded-xl font-medium disabled:opacity-50"
                    >
                        {loading ? 'Submitting...' : 'Submit Requirements'}
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {response && (
                    <div className="bg-black/40 rounded-xl p-4 overflow-auto max-h-64 mt-4">
                        <h3 className="text-lg font-semibold mb-2">EC2 Instances Created</h3>
                        <pre className="text-sm text-green-400 whitespace-pre-wrap">
                            {JSON.stringify(response.instances, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </main>
    )
}
