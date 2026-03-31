import React, { useState, useMemo } from 'react';
import { Upload, FolderOpen, CheckCircle, XCircle, Clock, Download, AlertTriangle, Filter, FileText, Image, Paperclip } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { ECOPROD_CRITERIA } from '../data/ecoprodCriteria';

// ─── Suggested justificatifs per criterion ────────────────────────────────────

const JUSTIF_HINTS: Record<string, string[]> = {
  A1: ['PDF ou doc de la note d\'intention RSE', 'Email de diffusion aux équipes'],
  A2: ['Organigramme mentionnant le référent RSE', 'Email de nomination'],
  A3: ['Extrait du contrat avec clause RSE (Art. 14 ou équivalent)'],
  A4: ['Rapport bilan carbone (Carbon\'Clap, Ecofilm...)'],
  D1: ['Capture mail éclairage à détection de mouvement', 'Extrait guide bonnes pratiques énergie'],
  D3: ['Photo vaisselle/tasses réutilisables', 'Extrait guide déchets'],
  D4: ['Photo consignes de tri', 'Email rappel tri envoyé aux équipes'],
  E1: ['Plan de mobilité du tournage'],
  E2: ['Photos du site avant/après', 'Rapport d\'impact milieu naturel'],
  H1: ['Plan de mobilité signé'],
  H2: ['Registre de covoiturage ou navette'],
  H3: ['Liste des véhicules électriques/hybrides utilisés'],
  I1: ['Plan de gestion des déchets', 'Fiche de suivi volumes'],
  I2: ['Photo signalisation consignes de tri', 'Email sensibilisation'],
  I3: ['Tableau de suivi des volumes de déchets'],
};

const STATUS_CONFIG = {
  missing:   { label: 'Manquant',  color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',     icon: XCircle },
  provided:  { label: 'Fourni',    color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock },
  validated: { label: 'Validé',    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle },
};

type JustifStatus = 'missing' | 'provided' | 'validated';

interface LocalJustif {
  criterionId: string;
  fileName: string;
  status: JustifStatus;
  notes: string;
  uploadedAt: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const JustificatifsEcoprod: React.FC = () => {
  const { project, updateProjectDetails, user } = useProject();

  // Using project.ecoprodProofs as a simple Record<criterionId, status>
  // We extend it with a local map for notes/filenames
  const proofs: Record<string, string> = project?.ecoprodProofs || {};

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editingNotes, setEditingNotes] = useState<string | null>(null);

  const isProductionOrAdmin = user?.department === 'PRODUCTION' || user?.isAdmin;

  // Unique categories
  const categories = useMemo(() => Array.from(new Set(ECOPROD_CRITERIA.map(c => c.category))).sort(), []);

  // Filtered criteria
  const filteredCriteria = useMemo(() => {
    return ECOPROD_CRITERIA.filter(c => {
      if (filterCategory !== 'all' && c.category !== filterCategory) return false;
      if (filterStatus !== 'all' && (proofs[c.id] || 'missing') !== filterStatus) return false;
      return true;
    });
  }, [filterCategory, filterStatus, proofs]);

  // Stats
  const stats = useMemo(() => {
    const total = ECOPROD_CRITERIA.length;
    const validated = ECOPROD_CRITERIA.filter(c => proofs[c.id] === 'validated').length;
    const provided = ECOPROD_CRITERIA.filter(c => proofs[c.id] === 'provided').length;
    const missing = total - validated - provided;
    return { total, validated, provided, missing };
  }, [proofs]);

  const updateStatus = (criterionId: string, newStatus: JustifStatus) => {
    updateProjectDetails({
      ecoprodProofs: { ...proofs, [criterionId]: newStatus }
    });
  };

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, typeof ECOPROD_CRITERIA> = {};
    filteredCriteria.forEach(c => {
      if (!groups[c.category]) groups[c.category] = [];
      groups[c.category].push(c);
    });
    return groups;
  }, [filteredCriteria]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <FolderOpen className="h-7 w-7 text-blue-400" />
            Justificatifs Label Ecoprod
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Gérez les pièces justificatives requises pour la candidature au Label Ecoprod
          </p>
        </div>
        <button
          onClick={() => {
            // Summarize the provided/validated criteria in a simple export
            const lines = ECOPROD_CRITERIA.map(c => {
              const status = proofs[c.id] || 'Manquant';
              return `${c.id} | ${c.category} | ${c.label} | ${status}`;
            });
            const blob = new Blob([['ID,Catégorie,Critère,Statut', ...lines].join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `justificatifs_ecoprod_${project?.filmTitle || 'production'}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-xl hover:bg-blue-600/30 transition-colors text-sm font-medium"
        >
          <Download className="h-4 w-4" />
          Exporter le récapitulatif
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{stats.missing}</div>
          <div className="text-xs text-red-300/70 mt-1">Manquants</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{stats.provided}</div>
          <div className="text-xs text-amber-300/70 mt-1">Fournis</div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{stats.validated}</div>
          <div className="text-xs text-emerald-300/70 mt-1">Validés</div>
        </div>
      </div>

      {/* ── Coverage bar ── */}
      <div>
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Couverture des justificatifs</span>
          <span>{stats.validated + stats.provided}/{stats.total}</span>
        </div>
        <div className="w-full h-2.5 bg-cinema-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-emerald-400 transition-all" style={{ width: `${(stats.validated / stats.total) * 100}%` }} />
          <div className="h-full bg-amber-400 transition-all" style={{ width: `${(stats.provided / stats.total) * 100}%` }} />
        </div>
        <div className="flex gap-4 mt-1.5 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Validés</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Fournis</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Manquants</span>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 p-4 bg-cinema-800/50 rounded-xl border border-cinema-700">
        <Filter className="h-4 w-4 text-slate-400 self-center shrink-0" />

        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="bg-cinema-800 border border-cinema-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="all">Toutes les catégories</option>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-cinema-800 border border-cinema-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="all">Tous statuts</option>
          <option value="missing">⚠️ Manquants</option>
          <option value="provided">📎 Fournis</option>
          <option value="validated">✅ Validés</option>
        </select>

        <span className="text-xs text-slate-400 self-center ml-auto">
          {filteredCriteria.length} critère{filteredCriteria.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Criteria by category ── */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([category, criteria]) => (
          <div key={category}>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded-full inline-block" />
              {category}
            </h3>
            <div className="space-y-2">
              {criteria.map(criterion => {
                const rawStatus = (proofs[criterion.id] as JustifStatus) || 'missing';
                const cfg = STATUS_CONFIG[rawStatus];
                const StatusIcon = cfg.icon;
                const hints = JUSTIF_HINTS[criterion.id] || [];
                const isEditingNote = editingNotes === criterion.id;

                return (
                  <div key={criterion.id} className={`rounded-xl border p-4 transition-all ${cfg.bg}`}>
                    <div className="flex items-start gap-3">
                      {/* ID */}
                      <span className="text-xs font-mono font-bold text-slate-500 w-8 shrink-0 pt-0.5">{criterion.id}</span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{criterion.label}</p>

                        {/* Hints */}
                        {hints.length > 0 && (
                          <div className="mt-2 space-y-0.5">
                            {hints.map((hint, i) => (
                              <p key={i} className="text-[11px] text-slate-400 flex items-center gap-1">
                                <Paperclip className="h-3 w-3 shrink-0" />
                                {hint}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* Note editor */}
                        {isEditingNote && (
                          <div className="mt-3 space-y-2">
                            <textarea
                              autoFocus
                              value={notes[criterion.id] || ''}
                              onChange={e => setNotes(prev => ({ ...prev, [criterion.id]: e.target.value }))}
                              placeholder="Référence, lien, numéro de document..."
                              rows={2}
                              className="w-full bg-cinema-900 border border-cinema-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                            />
                            <button
                              onClick={() => setEditingNotes(null)}
                              className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg font-medium transition-colors"
                            >
                              Fermer
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {isProductionOrAdmin && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setEditingNotes(isEditingNote ? null : criterion.id)}
                            title="Ajouter une référence"
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                          </button>

                          {/* Status cycle */}
                          <button
                            onClick={() => {
                              const cycle: JustifStatus[] = ['missing', 'provided', 'validated'];
                              const idx = cycle.indexOf(rawStatus);
                              const next = cycle[(idx + 1) % cycle.length];
                              updateStatus(criterion.id, next);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border hover:scale-105 ${cfg.color} ${cfg.bg}`}
                            title={`Marquer comme ${cfg.label}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">{cfg.label}</span>
                          </button>
                        </div>
                      )}

                      {!isProductionOrAdmin && (
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border ${cfg.color} ${cfg.bg}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          <span>{cfg.label}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {filteredCriteria.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucun critère ne correspond aux filtres.</p>
        </div>
      )}
    </div>
  );
};
