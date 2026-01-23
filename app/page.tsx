'use client'

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import axios from "axios";
export default function Home() {
  const { data: session, status } = useSession();
  const [resources, setResources] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  function handleLoginGoogle() {
    signIn("google", { callbackUrl: "/" })
  }

  async function handleRetrieveResources() {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/fetchResources');
      setResources(response.data);
    } catch (err) {
      const errorMessage: any = err instanceof Error ? err.message : 'Failed to fetch resources';
      setError(errorMessage);
      console.error('Error fetching resources:', err);
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return <div style={{ textAlign: "center", marginTop: "100px" }}>Loading...</div>;
  }

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      {!session ? (
        <>
          <h2>Login</h2>
          <button
            onClick={handleLoginGoogle}
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            Sign in with Google
          </button>
        </>
      ) : (
        <>
          <h2>Welcome, {session.user?.name || session.user?.email || 'User'}!</h2>

          <button
            onClick={handleRetrieveResources}
            disabled={loading}
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer",
              marginBottom: "20px",
            }}
          >
            {loading ? "Retrieving..." : "Retrieve Resources"}
          </button>

          <br />
          <button onClick={() => signOut()}>
            Logout
          </button>

          {error && (
            <div style={{ color: "red", marginTop: "20px" }}>
              Error: {error}
            </div>
          )}

          {resources && (
            <div style={{ marginTop: "20px", textAlign: "left", display: "inline-block" }}>
              <h3>Resources:</h3>
              <pre>{JSON.stringify(resources, null, 2)}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
