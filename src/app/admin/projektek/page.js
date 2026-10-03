'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { formatHUF, formatDate } from '@/lib/constants';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import { 
  FolderKanban, 
  Plus, 
  Users, 
  Trash2, 
  UserCheck, 
  ArrowUpRight, 
  ArrowLeft,
  AlertCircle,
  Coins,
  CheckCircle2
} from 'lucide-react';

export default function AdminProjectsPage() {
  const { 
    currentUser, 
    isAdmin, 
    projects, 
    users, 
    invoices, 
    createProject, 
    updateProjectMembers, 
    deleteProject 
  } = useApp();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [assignedMemberIds, setAssignedMemberIds] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>Hozzáférés megtagadva</h2>
        <Link href="/projektek" className="btn btn-secondary mt-4">Vissza a projektekhez</Link>
      </div>
    );
  }

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await createProject({
        name: newProjectName,
        description: newProjectDesc,
        memberIds: selectedMemberIds
      });
      setSuccessMsg(`"${newProjectName}" projekt létrehozva!`);
      setNewProjectName('');
      setNewProjectDesc('');
      setSelectedMemberIds([]);
      setIsCreateModalOpen(false);
    } catch (err) {
      setError(err.message || 'Hiba a projekt létrehozásakor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAssignModal = (project) => {
    setEditingProject(project);
    setAssignedMemberIds(project.members || []);
    setError('');
    setIsAssignModalOpen(true);
  };

  const handleSaveMembers = async (e) => {
    e.preventDefault();
    if (!editingProject) return;
    setError('');
    setIsSubmitting(true);
    try {
      await updateProjectMembers(editingProject.id, assignedMemberIds);
      setSuccessMsg(`"${editingProject.name}" tagjai frissítve!`);
      setIsAssignModalOpen(false);
    } catch (err) {
      setError(err.message || 'Hiba a tagok mentésekor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = (project) => {
    setConfirmModal({
      title: `"${project.name}" törlése`,
      message: `Biztosan törölni szeretné a "${project.name}" projektet? Ez a művelet nem vonható vissza.`,
      onConfirm: async () => {
        try {
          await deleteProject(project.id);
          setSuccessMsg(`"${project.name}" projekt törölve.`);
        } catch (err) {
          setAlertModal({ message: err.message || 'Hiba a törlés során' });
        }
      }
    });
  };

  const toggleMemberSelection = (userId, isAssigning = false) => {
    if (isAssigning) {
      setAssignedMemberIds(prev => 
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    } else {
      setSelectedMemberIds(prev => 
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    }
  };

  return (
    <div className="container">
      {/* Top back link */}
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link 
          href="/admin" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}
        >
          <ArrowLeft size={15} /> Vissza az áttekintéshez
        </Link>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Projektek kezelése</h1>
            <p className="page-subtitle">
              Építkezési projektek létrehozása és tagok hozzárendelése
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setError('');
              setIsCreateModalOpen(true);
            }}
          >
            <Plus size={15} /> Új Projekt Létrehozása
          </button>
        </div>
      </div>

      {successMsg && (
        <div 
          style={{ 
            background: 'var(--success-bg)', 
            border: '1px solid var(--success-border)', 
            color: 'var(--success-text)', 
            padding: '0.65rem 0.85rem', 
            borderRadius: 'var(--radius-md)', 
            fontSize: '0.825rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            marginBottom: '1rem'
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Projects List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {projects.map(project => {
          const projectInvoices = invoices.filter(inv => inv.project_id === project.id);
          const totalCost = projectInvoices.reduce((sum, inv) => sum + Number(inv.value_huf || 0), 0);
          const memberUsers = users.filter(u => (project.members || []).includes(u.id));

          return (
            <div 
              key={project.id}
              className="card"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{project.name}</h3>
                  <Link 
                    href={`/admin/projektek/${project.id}`} 
                    className="btn btn-secondary btn-sm"
                    title="Számlák kezelése"
                  >
                    Számlák ({projectInvoices.length}) <ArrowUpRight size={13} />
                  </Link>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                  {project.description || 'Nincs leírás megadva.'}
                </p>

                {/* Financial Summary */}
                <div 
                  style={{ 
                    background: 'var(--bg-subtle)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '0.65rem 0.85rem',
                    border: '1px solid var(--border-subtle)',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Összes kiadás
                    </div>
                    <div className="text-mono" style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {formatHUF(totalCost)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Egyenlő rész / fő
                    </div>
                    <div className="text-mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>
                      {formatHUF(memberUsers.length > 0 ? Math.round(totalCost / memberUsers.length) : totalCost)}
                    </div>
                  </div>
                </div>

                {/* Assigned Members */}
                <div>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Users size={13} />
                    <span>Tagok ({memberUsers.length}):</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {memberUsers.length > 0 ? (
                      memberUsers.map(m => (
                        <span 
                          key={m.id} 
                          style={{ 
                            fontSize: '0.725rem', 
                            padding: '0.15rem 0.45rem', 
                            background: 'var(--bg-subtle)', 
                            borderRadius: 'var(--radius-pill)',
                            border: '1px solid var(--border-subtle)',
                            fontWeight: 600
                          }}
                        >
                          {m.display_name}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--warning-text)' }}>
                        Nincs még hozzárendelt tag
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => handleOpenAssignModal(project)}
                  className="btn btn-secondary btn-sm"
                >
                  <UserCheck size={14} /> Tagok kezelése
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteProject(project)}
                  className="btn btn-danger btn-sm"
                  title="Projekt törlése"
                >
                  <Trash2 size={13} /> Törlés
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Új építkezési projekt"
      >
        {error && (
          <div 
            style={{ 
              background: 'var(--danger-bg)', 
              border: '1px solid var(--danger-border)', 
              color: 'var(--danger-text)', 
              padding: '0.65rem', 
              borderRadius: 'var(--radius-md)', 
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              marginBottom: '0.85rem'
            }}
          >
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateProject}>
          <div className="form-group">
            <label className="form-label" htmlFor="project-name">Projekt neve *</label>
            <input
              id="project-name"
              type="text"
              required
              className="form-control"
              placeholder="pl. Balatoni Nyaraló Felújítás"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="project-desc">Rövid leírás</label>
            <textarea
              id="project-desc"
              rows={2}
              className="form-control"
              placeholder="Rövid tájékoztató az építkezési munkáról"
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Résztvevők kiválasztása</label>
            <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.4rem' }}>
              {users.map(u => (
                <label 
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.35rem 0.45rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontSize: '0.825rem'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(u.id)}
                    onChange={() => toggleMemberSelection(u.id, false)}
                  />
                  <span style={{ fontWeight: 600 }}>{u.display_name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({u.email})</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Létrehozás...' : 'Létrehozás'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Members Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Résztvevők: ${editingProject?.name || ''}`}
      >
        <form onSubmit={handleSaveMembers}>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Jelölje be a projektben részt vevő tagokat:
          </p>

          <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.4rem', marginBottom: '1.25rem' }}>
            {users.map(u => (
              <label 
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  borderBottom: '1px solid var(--border-subtle)'
                }}
              >
                <input
                  type="checkbox"
                  checked={assignedMemberIds.includes(u.id)}
                  onChange={() => toggleMemberSelection(u.id, true)}
                />
                <span style={{ fontWeight: 600 }}>{u.display_name}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({u.email})</span>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsAssignModalOpen(false)}
            >
              Mégse
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Mentés...' : 'Tagok mentése'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        onConfirm={() => confirmModal?.onConfirm()}
        title={confirmModal?.title || 'Megerősítés'}
        message={confirmModal?.message}
      />
      <AlertModal
        isOpen={!!alertModal}
        onClose={() => setAlertModal(null)}
        message={alertModal?.message}
      />
    </div>
  );
}
