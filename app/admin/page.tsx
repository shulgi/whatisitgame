'use client';

/**
 * Admin page for database initialization and curation
 * Visit: https://your-app.vercel.app/admin
 */

import { useState } from 'react';

export default function AdminPage() {
  const [initResult, setInitResult] = useState<any>(null);
  const [curateResult, setCurateResult] = useState<any>(null);
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

      {/* Curate Puzzles */}
      <section>
        <h2>2. Curate Puzzles</h2>
        <p>Fetch puzzles from Reddit. Each click processes 1-2 posts (~30 seconds each).</p>
        <p><strong>Note:</strong> Call multiple times to add more puzzles. Aim for at least 10 total.</p>

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
          <li><strong>Add Puzzles</strong> - Click "Add 1-2 Puzzles" multiple times until you have 10+ puzzles</li>
          <li><strong>Play!</strong> - Go back to homepage and play the game</li>
        </ol>
        <p style={{ marginTop: '15px', color: '#666', fontSize: '14px' }}>
          💡 Tip: Each curation call takes ~30 seconds. Be patient and wait for results before clicking again.
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
