import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';

export const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ open: 0, progress: 0, escalated: 0, closed: 0 });
  const [tickets, setTickets] = useState([]);
  const [drLogs, setDrLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock analytics chart data
  const chartData = [
    { name: 'Mon', Tickets: 4 },
    { name: 'Tue', Tickets: 7 },
    { name: 'Wed', Tickets: 5 },
    { name: 'Thu', Tickets: 12 },
    { name: 'Fri', Tickets: 8 },
    { name: 'Sat', Tickets: 2 },
    { name: 'Sun', Tickets: 3 },
  ];

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const data = await api.tickets.list();
        setTickets(data.slice(0, 5)); // Keep only recent 5

        // Calculate counts
        const counts = { open: 0, progress: 0, escalated: 0, closed: 0 };
        data.forEach(t => {
          if (t.status === 'open') counts.open++;
          else if (t.status === 'in_progress') counts.progress++;
          else if (t.status === 'escalated') counts.escalated++;
          else if (t.status === 'closed') counts.closed++;
        });
        setStats(counts);

        // Load DR logs for admin
        if (user.role === 'admin') {
          const logs = await api.dr.getBackupLogs();
          setDrLogs(logs.slice(0, 3));
        }
      } catch (e) {
        console.error("Error loading dashboard data", e);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, [user]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard components...</div>;
  }

  return (
    <div className="content-body">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.75rem', fontWeight: 700 }}>
          Welcome back, {user.full_name}!
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Overview of support queues and disaster recovery replication status.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stats-card">
          <div className="stats-icon-wrapper" style={{ backgroundColor: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-open)' }}>📁</div>
          <div className="stats-info">
            <span class="stats-label">Open Queue</span>
            <h3 class="stats-value">{stats.open}</h3>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-icon-wrapper" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-progress)' }}>⚙️</div>
          <div className="stats-info">
            <span class="stats-label">In Progress</span>
            <h3 class="stats-value">{stats.progress}</h3>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-icon-wrapper" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-escalated)' }}>⚠️</div>
          <div className="stats-info">
            <span class="stats-label">Escalated</span>
            <h3 class="stats-value">{stats.escalated}</h3>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-icon-wrapper" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-resolved)' }}>✅</div>
          <div className="stats-info">
            <span class="stats-label">Closed / Resolved</span>
            <h3 class="stats-value">{stats.closed}</h3>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Charts Panel */}
        <div className="table-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Weekly Ticket Volumes</h3>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-light)" fontSize={12} />
                <YAxis stroke="var(--text-light)" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="Tickets" stroke="var(--brand-primary)" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DR Panel for Admin */}
        {user.role === 'admin' && (
          <div className="table-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>GCP Standby Replication Health</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem', backgroundColor: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: 'var(--radius-md)'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-resolved)', textTransform: 'uppercase' }}>VPN Tunnel</span>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Active (IPSec S2S)</div>
                </div>
                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-resolved)' }} />
              </div>

              <div>
                <h4 style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Recent Backup Verifications</h4>
                {drLogs.length === 0 ? (
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-light)' }}>No backup check history found.</div>
                ) : (
                  drLogs.map(log => (
                    <div key={log.id} style={{
                      display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem',
                      padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)'
                    }}>
                      <span>{log.filename}</span>
                      <span className={`badge ${log.status === 'success' ? 'badge-resolved' : 'badge-critical'}`}>
                        {log.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Tickets List */}
      <div className="table-card">
        <div className="table-header">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Recent Tickets Queue</h3>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-light)' }}>No active support requests.</td>
                </tr>
              ) : (
                tickets.map(ticket => (
                  <tr key={ticket.id}>
                    <td>#{ticket.id}</td>
                    <td style={{ fontWeight: 600 }}>{ticket.title}</td>
                    <td>
                      <span className={`badge badge-${ticket.priority}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${ticket.status}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>{new Date(ticket.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
