import React, { useState, useMemo } from 'react';
import { CheckSquare, Square, Clock, MinusSquare, ChevronDown, ChevronRight, Filter, Users, MessageSquare, AlertTriangle, TrendingUp } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { ECOPROD_CRITERIA } from '../data/ecoprodCriteria';
import { EcoprodChecklistItem } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<EcoprodChecklistItem['status'], { label: string; color: string; bg: string; icon: React.FC<any> }> = {
  not_started: { label: 'Non démarré',  color: 'text-slate-400',  bg: 'bg-slate-700/50',      icon: Square },
  in_progress:  { label: 'En cours',    color: 'text-amber-400',  bg: 'bg-amber-500/10',      icon: Clock },
  done:         { label: 'Réalisé',     color: 'text-emerald-400',bg: 'bg-emerald-500/10',    icon: CheckSquare },
  na:           { label: 'N/A',         color: 'text-slate-500',  bg: 'bg-slate-800/50',      icon: MinusSquare },
};

const IMPACT_BADGE: Record<string, string> = {
  High:   'bg-red-500/20 text-red-300 border border-red-500/30',
  Medium: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  Low:    'bg-slate-600/50 text-slate-400 border border-slate-600',
};

const LEVEL_BADGE: Record<number, string> = {
  1: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  2: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  3: 'bg-slate-600/40 text-slate-400 border border-slate-600',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const EcoprodChecklist: React.FC = () => {
  const { project, updateProjectDetails, userProfiles, user } = useProject();

  // Local state for checklist items (persisted in project.ecoprodChecklistDetailed)
  const checklistData: Record<string, EcoprodChecklistItem> = project?.ecoprodChecklistDetailed || {};

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingCriterion, setEditingCriterion] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');

  // Unique categories extracted from criteria
  const categories = useMemo(() => {
    const cats = Array.from(new Set(ECOPROD_CRITERIA.map(c => c.category)));
    return cats.sort();
  }, []);

  // Filtered criteria
  const filteredCriteria = useMemo(() => {
    return ECOPROD_CRITERIA.filter(c => {
      if (filterCategory !== 'all' && c.category !== filterCategory) return false;
      if (filterLevel !== 'all' && String(c.level) !== filterLevel) return false;
      if (filterStatus !== 'all') {
        const status = checklistData[c.id]?.status || 'not_started';
        if (status !== filterStatus) return false;
      }
      return true;
    });
  }, [filterCategory, filterLevel, filterStatus, checklistData]);

  // Stats
  const stats = useMemo(() => {
    const total = ECOPROD_CRITERIA.length;
    const done = ECOPROD_CRITERIA.filter(c => checklistData[c.id]?.status === 'done').length;
    const inProgress = ECOPROD_CRITERIA.filter(c => checklistData[c.id]?.status === 'in_progress').length;
    const level1Missing = ECOPROD_CRITERIA.filter(c =>
      c.level === 1 && (!checklistData[c.id] || checklistData[c.id].status === 'not_started')
    ).length;
    const score = Math.round((done / total) * 100);
    return { total, done, inProgress, level1Missing, score };
  }, [checklistData]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const updateStatus = (criterionId: string, newStatus: EcoprodChecklistItem['status']) => {
    const existing: Partial<EcoprodChecklistItem> = checklistData[criterionId] || {};
    const updated: EcoprodChecklistItem = {
      criterionId,
      status: newStatus,
      assignedTo: existing.assignedTo,
      assignedToName: existing.assignedToName,
      comment: existing.comment,
      updatedAt: new Date().toISOString(),
      updatedBy: user?.name || '',
    };
    updateProjectDetails({
      ecoprodChecklistDetailed: {
        ...checklistData,
        [criterionId]: updated,
      }
    });
  };

  const saveComment = (criterionId: string) => {
    const existing: Partial<EcoprodChecklistItem> = checklistData[criterionId] || {};
    updateProjectDetails({
      ecoprodChecklistDetailed: {
        ...checklistData,
        [criterionId]: {
          ...existing,
          criterionId,
          status: existing.status || 'in_progress',
          comment: commentDraft,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.name || '',
        }
      }
    });
    setEditingCriterion(null);
    setCommentDraft('');
  };

  // Group filtered criteria by category
  const grouped = useMemo(() => {
    const groups: Record<string, typeof ECOPROD_CRITERIA> = {};
    filteredCriteria.forEach(c => {
      if (!groups[c.category]) groups[c.category] = [];
      groups[c.category].push(c);
    });
    return groups;
  }, [filteredCriteria]);

  const isProductionOrAdmin = user?.department === 'PRODUCTION' || user?.isAdmin;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl">🌿</span>
            Checklist Label Ecoprod
          </h2>
          <p className="text-sm text-slate-400 mt-1">Référentiel officiel Ecoprod — novembre 2025</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black text-emerald-400">{stats.score}%</div>
          <div className="text-xs text-slate-400">Score de couverture</div>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-cinema-800 rounded-xl p-4 border border-cinema-700">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-slate-400 mt-1">Critères totaux</div>
        </div>
        <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
          <div className="text-2xl font-bold text-emerald-400">{stats.done}</div>
          <div className="text-xs text-emerald-300/70 mt-1">Réalisés</div>
        </div>
        <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
          <div className="text-2xl font-bold text-amber-400">{stats.inProgress}</div>
          <div className="text-xs text-amber-300/70 mt-1">En cours</div>
        </div>
        <div className="bg-rose-500/10 rounded-xl p-4 border border-rose-500/20">
          <div className="text-2xl font-bold text-rose-400">{stats.level1Missing}</div>
          <div className="text-xs text-rose-300/70 mt-1">Obligatoires manquants</div>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Progression vers le label</span>
          <span>{stats.done}/{stats.total}</span>
        </div>
        <div className="w-full h-3 bg-cinema-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-500"
            style={{ width: `${stats.score}%` }}
          />
        </div>
      </div>

      {/* ── Alert: level 1 missing ── */}
      {stats.level1Missing > 0 && (
        <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-300">
              {stats.level1Missing} critère{stats.level1Missing > 1 ? 's' : ''} obligatoire{stats.level1Missing > 1 ? 's' : ''} (Niveau 1) non couverts
            </p>
            <p className="text-xs text-rose-300/70 mt-0.5">
              Ces critères sont requis pour accéder à la labellisation. Filtrez par Niveau 1 pour les identifier.
            </p>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 p-4 bg-cinema-800/50 rounded-xl border border-cinema-700">
        <Filter className="h-4 w-4 text-slate-400 self-center shrink-0" />

        {/* Category */}
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="bg-cinema-800 border border-cinema-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        >
          <option value="all">Toutes les catégories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Level */}
        <select
          value={filterLevel}
          onChange={e => setFilterLevel(e.target.value)}
          className="bg-cinema-800 border border-cinema-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        >
          <option value="all">Tous niveaux</option>
          <option value="1">⭐ Niveau 1 — Obligatoire</option>
          <option value="2">⭐⭐ Niveau 2</option>
          <option value="3">⭐⭐⭐ Niveau 3</option>
        </select>

        {/* Status */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-cinema-800 border border-cinema-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        >
          <option value="all">Tous statuts</option>
          <option value="not_started">Non démarré</option>
          <option value="in_progress">En cours</option>
          <option value="done">Réalisé</option>
          <option value="na">Non applicable</option>
        </select>

        <span className="text-xs text-slate-400 self-center ml-auto">
          {filteredCriteria.length} critère{filteredCriteria.length !== 1 ? 's' : ''} affiché{filteredCriteria.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Criteria by Category ── */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, criteria]) => {
          const isOpen = expandedCategories.has(category);
          const catDone = criteria.filter(c => checklistData[c.id]?.status === 'done').length;
          const catScore = Math.round((catDone / criteria.length) * 100);

          return (
            <div key={category} className="bg-cinema-800 rounded-xl border border-cinema-700 overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="h-5 w-5 text-emerald-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                  <div className="text-left">
                    <span className="font-semibold text-white text-sm">{category}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{catDone}/{criteria.length} réalisés</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 bg-cinema-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all"
                      style={{ width: `${catScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-emerald-400 w-9 text-right">{catScore}%</span>
                </div>
              </button>

              {/* Criteria List */}
              {isOpen && (
                <div className="border-t border-cinema-700 divide-y divide-cinema-700/60">
                  {criteria.map(criterion => {
                    const item = checklistData[criterion.id];
                    const status = item?.status || 'not_started';
                    const cfg = STATUS_CONFIG[status];
                    const StatusIcon = cfg.icon;
                    const isEditing = editingCriterion === criterion.id;

                    return (
                      <div key={criterion.id} className={`p-4 transition-colors ${cfg.bg}`}>
                        <div className="flex items-start gap-3">
                          {/* Criterion ID */}
                          <span className="text-xs font-mono font-bold text-slate-500 w-8 shrink-0 pt-0.5">
                            {criterion.id}
                          </span>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white leading-relaxed">{criterion.label}</p>

                            {/* Badges */}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {criterion.level && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${LEVEL_BADGE[criterion.level]}`}>
                                  Niveau {criterion.level}
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${IMPACT_BADGE[criterion.impact]}`}>
                                Impact {criterion.impact === 'High' ? 'Fort' : criterion.impact === 'Medium' ? 'Moyen' : 'Faible'}
                              </span>
                              {item?.assignedToName && (
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {item.assignedToName}
                                </span>
                              )}
                            </div>

                            {/* Comment */}
                            {item?.comment && !isEditing && (
                              <p className="text-xs text-slate-400 mt-2 italic bg-cinema-900/40 rounded px-2 py-1">
                                💬 {item.comment}
                              </p>
                            )}

                            {/* Comment editor */}
                            {isEditing && (
                              <div className="mt-3 space-y-2">
                                <textarea
                                  autoFocus
                                  value={commentDraft}
                                  onChange={e => setCommentDraft(e.target.value)}
                                  placeholder="Ajouter un commentaire ou preuve..."
                                  rows={2}
                                  className="w-full bg-cinema-900 border border-cinema-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveComment(criterion.id)}
                                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg font-medium transition-colors"
                                  >
                                    Enregistrer
                                  </button>
                                  <button
                                    onClick={() => { setEditingCriterion(null); setCommentDraft(''); }}
                                    className="text-xs text-slate-400 hover:text-white px-3 py-1 rounded-lg transition-colors"
                                  >
                                    Annuler
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          {isProductionOrAdmin && (
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Comment btn */}
                              <button
                                onClick={() => {
                                  setCommentDraft(item?.comment || '');
                                  setEditingCriterion(isEditing ? null : criterion.id);
                                }}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                title="Ajouter un commentaire"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </button>

                              {/* Status Cycle Button */}
                              <button
                                onClick={() => {
                                  const cycle: EcoprodChecklistItem['status'][] = ['not_started', 'in_progress', 'done', 'na'];
                                  const current = cycle.indexOf(status);
                                  const next = cycle[(current + 1) % cycle.length];
                                  updateStatus(criterion.id, next);
                                }}
                                title={cfg.label}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${cfg.color} ${cfg.bg} hover:scale-105`}
                              >
                                <StatusIcon className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">{cfg.label}</span>
                              </button>
                            </div>
                          )}

                          {/* Read-only status for non-prod */}
                          {!isProductionOrAdmin && (
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${cfg.color} ${cfg.bg}`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              <span className="hidden md:inline">{cfg.label}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredCriteria.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucun critère ne correspond aux filtres sélectionnés.</p>
        </div>
      )}
    </div>
  );
};
