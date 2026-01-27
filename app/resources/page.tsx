// app/resources/page.tsx
'use client'


import { useState } from 'react'
import Link from 'next/link'


export default function ResourcesPage() {
    const [multiServer, setMultiServer] = useState(false)
    const [licenses, setLicenses] = useState(1)
    const [region, setRegion] = useState('')


    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center p-6">
            <div className="w-full max-w-xl bg-slate-900/60 backdrop-blur rounded-2xl shadow-xl p-8 space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">Client Requirements</h1>
                    <p className="text-slate-400 text-sm">Fill in the infrastructure needs below</p>
                </div>


                <div className="space-y-5">
                    {/* Server Type */}
                    <div className="flex items-center justify-between bg-slate-800/60 p-4 rounded-xl">
                        <label className="font-medium">Multi‑Server Setup</label>
                        <input
                            type="checkbox"
                            checked={multiServer}
                            onChange={(e) => setMultiServer(e.target.checked)}
                            className="w-5 h-5 accent-purple-600"
                        />
                    </div>


                    {/* Licenses */}
                    <div className="bg-slate-800/60 p-4 rounded-xl space-y-2">
                        <label className="font-medium">Number of User Licenses</label>
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
                    <div className="bg-slate-800/60 p-4 rounded-xl space-y-2">
                        <label className="font-medium">Region</label>
                        <input
                            type="text"
                            placeholder="ap-south-1"
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
                        />
                    </div>
                </div>


                <div className="flex justify-between items-center pt-4">
                    <Link href="/" className="text-slate-400 hover:text-white text-sm">← Back to Home</Link>
                    <button className="bg-green-600 hover:bg-green-700 transition px-5 py-2 rounded-xl font-medium">
                        Submit Requirements
                    </button>
                </div>
            </div>
        </main>
    )
}