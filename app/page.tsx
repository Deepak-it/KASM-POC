'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'

export default function Home() {
  const { data: session, status } = useSession()
  const [error, setError] = useState<string | null>(null)

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading session...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-slate-900/60 backdrop-blur rounded-2xl shadow-xl p-8 space-y-6">
        
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-slate-400">
            Welcome, {session?.user?.name || session?.user?.email || 'User'} 👋
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/pocList"
            className="bg-purple-600 hover:bg-purple-700 transition px-5 py-2 rounded-xl font-medium text-center"
          >
            POC List
          </Link>

          <Link
            href="/resources"
            className="bg-purple-600 hover:bg-purple-700 transition px-5 py-2 rounded-xl font-medium text-center"
          >
            Add POC
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="bg-red-600 hover:bg-red-700 transition px-5 py-2 rounded-xl font-medium"
          >
            Logout
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>
    </main>
  )
}