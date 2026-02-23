import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { useTeam } from '../../context/TeamContext';
import { Department } from '../../types';
import { FileText } from 'lucide-react';

export const DocumentButton = ({ label, hasDoc, url }: { label: string, hasDoc: boolean, url?: string }) => {
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

const DetailRow = ({ label, value, className = '' }: any) => (
    <div className={className}>
        <span className="block text-xs font-bold text-slate-500 uppercase">{label}</span>
        <span className="text-slate-200">{value || '-'}</span>
    </div>
);

export const ProfileDetailModal = ({ profile, onClose }: { profile: any, onClose: () => void }) => {
    const { currentDept } = useProject();
    const { updateOfflineMember } = useTeam();
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
                                    <DetailRow label="Régimes alimentaires" value={profile.dietaryHabits} />
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
