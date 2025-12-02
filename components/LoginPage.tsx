import React, { useState } from 'react';
import { Department } from '../types';
import { useProject } from '../context/ProjectContext';
import { Clapperboard, UserCircle, Building2, Mail, Film } from 'lucide-react';

export const LoginPage: React.FC = () => {
    const { login } = useProject();

    const [formData, setFormData] = useState({
        productionName: '',
        filmTitle: '',
        department: 'PRODUCTION', // Default
        name: '',
        email: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.productionName || !formData.filmTitle) return;

        login({
            name: formData.name,
            email: formData.email,
            department: formData.department as Department | 'PRODUCTION',
            productionName: formData.productionName,
            filmTitle: formData.filmTitle
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-screen bg-cinema-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-eco-500/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cinema-500/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="bg-cinema-800 border border-cinema-700 p-8 rounded-2xl shadow-2xl max-w-md w-full relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center mb-8">
                    <img src="/logo.jpg" alt="Logo" className="w-full h-auto mb-6 rounded-xl shadow-2xl" />
                    <h1 className="text-3xl font-bold text-white tracking-tight">CinéStock</h1>
                    <p className="text-slate-400">Gestion éco-responsable de production</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4">
                        <div className="relative group">
                            <Building2 className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-eco-400 transition-colors" />
                            <input
                                type="text"
                                name="productionName"
                                placeholder="Maison de Production"
                                value={formData.productionName}
                                onChange={handleChange}
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-eco-500 focus:outline-none transition-all"
                                required
                            />
                        </div>

                        <div className="relative group">
                            <Film className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-eco-400 transition-colors" />
                            <input
                                type="text"
                                name="filmTitle"
                                placeholder="Titre du Film / Projet"
                                value={formData.filmTitle}
                                onChange={handleChange}
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-eco-500 focus:outline-none transition-all"
                                required
                            />
                        </div>

                        <div className="h-px bg-cinema-700 my-4"></div>

                        <div className="relative group">
                            <UserCircle className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-eco-400 transition-colors" />
                            <input
                                type="text"
                                name="name"
                                placeholder="Votre Nom Complet"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-eco-500 focus:outline-none transition-all"
                                required
                            />
                        </div>

                        <div className="relative group">
                            <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-eco-400 transition-colors" />
                            <input
                                type="email"
                                name="email"
                                placeholder="Votre Email Professionnel"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-eco-500 focus:outline-none transition-all"
                                required
                            />
                        </div>

                        <div className="relative">
                            <label className="block text-xs font-medium text-slate-400 mb-1 ml-1 uppercase tracking-wider">Votre Département</label>
                            <select
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-eco-500 focus:outline-none appearance-none"
                            >
                                <option value="PRODUCTION">PRODUCTION (Admin)</option>
                                {Object.values(Department).map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-eco-600 hover:bg-eco-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-eco-900/20 hover:shadow-eco-900/40 transition-all transform hover:scale-[1.02] mt-6"
                    >
                        Accéder à l'Espace
                    </button>
                </form>

                <p className="text-center text-xs text-slate-500 mt-6">
                    © 2024 CinéStock Vert. Optimisé pour l'industrie cinématographique durable.
                </p>
            </div>
        </div>
    );
};
