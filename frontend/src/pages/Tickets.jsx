import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export const Tickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTicket, setNewTicket] = useState({ title: '', description: '', priority: 'medium', category_id: 1, department_id: 1 });
  
  // Detail views state
  const [newComment, setNewComment] = useState({ content: '', is_internal: false });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [engineers, setEngineers] = useState([]);

  // Filters state
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status_filter = statusFilter;
      if (priorityFilter) params.priority_filter = priorityFilter;
      const data = await api.tickets.list(params);
      setTickets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  // Load engineers for assignment (Help Desk and Admins only)
  useEffect(() => {
    if (['admin', 'helpdesk'].includes(user?.role)) {
      api.users.list().then(users => {
        setEngineers(users.filter(u => u.role === 'engineer'));
      }).catch(console.error);
    }
  }, [user]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      await api.tickets.create(newTicket);
      setShowCreateModal(false);
      setNewTicket({ title: '', description: '', priority: 'medium', category_id: 1, department_id: 1 });
      fetchTickets();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to submit ticket');
    }
  };

  const handleSelectTicket = async (id) => {
    try {
      const detailed = await api.tickets.get(id);
      setSelectedTicket(detailed);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.content) return;
    try {
      await api.tickets.addComment(selectedTicket.id, newComment);
      setNewComment({ content: '', is_internal: false });
      handleSelectTicket(selectedTicket.id); // Reload
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to post comment');
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploadError('');
    try {
      await api.tickets.uploadAttachment(selectedTicket.id, uploadFile);
      setUploadFile(null);
      handleSelectTicket(selectedTicket.id); // Reload
    } catch (error) {
      setUploadError(error.response?.data?.detail || 'Upload failed');
    }
  };

  const handleAssign = async (engineerId) => {
    try {
      await api.tickets.assign(selectedTicket.id, engineerId);
      handleSelectTicket(selectedTicket.id);
      fetchTickets();
    } catch (e) {
      alert('Assignment failed');
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await api.tickets.updateStatus(selectedTicket.id, status);
      handleSelectTicket(selectedTicket.id);
      fetchTickets();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="content-body" style={{ display: 'flex', gap: '2rem', height: '100%' }}>
      {/* Sidebar Ticket detail view */}
      {selectedTicket && (
        <div className="table-card" style={{
          width: '450px', display: 'flex', flexDirection: 'column', flexShrink: 0,
          borderLeft: '4px solid var(--brand-primary)', overflowY: 'auto', padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-light)', fontWeight: 600 }}>TICKET #{selectedTicket.id}</span>
            <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setSelectedTicket(null)}>Close panel</button>
          </div>
          
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{selectedTicket.title}</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', whiteSpace: 'pre-line' }}>{selectedTicket.description}</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.825rem' }}>
            <div>
              <strong>Priority:</strong> <span className={`badge badge-${selectedTicket.priority}`}>{selectedTicket.priority}</span>
            </div>
            <div>
              <strong>Status:</strong> <span className={`badge badge-${selectedTicket.status}`}>{selectedTicket.status.replace('_', ' ')}</span>
            </div>
            <div>
              <strong>Category:</strong> {selectedTicket.category?.name}
            </div>
            <div>
              <strong>SLA Due:</strong> {selectedTicket.sla_due_at ? new Date(selectedTicket.sla_due_at).toLocaleString() : 'N/A'}
            </div>
          </div>

          {/* Action Operations for support workers */}
          {['admin', 'helpdesk', 'engineer'].includes(user.role) && (
            <div style={{ borderTop: '1px solid var(--border-color)', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Operations Control</h4>
              
              {/* Assignment (Helpdesk/Admin only) */}
              {['admin', 'helpdesk'].includes(user.role) && (
                <div className="form-group">
                  <label className="form-label">Assign Technician</label>
                  <select 
                    className="form-control" 
                    value={selectedTicket.assigned_engineer_id || ''}
                    onChange={(e) => handleAssign(e.target.value)}
                  >
                    <option value="">-- Unassigned --</option>
                    {engineers.map(eng => (
                      <option key={eng.id} value={eng.id}>{eng.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Update (Helpdesk/Assignee) */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => handleStatusChange('in_progress')}>In Progress</button>
                <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.75rem', backgroundColor: 'var(--color-resolved)' }} onClick={() => handleStatusChange('resolved')}>Resolve</button>
                <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.75rem', backgroundColor: 'var(--color-closed)', color: 'white' }} onClick={() => handleStatusChange('closed')}>Close</button>
              </div>
            </div>
          )}

          {/* Attachments Section */}
          <div style={{ borderTop: '1px solid var(--border-color)', padding: '1rem 0' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Attachments</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {selectedTicket.attachments?.length === 0 ? (
                <span style={{ fontSize: '0.825rem', color: 'var(--text-light)' }}>No file uploads associated.</span>
              ) : (
                selectedTicket.attachments.map(att => (
                  <a key={att.id} href={att.file_path} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.825rem', color: 'var(--brand-primary)' }}>
                    📎 {att.file_name} ({Math.round(att.file_size / 1024)} KB)
                  </a>
                ))
              )}
            </div>

            <form onSubmit={handleFileUpload} style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="file" onChange={(e) => setUploadFile(e.target.files[0])} style={{ fontSize: '0.75rem', flex: 1 }} />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Upload</button>
            </form>
            {uploadError && <div style={{ fontSize: '0.75rem', color: 'var(--color-critical)', marginTop: '0.25rem' }}>{uploadError}</div>}
          </div>

          {/* Comments Feed */}
          <div style={{ borderTop: '1px solid var(--border-color)', padding: '1rem 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Discussion Timeline</h4>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              {selectedTicket.comments?.map(c => (
                <div key={c.id} style={{
                  padding: '0.75rem', borderRadius: 'var(--radius-md)',
                  backgroundColor: c.is_internal ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-primary)',
                  border: c.is_internal ? '1px dashed var(--color-escalated)' : '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    <strong>{c.user?.full_name} ({c.user?.role})</strong>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ fontSize: '0.825rem' }}>{c.content}</div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment}>
              <textarea 
                className="form-control" 
                placeholder="Type your comment update..." 
                rows={2}
                value={newComment.content}
                onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
                style={{ fontSize: '0.825rem', width: '100%', marginBottom: '0.5rem' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {['admin', 'helpdesk', 'engineer'].includes(user.role) && (
                  <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <input type="checkbox" checked={newComment.is_internal} onChange={(e) => setNewComment({ ...newComment, is_internal: e.target.checked })} />
                    Internal work note
                  </label>
                )}
                <button type="submit" className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', marginLeft: 'auto' }}>Send</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main tickets list view */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.75rem', fontWeight: 700 }}>Support Tickets Queue</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Manage, assign, and track ticket SLAs.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ Submit New Ticket</button>
        </div>

        {/* Filters bar */}
        <div className="table-card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', flexShrink: 0 }}>
          <div className="form-group" style={{ margin: 0, flexDirection: 'row', alignItems: 'center' }}>
            <label className="form-label" style={{ margin: 0 }}>Status:</label>
            <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, flexDirection: 'row', alignItems: 'center' }}>
            <label className="form-label" style={{ margin: 0 }}>Priority:</label>
            <select className="form-control" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Tickets Grid/Table */}
        <div className="table-card" style={{ flex: 1, overflowY: 'auto' }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center' }}>Loading tickets...</td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-light)' }}>No matching support tickets found.</td>
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
                      <td>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleSelectTicket(ticket.id)}>View Details</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Submit Ticket Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontWeight: 600 }}>Submit Support Request</h3>
              <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setShowCreateModal(false)}>Close</button>
            </div>
            <form onSubmit={handleCreateTicket}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Subject Title</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newTicket.title}
                    onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                    placeholder="Brief summary of the issue (e.g. Wi-Fi drops)" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Detailed Description</label>
                  <textarea 
                    className="form-control" 
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    placeholder="Provide troubleshooting details..." 
                    rows={4} 
                    required 
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Priority Impact</label>
                    <select className="form-control" value={newTicket.priority} onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}>
                      <option value="low">Low (General Query)</option>
                      <option value="medium">Medium (Single Device Issue)</option>
                      <option value="high">High (Department Blocked)</option>
                      <option value="critical">Critical (Company Outage)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Problem Category</label>
                    <select className="form-control" value={newTicket.category_id} onChange={(e) => setNewTicket({ ...newTicket, category_id: parseInt(e.target.value) })}>
                      <option value={1}>Hardware Outage</option>
                      <option value={2}>Software Bug</option>
                      <option value={3}>Network & VPN</option>
                      <option value={4}>Identity & Access</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Tickets;
