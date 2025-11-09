'use client';

/**
 * Admin page for database initialization and curation
 * Visit: https://your-app.vercel.app/admin
 */

import { useState } from 'react';

export default function AdminPage() {
  const [initResult, setInitResult] = useState<any>(null);
  const [curateResult, setCurateResult] = useState<any>(null);
  const [seedResult, setSeedResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleInitDb = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/init-db');
      const data = await res.json();
      setInitResult(data);
    } catch (error: any) {
      setInitResult({ success: false, error: error.message });
    }
    setLoading(false);
  };

  const handleCurate = async (count: number = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/curate?limit=${count}`);
      const data = await res.json();
      setCurateResult(data);
    } catch (error: any) {
      setCurateResult({ success: false, error: error.message });
    }
    setLoading(false);
  };

  const handleSeedSamples = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/seed-samples');
      const data = await res.json();
      setSeedResult(data);
    } catch (error: any) {
      setSeedResult({ success: false, error: error.message });
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>🔧 Admin Panel</h1>
      <p>Database management and puzzle curation</p>

      <hr style={{ margin: '30px 0' }} />

      {/* Initialize Database */}
      <section style={{ marginBottom: '40px' }}>
        <h2>1. Initialize Database</h2>
        <p>Creates the database tables. Run this once.</p>
        <button
          onClick={handleInitDb}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? 'Running...' : 'Initialize Database'}
        </button>

        {initResult && (
          <pre style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: initResult.success ? '#d4edda' : '#f8d7da',
            border: `1px solid ${initResult.success ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '5px',
            overflow: 'auto',
          }}>
            {JSON.stringify(initResult, null, 2)}
          </pre>
        )}
      </section>

      <hr style={{ margin: '30px 0' }} />

      {/* Seed Sample Puzzles */}
      <section style={{ marginBottom: '40px' }}>
        <h2>2. Add Sample Puzzles (Recommended)</h2>
        <p>Add 5 pre-populated sample puzzles for testing. Use this if Reddit API is blocked.</p>
        <button
          onClick={handleSeedSamples}
          disabled={loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#ffc107',
            color: 'black',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? 'Adding...' : 'Add Sample Puzzles'}
        </button>

        {seedResult && (
          <pre style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: seedResult.success ? '#d4edda' : '#f8d7da',
            border: `1px solid ${seedResult.success ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '5px',
            overflow: 'auto',
          }}>
            {JSON.stringify(seedResult, null, 2)}
          </pre>
        )}
      </section>

      <hr style={{ margin: '30px 0' }} />

      {/* Curate Puzzles */}
      <section>
        <h2>3. Curate from Reddit (Optional)</h2>
        <p>Fetch puzzles from Reddit. Each click processes 1-2 posts (~30 seconds each).</p>
        <p><strong>Note:</strong> Reddit may block Vercel IPs. Use sample puzzles instead if this fails.</p>

        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button
            onClick={() => handleCurate(1)}
            disabled={loading}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            Add 1 Puzzle
          </button>

          <button
            onClick={() => handleCurate(2)}
            disabled={loading}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            Add 2 Puzzles
          </button>
        </div>

        {loading && (
          <div style={{ marginTop: '20px', color: '#666' }}>
            ⏳ Processing... This may take 30-60 seconds.
          </div>
        )}

        {curateResult && (
          <pre style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: curateResult.success ? '#d4edda' : '#f8d7da',
            border: `1px solid ${curateResult.success ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '5px',
            overflow: 'auto',
            maxHeight: '400px',
          }}>
            {JSON.stringify(curateResult, null, 2)}
          </pre>
        )}
      </section>

      <hr style={{ margin: '30px 0' }} />

      {/* Instructions */}
      <section style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '5px' }}>
        <h3>📝 Instructions</h3>
        <ol>
          <li><strong>Initialize Database</strong> - Click once to create tables</li>
          <li><strong>Add Sample Puzzles</strong> - Click to add 5 test puzzles (fastest option)</li>
          <li><strong>Or Curate from Reddit</strong> - If you want real Reddit data and it's not blocked</li>
          <li><strong>Play!</strong> - Go back to homepage and play the game</li>
        </ol>
        <p style={{ marginTop: '15px', color: '#666', fontSize: '14px' }}>
          💡 Tip: Sample puzzles are the easiest way to get started. Reddit curation may be blocked by Vercel.
        </p>
      </section>

      <hr style={{ margin: '30px 0' }} />

      <div style={{ textAlign: 'center' }}>
        <a href="/" style={{ color: '#0070f3', textDecoration: 'none', fontSize: '18px' }}>
          ← Back to Game
        </a>
      </div>
    </div>
  );
}
