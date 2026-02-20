import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Department } from '../types';
import { User, ClipboardList, AlertCircle } from 'lucide-react';

interface MissingProfileDetailsModalProps {
    onClose: () => void;
}

export const MissingProfileDetailsModal: React.FC<MissingProfileDetailsModalProps> = ({ onClose }) => {
    const { user, updateUser, updateUserProfile } = useAuth();
    const [loading, setLoading] = useState(false);

    // We start with current user data
    const [formData, setFormData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        phone: user?.phone || '',
        role: user?.role || '',
        department: user?.department || Department.REGIE
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!user) return;

            // Updated both User (auth/firestore root) and UserProfile (if separate) logic 
            // In our app, updateUser updates the root 'users' collection document.
            await updateUser({
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                role: formData.role, // Job Title
                department: formData.department as Department
            });

            // Success
            onClose();
        } catch (err) {
            console.error("Error updating profile:", err);
            alert("Erreur lors de la mise à jour du profil.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-cinema-800 border-2 border-cinema-600 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center">
                    <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 ring-4 ring-white/10">
                        <User className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">Finalisez votre Profil</h2>
                    <p className="text-blue-100 text-sm">
                        Pour apparaître dans la Bible de l'équipe, nous avons besoin de quelques infos.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Prénom</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Jean"
                                value={formData.firstName}
                                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Nom</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Dupont"
                                value={formData.lastName}
                                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Téléphone</label>
                        <input
                            required
                            type="tel"
                            className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="06 12 34 56 78"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Fonction / Rôle</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Régisseur"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Département</label>
                            <select
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                                value={formData.department}
                                onChange={e => setFormData({ ...formData, department: e.target.value as Department })}
                            >
                                {Object.values(Department).map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                            ) : (
                                <>
                                    <ClipboardList className="h-4 w-4" />
                                    Enregistrer ma fiche
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="text-xs text-slate-500 hover:text-slate-300 py-2"
                        >
                            Remplir plus tard
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
