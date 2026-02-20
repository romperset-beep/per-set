import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Department, OfflineMember } from '../types';
import { Search, FileText, Download, Mail, Phone, Upload } from 'lucide-react';
import { extractTextFromPdf } from '../utils/pdfHelpers';
import { useTeam } from '../context/TeamContext';
import { ProfileDetailModal, DocumentButton } from './team/ProfileDetailModal';
import { ImportMemberModal } from './team/ImportMemberModal';

export const TeamDirectory: React.FC = () => {
    const { userProfiles, currentDept, project } = useProject();
    const { addMember, removeMember, offlineMembers, addOfflineMember, deleteOfflineMember } = useTeam();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState<string>('ALL');
    const [selectedProfile, setSelectedProfile] = useState<any>(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [showInvite, setShowInvite] = useState(false); // UI State for Invite Box
    const [showImportModal, setShowImportModal] = useState(false); // UI State for Import Modal



    // Filter profiles belonging to THIS project
    const projectMembers = userProfiles.filter(profile => {
        const p = profile as any;

        // Safety check
        if (!project?.id) return false;

        // Case 1: Active project (Redundant but keeps UI snappy)
        if (p.currentProjectId === project.id) return true;

        // Case 2: Project in history
        if (p.projectHistory && Array.isArray(p.projectHistory)) {
            if (p.projectHistory.some((h: any) => h.projectId === project.id || h.id === project.id)) return true;
        }

        // Case 3: Explicitly in project members map (The Admin Dashboard Logic)
        // This fixes the issue where users have currentProjectId=null but are members
        if (project.members && project.members[profile.id]) return true;

        return false;
    });

    // Debug logging
    console.log('📚 Bible Équipe - Project filtering:', {
        projectId: project.id,
        projectName: project.name,
        totalProfiles: userProfiles.length,
        filteredMembers: projectMembers.length,
        members: projectMembers.map(p => ({ name: `${p.firstName} ${p.lastName}`, dept: p.department }))
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
                                        {/* Privacy Check */}
                                        {(currentDept === 'PRODUCTION' ||
                                            !profile.privacySettings?.contactVisibility ||
                                            profile.privacySettings.contactVisibility === 'TEAM') ? (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="h-4 w-4" />
                                                    <a href={`mailto:${profile.email}`} className="hover:text-white transition-colors">{profile.email}</a>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-4 w-4" />
                                                    <a href={`tel:${profile.phone}`} className="hover:text-white transition-colors">{profile.phone}</a>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col gap-2 py-1">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Mail className="h-4 w-4" />
                                                    <span className="italic">Masqué (Privé)</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Phone className="h-4 w-4" />
                                                    <span className="italic">Masqué (Privé)</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end pt-2 border-t border-cinema-700/50">
                                        {(currentDept === 'PRODUCTION' ||
                                            !profile.privacySettings?.contactVisibility ||
                                            profile.privacySettings.contactVisibility === 'TEAM') && (
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
                                            )}
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

