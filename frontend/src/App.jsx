import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import KnowledgeBase from './pages/KnowledgeBase';

const AppContent = () => {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-primary)',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--border-color)',
            borderTopColor: 'var(--brand-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Verifying secure session tunnel...
          </span>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Enforce authentication
  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          🛡️ Verdad Tickets
        </div>
        
        <nav className="sidebar-menu">
          <div 
            className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </div>
          
          <div 
            className={`sidebar-item ${activeTab === 'tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('tickets')}
          >
            🎫 Support Tickets
          </div>

          <div 
            className={`sidebar-item ${activeTab === 'kb' ? 'active' : ''}`}
            onClick={() => setActiveTab('kb')}
          >
            📚 Knowledge Base
          </div>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0 1rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Logged in as</span>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.full_name}
            </span>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ 
              width: '100%', 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444',
              padding: '0.5rem'
            }}
            onClick={logout}
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main View Container */}
      <main className="main-view">
        {/* Top Header */}
        <header className="header">
          <div className="header-search">
            🔍 <input type="text" placeholder="Search ticket queues..." disabled />
          </div>

          <div className="header-user">
            <span className={`badge badge-${user.role === 'admin' ? 'critical' : user.role === 'helpdesk' ? 'open' : user.role === 'engineer' ? 'progress' : 'closed'}`} style={{ fontSize: '0.7rem' }}>
              {user.role.toUpperCase()}
            </span>
            <div className="user-profile">
              <div className="user-avatar">
                {user.full_name.split(' ').map(n => n[0]).join('')}
              </div>
            </div>
          </div>
        </header>

        {/* Content routing switcher */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 'dashboard' ? <Dashboard /> : activeTab === 'tickets' ? <Tickets /> : <KnowledgeBase />}
        </div>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
