import React from 'react';

const FAQ_ARTICLES = [
  {
    id: 1,
    title: "How to Connect to the Secure Office VPN",
    category: "Network & VPN",
    content: "To connect to the corporate network from home:\n1. Open your Cisco VPN Client.\n2. Connect to server address: vpn.verdadsolutions.com.\n3. Input your active work email and password.\n4. Complete the multi-factor authentication (MFA) prompt on your mobile authenticator app."
  },
  {
    id: 2,
    title: "Resetting Locked Database Credentials",
    category: "Identity & Access",
    content: "If you exceed three incorrect database password attempts, your database role is locked automatically for security.\nTo unlock it:\n1. Navigate to the Support Tickets page in this portal.\n2. Submit a request choosing the 'Identity & Access' category and set the priority to 'High'.\n3. An engineer will reset your credentials and send temporary login details via secure email."
  },
  {
    id: 3,
    title: "Adding a New Printer to Your Laptop",
    category: "Hardware Outage",
    content: "To install office network printer drivers:\n1. Make sure you are connected to the local office Wi-Fi network.\n2. On Windows, go to Settings > Devices > Printers & Scanners and click 'Add a printer'.\n3. Select the printer matching your floor location (e.g., Lagos-FL2-Color).\n4. If prompted, standard print drivers will download automatically over the network."
  }
];

export const KnowledgeBase = () => {
  return (
    <div className="content-body" style={{ overflowY: 'auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.75rem', fontWeight: 700 }}>Self-Service Knowledge Base</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Solve common technical issues using our quick guides and articles.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {FAQ_ARTICLES.map(article => (
          <div key={article.id} className="table-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span className="badge badge-open" style={{ fontSize: '0.7rem' }}>{article.category}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>Article ID: #KB00{article.id}</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{article.title}</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{article.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
export default KnowledgeBase;
