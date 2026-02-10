import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Department, OfflineMember } from '../types';
import { Search, FileText, Download, Mail, Phone, Upload } from 'lucide-react';
import { extractTextFromPdf } from '../utils/pdfHelpers';

export const TeamDirectory: React.FC = () => {
    const { userProfiles, currentDept, project, addMember, removeMember, offlineMembers, addOfflineMember, deleteOfflineMember } = useProject();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState<string>('ALL');
    const [selectedProfile, setSelectedProfile] = useState<any>(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [showInvite, setShowInvite] = useState(false); // UI State for Invite Box
    const [showImportModal, setShowImportModal] = useState(false); // UI State for Import Modal



    // Filter profiles belonging to THIS project
    const projectMembers = userProfiles.filter(profile => {
        const p = profile as any;
        const isCurrent = p.currentProjectId === project.id;
        const isInHistory = p.projectHistory?.some((h: any) => h.id === project.id);
        return isCurrent || isInHistory;
    });

    // Merge Real Users and Offline Members
    const allMembers = [
        ...projectMembers.map(p => ({ ...p, isOffline: false })),
        ...offlineMembers.map(p => ({ ...p, isOffline: true, email: p.email || '', phone: p.phone || '', role: p.role || 'N/A' }))
    ];

    const filteredProfiles = allMembers.filter(profile => {
        const matchesSearch = (
            (profile.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (profile.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (profile.role || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
        const matchesDept = selectedDept === 'ALL' || profile.department === selectedDept;
        return matchesSearch && matchesDept;
    });

    // Group by Department
    const groupedProfiles = filteredProfiles.reduce((acc, profile) => {
        const dept = profile.department;
        if (!acc[dept]) acc[dept] = [];
        acc[dept].push(profile);
        return acc;
    }, {} as Record<string, any[]>);

    const handleExportContacts = () => {
        if (allMembers.length === 0) return;

        let vCardContent = '';

        allMembers.forEach(member => {
            const firstName = member.firstName || '';
            const lastName = member.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim();
            const phone = member.phone || '';
            const email = member.email || '';
            const role = member.role || '';
            const dept = member.department || '';
            const org = project.name || 'Per-Set';

            if (!fullName && !email && !phone) return;

            vCardContent += 'BEGIN:VCARD\n';
            vCardContent += 'VERSION:3.0\n';
            vCardContent += `FN:${fullName}\n`;
            vCardContent += `N:${lastName};${firstName};;;\n`;
            if (phone) vCardContent += `TEL;TYPE=CELL:${phone}\n`;
            if (email) vCardContent += `EMAIL;TYPE=WORK:${email}\n`;
            if (role) vCardContent += `TITLE:${role}\n`;
            if (dept) vCardContent += `NOTE:Département: ${dept}\n`;
            vCardContent += `ORG:${org}\n`;
            vCardContent += 'END:VCARD\n';
        });

        const blob = new Blob([vCardContent], { type: 'text/vcard' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Equipe_${project.name.replace(/\s+/g, '_')}.vcf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-bold text-white">Annuaire de l'Équipe</h2>
                        <button
                            onClick={handleExportContacts}
                            className="flex items-center gap-2 bg-cinema-800 text-slate-300 hover:bg-cinema-700 border border-cinema-600 px-3 py-1.5 rounded-lg transition-colors text-sm"
                            title="Télécharger les contacts (.vcf)"
                        >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Exporter</span>
                        </button>
                    </div>
                    <p className="text-slate-400 mt-1">
                        {filteredProfiles.length} fiches de renseignements enregistrées
                    </p>
                    {currentDept === 'PRODUCTION' && (
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="text-xs bg-cinema-700 hover:bg-cinema-600 text-white px-3 py-1 rounded transition-colors border border-cinema-600"
                            >
                                + Import / Créer (Hors Ligne)
                            </button>
                            {!showInvite ? (
                                <button
                                    onClick={() => setShowInvite(true)}
                                    className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition-colors"
                                >
                                    + Inviter un membre
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                                    <input
                                        type="email"
                                        placeholder="email@exemple.com"
                                        className="bg-cinema-900 border border-cinema-700 rounded px-2 py-1 text-sm text-white w-48"
                                        value={inviteEmail}
                                        onChange={e => setInviteEmail(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                addMember(inviteEmail);
                                                setInviteEmail('');
                                                setShowInvite(false);
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            addMember(inviteEmail);
                                            setInviteEmail('');
                                            setShowInvite(false);
                                        }}
                                        className="text-xs bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded"
                                    >
                                        Inviter
                                    </button>
                                    <button
                                        onClick={() => setShowInvite(false)}
                                        className="text-white hover:text-red-400"
                                    >
                                        &times;
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-cinema-800 border border-cinema-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                    <select
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        className="bg-cinema-800 border border-cinema-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        <option value="ALL">Tous les départements</option>
                        {Object.values(Department).map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
            </header>

            <div className="space-y-8">
                {Object.entries(groupedProfiles).map(([dept, profiles]) => (
                    <div key={dept} className="space-y-4">
                        <h3 className="text-xl font-bold text-slate-300 border-b border-cinema-700 pb-2 flex items-center gap-2">
                            <span className="bg-cinema-700 px-2 py-1 rounded text-sm">{dept}</span>
                            <span className="text-sm font-normal text-slate-500">({profiles.length})</span>
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {profiles.map(profile => (
                                <div
                                    key={profile.email}
                                    onClick={() => currentDept === 'PRODUCTION' && setSelectedProfile(profile)}
                                    className={`bg-cinema-800 rounded-xl border border-cinema-700 p-4 transition-all group ${currentDept === 'PRODUCTION'
                                        ? 'hover:border-blue-500/50 hover:bg-cinema-800/80 cursor-pointer active:scale-[0.99]'
                                        : ''
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-white text-lg flex items-center gap-2">
                                                {profile.firstName} {profile.lastName}
                                                {/* Kick Button */}
                                                {currentDept === 'PRODUCTION' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm(`Voulez-vous vraiment retirer ${profile.firstName} du projet ?`)) {
                                                                if (profile.isOffline) {
                                                                    deleteOfflineMember(profile.id);
                                                                } else {
                                                                    removeMember(profile.id);
                                                                }
                                                            }
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-500 transition-all ml-2"
                                                        title="Retirer du projet"
                                                    >
                                                        &times;
                                                    </button>
                                                )}
                                            </h4>
                                            <p className="text-blue-400 text-sm">{profile.role}</p>
                                        </div>
                                        {/* Status Badges */}
                                        <div className="flex gap-1">
                                            {currentDept === 'PRODUCTION' && (
                                                <>
                                                    {profile.rib && <div title="RIB" className="h-2 w-2 rounded-full bg-green-500" />}
                                                    {profile.idCard && <div title="CNI" className="h-2 w-2 rounded-full bg-blue-500" />}
                                                    {profile.cmbCard && <div title="CMB" className="h-2 w-2 rounded-full bg-purple-500" />}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm text-slate-400 mb-4">
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4" />
                                            <a href={`mailto:${profile.email}`} className="hover:text-white transition-colors">{profile.email}</a>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4" />
                                            <a href={`tel:${profile.phone}`} className="hover:text-white transition-colors">{profile.phone}</a>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-2 border-t border-cinema-700/50">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const firstName = profile.firstName || '';
                                                const lastName = profile.lastName || '';
                                                const fullName = `${firstName} ${lastName}`.trim();
                                                const phone = profile.phone || '';
                                                const email = profile.email || '';
                                                const role = profile.role || '';
                                                const dept = profile.department || '';
                                                const org = project.name || 'Per-Set';

                                                let vCardContent = 'BEGIN:VCARD\nVERSION:3.0\n';
                                                vCardContent += `FN:${fullName}\n`;
                                                vCardContent += `N:${lastName};${firstName};;;\n`;
                                                if (phone) vCardContent += `TEL;TYPE=CELL:${phone}\n`;
                                                if (email) vCardContent += `EMAIL;TYPE=WORK:${email}\n`;
                                                if (role) vCardContent += `TITLE:${role}\n`;
                                                if (dept) vCardContent += `NOTE:Département: ${dept}\n`;
                                                vCardContent += `ORG:${org}\n`;
                                                vCardContent += 'END:VCARD\n';

                                                const blob = new Blob([vCardContent], { type: 'text/vcard' });
                                                const url = window.URL.createObjectURL(blob);
                                                const link = document.createElement('a');
                                                link.href = url;
                                                link.setAttribute('download', `${firstName}_${lastName}.vcf`);
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                            }}
                                            className="text-xs flex items-center gap-1.5 text-slate-500 hover:text-white transition-colors p-1.5 hover:bg-cinema-700/50 rounded"
                                            title="Exporter le contact"
                                        >
                                            <Download className="h-3 w-3" />
                                            Exporter
                                        </button>
                                    </div>

                                    {currentDept === 'PRODUCTION' && (
                                        <div className="pt-4 border-t border-cinema-700 grid grid-cols-2 gap-2">
                                            <DocumentButton label="RIB" hasDoc={!!profile.rib} url={profile.rib} />
                                            <DocumentButton label="CNI" hasDoc={!!profile.idCard} url={profile.idCard} />
                                            <DocumentButton label="CMB" hasDoc={!!profile.cmbCard} url={profile.cmbCard} />
                                            <DocumentButton label="Permis" hasDoc={!!profile.drivingLicense} url={profile.drivingLicense} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {filteredProfiles.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        Aucun membre trouvé correspondant à votre recherche.
                    </div>
                )}
            </div>
            {/* Invite Modal */}
            {selectedProfile && (
                <ProfileDetailModal profile={selectedProfile} onClose={() => setSelectedProfile(null)} />
            )}
            {showImportModal && (
                <ImportMemberModal onClose={() => setShowImportModal(false)} />
            )}
        </div>
    );
};

// ... existing DocumentButton ...


// ... existing DocumentButton ...
const DocumentButton = ({ label, hasDoc, url }: { label: string, hasDoc: boolean, url?: string }) => {
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening modal when clicking document
        if (url) {
            window.open(url, '_blank');
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={!hasDoc}
            className={`flex items-center justify-center gap-2 py-1.5 rounded text-xs font-medium transition-colors ${hasDoc
                ? 'bg-cinema-700 text-white hover:bg-blue-600 cursor-pointer'
                : 'bg-cinema-900/50 text-slate-600 cursor-not-allowed'
                }`}
            title={hasDoc ? "Voir le document" : "Non disponible"}
        >
            <FileText className="h-3 w-3" />
            {label}
        </button>
    );
};

const ProfileDetailModal = ({ profile, onClose }: { profile: any, onClose: () => void }) => {
    const { updateOfflineMember, currentDept } = useProject();
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        firstName: profile.firstName,
        lastName: profile.lastName,
        role: profile.role,
        department: profile.department,
        email: profile.email || '',
        phone: profile.phone || ''
    });

    const handleSave = async () => {
        if (!profile.isOffline) return;
        await updateOfflineMember(profile.id, editData);
        setIsEditing(false);
        onClose();
    };

    if (!profile) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-cinema-800 border border-cinema-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <header className="p-6 border-b border-cinema-700 flex justify-between items-start sticky top-0 bg-cinema-800 z-10">
                    <div>
                        {isEditing ? (
                            <div className="space-y-4 mb-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        className="bg-cinema-900 border-cinema-700 rounded p-2 text-white text-3xl font-bold w-full"
                                        value={editData.firstName}
                                        onChange={e => setEditData({ ...editData, firstName: e.target.value })}
                                        placeholder="Prénom"
                                    />
                                    <input
                                        className="bg-cinema-900 border-cinema-700 rounded p-2 text-white text-3xl font-bold w-full"
                                        value={editData.lastName}
                                        onChange={e => setEditData({ ...editData, lastName: e.target.value })}
                                        placeholder="Nom"
                                    />
                                </div>
                                <input
                                    className="bg-cinema-900 border-cinema-700 rounded p-2 text-blue-400 text-lg w-full"
                                    value={editData.role}
                                    onChange={e => setEditData({ ...editData, role: e.target.value })}
                                    placeholder="Rôle"
                                />
                                <select
                                    className="bg-cinema-900 border-cinema-700 rounded p-2 text-slate-400 w-full"
                                    value={editData.department}
                                    onChange={e => setEditData({ ...editData, department: e.target.value })}
                                >
                                    {Object.values(Department).map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-2xl font-bold text-white">{profile.firstName} {profile.lastName}</h2>
                                <p className="text-blue-400">{profile.role} • {profile.department}</p>
                            </>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {profile.isOffline && (
                            <button
                                onClick={() => {
                                    if (isEditing) handleSave();
                                    else setIsEditing(true);
                                }}
                                className={`px-4 py-2 rounded font-bold transition-colors ${isEditing
                                    ? 'bg-green-600 hover:bg-green-500 text-white'
                                    : 'bg-cinema-700 hover:bg-cinema-600 text-slate-200'
                                    }`}
                            >
                                {isEditing ? 'Enregistrer' : 'Modifier'}
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-cinema-700 rounded-full transition-colors">
                            <span className="text-2xl text-slate-400">&times;</span>
                        </button>
                    </div>
                </header>

                <div className="p-8 space-y-8">
                    {/* Personal Info - LIMITED for non-production */}
                    <section>
                        <h3 className="text-lg font-bold text-eco-400 mb-4 border-b border-cinema-700/50 pb-2">Informations Personnelles</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                            {isEditing ? (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                                        <input
                                            className="bg-cinema-900 border-cinema-700 rounded p-2 text-white w-full"
                                            value={editData.email}
                                            onChange={e => setEditData({ ...editData, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Téléphone</label>
                                        <input
                                            className="bg-cinema-900 border-cinema-700 rounded p-2 text-white w-full"
                                            value={editData.phone}
                                            onChange={e => setEditData({ ...editData, phone: e.target.value })}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <DetailRow label="Email" value={profile.email} />
                                    <DetailRow label="Téléphone" value={profile.phone} />
                                </>
                            )}

                            {currentDept === 'PRODUCTION' && !isEditing && (
                                <>
                                    <DetailRow label="Adresse" value={`${profile.address || ''} ${profile.postalCode || ''} ${profile.city || ''}`} className="col-span-2" />
                                    <DetailRow label="Situation Familiale" value={profile.familyStatus} />
                                </>
                            )}
                        </div>
                    </section>

                    {/* Restricted Sections - PRODUCTION ONLY - HIDE ON EDIT OR KEEP READONLY */}
                    {currentDept === 'PRODUCTION' && !profile.isOffline && (
                        <>
                            {/* Civil Status */}
                            <section>
                                <h3 className="text-lg font-bold text-blue-400 mb-4 border-b border-cinema-700/50 pb-2">État Civil & Social</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                    <DetailRow label="Date de Naissance" value={`${profile.birthDate || ''} à ${profile.birthPlace || ''} (${profile.birthCountry || ''})`} />
                                    <DetailRow label="Nationalité" value={profile.nationality} />
                                    <DetailRow label="Numéro Sécu" value={profile.ssn} />
                                    <DetailRow label="Centre Sécu" value={profile.socialSecurityCenterAddress} />
                                </div>
                            </section>

                            {/* Emergency */}
                            <section>
                                <h3 className="text-lg font-bold text-red-400 mb-4 border-b border-cinema-700/50 pb-2">Urgence & Médical</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                    <DetailRow label="Contact Urgence" value={profile.emergencyContactName} />
                                    <DetailRow label="Tél Urgence" value={profile.emergencyContactPhone} />
                                    <DetailRow label="N° Congés Spectacle" value={profile.congeSpectacleNumber} />
                                    <DetailRow label="Dernière Visite Médicale" value={profile.lastMedicalVisit} />
                                    <DetailRow label="Retraité" value={profile.isRetired ? "Oui" : "Non"} />
                                </div>
                            </section>

                            {/* Quick Docs Access */}
                            <section>
                                <h3 className="text-lg font-bold text-purple-400 mb-4 border-b border-cinema-700/50 pb-2">Documents</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <DocumentButton label="RIB" hasDoc={!!profile.rib} url={profile.rib} />
                                    <DocumentButton label="CNI" hasDoc={!!profile.idCard} url={profile.idCard} />
                                    <DocumentButton label="CMB" hasDoc={!!profile.cmbCard} url={profile.cmbCard} />
                                    <DocumentButton label="Permis" hasDoc={!!profile.drivingLicense} url={profile.drivingLicense} />
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const DetailRow = ({ label, value, className = '' }: any) => (
    <div className={className}>
        <span className="block text-xs font-bold text-slate-500 uppercase">{label}</span>
        <span className="text-slate-200">{value || '-'}</span>
    </div>
);

const ImportMemberModal = ({ onClose }: { onClose: () => void }) => {
    const { addOfflineMember } = useProject();
    const [mode, setMode] = useState<'MANUAL' | 'BULK'>('MANUAL');
    const [manualData, setManualData] = useState({
        firstName: '',
        lastName: '',
        role: '',
        phone: '',
        department: Department.REGIE
    });
    const [bulkText, setBulkText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Veuillez sélectionner un fichier PDF.');
            return;
        }

        setIsAnalyzing(true);
        try {
            const text = await extractTextFromPdf(file);
            setBulkText(prev => prev + '\n' + text);
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la lecture du PDF");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleManualSubmit = async () => {
        if (!manualData.firstName || !manualData.lastName) return;
        await addOfflineMember({
            ...manualData,
            department: manualData.department as any
        });
        onClose();
    };

    const handleBulkSubmit = async () => {
        const lines = bulkText.split('\n').filter(l => l.trim().length > 0);

        for (const line of lines) {
            const parts = line.split(/[ \t,;]+/);
            let phone = '';
            let names = [];
            let role = 'Renfort';

            for (const p of parts) {
                if (/^[\d\+\.\-]+$/.test(p) && p.length > 8) {
                    phone = p;
                } else {
                    names.push(p);
                }
            }

            if (names.length > 0) {
                await addOfflineMember({
                    firstName: names[0],
                    lastName: names.slice(1).join(' ') || '',
                    role: role,
                    phone: phone,
                    department: Department.REGIE
                });
            }
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-cinema-800 border border-cinema-700 rounded-2xl w-full max-w-2xl shadow-xl" onClick={e => e.stopPropagation()}>
                <header className="p-6 border-b border-cinema-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Ajouter un membre (Hors Ligne)</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
                </header>
                <div className="p-6">
                    <div className="flex gap-4 mb-6 border-b border-cinema-700/50">
                        <button
                            onClick={() => setMode('MANUAL')}
                            className={`pb-2 px-2 ${mode === 'MANUAL' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-400'}`}
                        >
                            Manuel
                        </button>
                        <button
                            onClick={() => setMode('BULK')}
                            className={`pb-2 px-2 ${mode === 'BULK' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-400'}`}
                        >
                            Import Liste
                        </button>
                    </div>

                    {mode === 'MANUAL' ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    placeholder="Prénom"
                                    className="bg-cinema-900 border-cinema-700 rounded p-2 text-white w-full"
                                    value={manualData.firstName}
                                    onChange={e => setManualData({ ...manualData, firstName: e.target.value })}
                                />
                                <input
                                    placeholder="Nom"
                                    className="bg-cinema-900 border-cinema-700 rounded p-2 text-white w-full"
                                    value={manualData.lastName}
                                    onChange={e => setManualData({ ...manualData, lastName: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    placeholder="Rôle (ex: Machiniste)"
                                    className="bg-cinema-900 border-cinema-700 rounded p-2 text-white w-full"
                                    value={manualData.role}
                                    onChange={e => setManualData({ ...manualData, role: e.target.value })}
                                />
                                <input
                                    placeholder="Téléphone"
                                    className="bg-cinema-900 border-cinema-700 rounded p-2 text-white w-full"
                                    value={manualData.phone}
                                    onChange={e => setManualData({ ...manualData, phone: e.target.value })}
                                />
                            </div>
                            <select
                                className="bg-cinema-900 border-cinema-700 rounded p-2 text-white w-full"
                                value={manualData.department}
                                onChange={e => setManualData({ ...manualData, department: e.target.value as any })}
                            >
                                {Object.values(Department).map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleManualSubmit}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded"
                            >
                                Créer Fiche
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-cinema-900/50 border border-dashed border-cinema-600 rounded-lg p-4 text-center">
                                <p className="text-sm text-slate-400 mb-2">
                                    Optionnel : Importez un PDF (Feuille de service, Liste équipe...)
                                </p>
                                <label className="cursor-pointer inline-flex items-center gap-2 bg-cinema-700 hover:bg-cinema-600 px-4 py-2 rounded text-sm text-white transition-colors">
                                    <Upload className="h-4 w-4" />
                                    {isAnalyzing ? 'Analyse en cours...' : 'Choisir un PDF'}
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        disabled={isAnalyzing}
                                    />
                                </label>
                            </div>

                            <p className="text-sm text-slate-400">
                                Collez une liste de noms (et numéros optionnels). Un par ligne.<br />
                                Ex: <code>Jean Dupont 0612345678</code>
                            </p>
                            <textarea
                                className="w-full h-48 bg-cinema-900 border-cinema-700 rounded p-2 text-white font-mono text-sm"
                                placeholder="Jean Dupont 0600000000&#10;Marie Curie"
                                value={bulkText}
                                onChange={e => setBulkText(e.target.value)}
                            />
                            <button
                                onClick={handleBulkSubmit}
                                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded"
                            >
                                Importer la liste
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
