import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Department } from '../types';
import { Search, FileText, Download, Mail, Phone } from 'lucide-react';

export const TeamDirectory: React.FC = () => {
    const { userProfiles, currentDept, project, addMember, removeMember } = useProject();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState<string>('ALL');
    const [selectedProfile, setSelectedProfile] = useState<any>(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [showInvite, setShowInvite] = useState(false); // UI State for Invite Box



    // Filter profiles belonging to THIS project
    const projectMembers = userProfiles.filter(profile => {
        const p = profile as any;
        return p.currentProjectId === project.id || p.projectHistory?.some((h: any) => h.id === project.id);
    });

    const filteredProfiles = projectMembers.filter(profile => {
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
    }, {} as Record<string, typeof userProfiles>);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white">Annuaire de l'Équipe</h2>
                    <p className="text-slate-400">
                        {projectMembers.length} fiches de renseignements enregistrées
                    </p>
                    {currentDept === 'PRODUCTION' && (
                        <div className="mt-2 flex gap-2">
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
                                                                removeMember(profile.id);
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
    const { currentDept } = useProject();
    if (!profile) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-cinema-800 border border-cinema-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <header className="p-6 border-b border-cinema-700 flex justify-between items-start sticky top-0 bg-cinema-800 z-10">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{profile.firstName} {profile.lastName}</h2>
                        <p className="text-blue-400">{profile.role} • {profile.department}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-cinema-700 rounded-full transition-colors">
                        <span className="text-2xl text-slate-400">&times;</span>
                    </button>
                </header>

                <div className="p-8 space-y-8">
                    {/* Personal Info - LIMITED for non-production */}
                    <section>
                        <h3 className="text-lg font-bold text-eco-400 mb-4 border-b border-cinema-700/50 pb-2">Informations Personnelles</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                            <DetailRow label="Email" value={profile.email} />
                            <DetailRow label="Téléphone" value={profile.phone} />

                            {currentDept === 'PRODUCTION' && (
                                <>
                                    <DetailRow label="Adresse" value={`${profile.address || ''} ${profile.postalCode || ''} ${profile.city || ''}`} className="col-span-2" />
                                    <DetailRow label="Situation Familiale" value={profile.familyStatus} />
                                </>
                            )}
                        </div>
                    </section>

                    {/* Restricted Sections - PRODUCTION ONLY */}
                    {currentDept === 'PRODUCTION' && (
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
