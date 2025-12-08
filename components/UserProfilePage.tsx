import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { UserProfile, Department } from '../types';
import { Save, Upload, FileText, CheckCircle } from 'lucide-react';

export const UserProfilePage: React.FC = () => {
    const { user, userProfiles, updateUserProfile } = useProject();
    const [formData, setFormData] = useState<Partial<UserProfile>>({});
    const [isEditing, setIsEditing] = useState(true);

    useEffect(() => {
        if (user) {
            const existingProfile = userProfiles.find(p => p.email === user.email);
            if (existingProfile) {
                setFormData(existingProfile);
                setIsEditing(false);
            } else {
                setFormData({
                    email: user.email,
                    firstName: user.name.split(' ')[0],
                    lastName: user.name.split(' ').slice(1).join(' '),
                    department: user.department,
                    role: user.department === 'PRODUCTION' ? 'Production' : 'Technicien',
                    nationality: 'Française',
                    birthCountry: 'France'
                });
            }
        }
    }, [user, userProfiles]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: keyof UserProfile) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    [field]: reader.result as string
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (user && formData.email) {
            updateUserProfile({
                ...formData,
                id: user.email, // Use email as ID for simplicity
            } as UserProfile);
            setIsEditing(false);
        }
    };

    const handleSendEmail = () => {
        const subject = `Fiche Renseignements - ${formData.lastName} ${formData.firstName} - ${formData.role}`;

        const body = `Bonjour,

Voici ma fiche de renseignements pour la production.

--- INFORMATIONS PERSONNELLES ---
Nom : ${formData.lastName || ''}
Prénom : ${formData.firstName || ''}
Fonction : ${formData.role || ''}
Tél : ${formData.phone || ''}
Email : ${formData.email || ''}
Adresse : ${formData.address || ''}, ${formData.postalCode || ''} ${formData.city || ''}
Situation Familiale : ${formData.familyStatus || ''}

--- ÉTAT CIVIL ---
Né(e) le : ${formData.birthDate || ''} à ${formData.birthPlace || ''} (${formData.birthCountry || ''})
Nationalité : ${formData.nationality || ''}
Numéro Sécu : ${formData.ssn || ''}
Adresse Centre Sécu : ${formData.socialSecurityCenterAddress || ''}

--- URGENCE & MÉDICAL ---
Contact Urgence : ${formData.emergencyContactName || ''}
Tél Urgence : ${formData.emergencyContactPhone || ''}
N° Congés Spectacle : ${formData.congeSpectacleNumber || ''}
Dernière Visite Médicale : ${formData.lastMedicalVisit || ''}
Retraité : ${formData.isRetired ? 'Oui' : 'Non'}

Note : Les documents (RIB, CNI, etc.) ne peuvent pas être attachés automatiquement. Merci de les joindre si nécessaire.

Cordialement,
${formData.firstName} ${formData.lastName}`;

        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    if (!user) return <div>Veuillez vous connecter.</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white">Fiche de Renseignements</h2>
                    <p className="text-slate-400">Vos informations administratives pour la production</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="bg-cinema-700 hover:bg-cinema-600 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                    >
                        Modifier
                    </button>
                )}
            </header>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Info */}
                <section className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 space-y-4">
                    <h3 className="text-xl font-bold text-eco-400 border-b border-cinema-700 pb-2">Informations Personnelles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Nom" name="lastName" value={formData.lastName} onChange={handleChange} disabled={!isEditing} required />
                        <Input label="Prénom" name="firstName" value={formData.firstName} onChange={handleChange} disabled={!isEditing} required />
                        <Input label="Fonction" name="role" value={formData.role} onChange={handleChange} disabled={!isEditing} required />
                        <Input label="Email" name="email" value={formData.email} onChange={handleChange} disabled={true} />
                        <Input label="Téléphone" name="phone" value={formData.phone} onChange={handleChange} disabled={!isEditing} required />
                        <Input label="Situation Familiale" name="familyStatus" value={formData.familyStatus} onChange={handleChange} disabled={!isEditing} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Adresse" name="address" value={formData.address} onChange={handleChange} disabled={!isEditing} className="md:col-span-3" required />
                        <Input label="Code Postal" name="postalCode" value={formData.postalCode} onChange={handleChange} disabled={!isEditing} required />
                        <Input label="Ville" name="city" value={formData.city} onChange={handleChange} disabled={!isEditing} required />
                    </div>
                </section>

                {/* Civil Status */}
                <section className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 space-y-4">
                    <h3 className="text-xl font-bold text-blue-400 border-b border-cinema-700 pb-2">État Civil & Social</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Numéro Sécurité Sociale" name="ssn" value={formData.ssn} onChange={handleChange} disabled={!isEditing} required />
                        <Input label="Nationalité" name="nationality" value={formData.nationality} onChange={handleChange} disabled={!isEditing} required />
                        <Input label="Date de Naissance" name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} disabled={!isEditing} required />
                        <Input label="Lieu de Naissance" name="birthPlace" value={formData.birthPlace} onChange={handleChange} disabled={!isEditing} required />
                        <Input label="Dépt. de Naissance" name="birthDepartment" value={formData.birthDepartment} onChange={handleChange} disabled={!isEditing} />
                        <Input label="Pays de Naissance" name="birthCountry" value={formData.birthCountry} onChange={handleChange} disabled={!isEditing} />
                        <Input label="Adresse Centre Sécu" name="socialSecurityCenterAddress" value={formData.socialSecurityCenterAddress} onChange={handleChange} disabled={!isEditing} className="md:col-span-2" />
                    </div>
                </section>

                {/* Emergency & Medical */}
                <section className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 space-y-4">
                    <h3 className="text-xl font-bold text-red-400 border-b border-cinema-700 pb-2">Urgence & Médical</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Personne à prévenir" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} disabled={!isEditing} required />
                        <Input label="Tél. Personne à prévenir" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} disabled={!isEditing} required />
                        <Input label="N° Congés Spectacle" name="congeSpectacleNumber" value={formData.congeSpectacleNumber} onChange={handleChange} disabled={!isEditing} />
                        <Input label="Dernière Visite Médicale" name="lastMedicalVisit" type="date" value={formData.lastMedicalVisit} onChange={handleChange} disabled={!isEditing} />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            name="isRetired"
                            checked={formData.isRetired || false}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className="h-5 w-5 rounded border-cinema-600 bg-cinema-700 text-eco-500 focus:ring-eco-500"
                        />
                        <label className="text-slate-300">Je suis à la retraite</label>
                    </div>
                </section>

                {/* Documents */}
                <section className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 space-y-4">
                    <h3 className="text-xl font-bold text-purple-400 border-b border-cinema-700 pb-2">Documents (PDF ou Photo)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FileUpload label="RIB" field="rib" value={formData.rib} onChange={handleFileUpload} disabled={!isEditing} />
                        <FileUpload label="Carte Vitale / Attestation CMB" field="cmbCard" value={formData.cmbCard} onChange={handleFileUpload} disabled={!isEditing} />
                        <FileUpload label="Carte d'Identité" field="idCard" value={formData.idCard} onChange={handleFileUpload} disabled={!isEditing} />
                        <FileUpload label="Permis de Conduire" field="drivingLicense" value={formData.drivingLicense} onChange={handleFileUpload} disabled={!isEditing} />
                    </div>
                </section>

                {isEditing && (
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-600/20"
                        >
                            <Save className="h-5 w-5" />
                            Enregistrer ma fiche
                        </button>
                    </div>
                )}
            </form>

            <div className="flex justify-center pt-8 pb-12">
                <button
                    onClick={handleSendEmail}
                    className="flex items-center gap-3 bg-cinema-700 hover:bg-cinema-600 text-white px-6 py-4 rounded-xl font-bold transition-all hover:scale-105 shadow-xl border border-cinema-600"
                >
                    <FileText className="h-5 w-5" />
                    Envoyer ma fiche par Email
                </button>
            </div>
        </div>
    );
};

const Input = ({ label, className = '', ...props }: any) => (
    <div className={className}>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{label}</label>
        <input
            className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-eco-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            {...props}
        />
    </div>
);

const FileUpload = ({ label, field, value, onChange, disabled }: any) => (
    <div className="bg-cinema-900/50 p-4 rounded-lg border border-cinema-700 border-dashed">
        <label className="block text-sm font-bold text-slate-300 mb-2">{label}</label>
        {value ? (
            <div className="flex items-center justify-between bg-cinema-800 p-3 rounded border border-cinema-600">
                <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm">Document chargé</span>
                </div>
                {!disabled && (
                    <button
                        type="button"
                        onClick={() => {/* Logic to clear would go here */ }}
                        className="text-xs text-red-400 hover:underline"
                    >
                        Remplacer
                    </button>
                )}
            </div>
        ) : (
            <div className="relative">
                <input
                    type="file"
                    onChange={(e) => onChange(e, field)}
                    disabled={disabled}
                    accept=".pdf,image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex flex-col items-center justify-center py-4 text-slate-500 hover:text-eco-400 transition-colors">
                    <Upload className="h-8 w-8 mb-2" />
                    <span className="text-xs">Cliquez pour ajouter (PDF/IMG)</span>
                </div>
            </div>
        )}
    </div>
);
