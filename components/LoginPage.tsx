import React, { useState } from 'react';
import { Department } from '../types';
import { useProject } from '../context/ProjectContext';
import { Clapperboard, UserCircle, Building2, Mail, Film, Globe } from 'lucide-react';
import { Language } from '../types';

export const LoginPage: React.FC = () => {
    const { login, language, setLanguage, t } = useProject();

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
                {/* Language Selector */}
                <div className="absolute top-4 right-4">
                    <div className="relative group">
                        <Globe className="h-5 w-5 text-slate-500 absolute left-2 top-2 pointer-events-none" />
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as Language)}
                            className="bg-cinema-900 border border-cinema-700 text-slate-300 text-sm rounded-lg pl-8 pr-2 py-1.5 focus:ring-2 focus:ring-eco-500 focus:outline-none appearance-none cursor-pointer hover:bg-cinema-700 transition-colors"
                        >
                            <option value="fr">FR</option>
                            <option value="en">EN</option>
                            <option value="es">ES</option>
                        </select>
                    </div>
                </div>

                <div className="text-center mb-8">
                    <img src="/logo.png" alt="A Better Set Logo" className="w-48 h-auto mx-auto mb-6 rounded-full shadow-2xl" />
                    <h1 className="text-3xl font-bold text-white tracking-tight">A Better Set</h1>
                    <p className="text-slate-400">{t('login.welcome')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4">
                        <div className="relative group">
                            <Building2 className="absolute left-3 top-3 h-5 w-5 text-slate-500 group-focus-within:text-eco-400 transition-colors" />
                            <input
                                type="text"
                                name="productionName"
                                placeholder={t('login.production')}
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
                                placeholder={t('login.film')}
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
                                placeholder={t('login.name')}
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
                                placeholder={t('login.email')}
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-eco-500 focus:outline-none transition-all"
                                required
                            />
                        </div>

                        <div className="relative">
                            <label className="block text-xs font-medium text-slate-400 mb-1 ml-1 uppercase tracking-wider">{t('login.department')}</label>
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
                        {t('login.submit')}
                    </button>
                </form>

                <p className="text-center text-xs text-slate-500 mt-6">
                    {t('login.footer')}
                </p>
            </div>
        </div>
    );
};
