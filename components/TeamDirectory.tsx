import React, { useState } from 'react';
import { useProject } from '../context/ProjectContext';
import { Department } from '../types';
import { Search, FileText, Download, Mail, Phone } from 'lucide-react';

export const TeamDirectory: React.FC = () => {
    const { userProfiles, currentDept } = useProject();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState<string>('ALL');

    if (currentDept !== 'PRODUCTION') {
        return <div className="p-8 text-center text-red-400">Accès réservé à la production.</div>;
    }

    const filteredProfiles = userProfiles.filter(profile => {
        const matchesSearch = (
            profile.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            profile.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            profile.role.toLowerCase().includes(searchTerm.toLowerCase())
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
                        {userProfiles.length} fiches de renseignements enregistrées
                    </p>
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
                                <div key={profile.email} className="bg-cinema-800 rounded-xl border border-cinema-700 p-4 hover:border-blue-500/50 transition-colors group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-bold text-white text-lg">{profile.firstName} {profile.lastName}</h4>
                                            <p className="text-blue-400 text-sm">{profile.role}</p>
                                        </div>
                                        {/* Status Badges */}
                                        <div className="flex gap-1">
                                            {profile.rib && <div title="RIB" className="h-2 w-2 rounded-full bg-green-500" />}
                                            {profile.idCard && <div title="CNI" className="h-2 w-2 rounded-full bg-blue-500" />}
                                            {profile.cmbCard && <div title="CMB" className="h-2 w-2 rounded-full bg-purple-500" />}
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

                                    <div className="pt-4 border-t border-cinema-700 grid grid-cols-2 gap-2">
                                        <DocumentButton label="RIB" hasDoc={!!profile.rib} />
                                        <DocumentButton label="CNI" hasDoc={!!profile.idCard} />
                                        <DocumentButton label="CMB" hasDoc={!!profile.cmbCard} />
                                        <DocumentButton label="Permis" hasDoc={!!profile.drivingLicense} />
                                    </div>
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
        </div>
    );
};

const DocumentButton = ({ label, hasDoc }: { label: string, hasDoc: boolean }) => (
    <button
        disabled={!hasDoc}
        className={`flex items-center justify-center gap-2 py-1.5 rounded text-xs font-medium transition-colors ${
            hasDoc 
                ? 'bg-cinema-700 text-white hover:bg-blue-600' 
                : 'bg-cinema-900/50 text-slate-600 cursor-not-allowed'
        }`}
    >
        <FileText className="h-3 w-3" />
        {label}
    </button>
);
