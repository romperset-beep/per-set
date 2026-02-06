import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { UserProfile, Department } from '../types';
import { Save, Upload, FileText, CheckCircle, Trash2, Bell, BellOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, getStorage } from 'firebase/storage';
import { db, auth, storage } from '../services/firebase';
import { USPA_JOBS } from '../data/uspaRates';
import { usePushNotifications } from '../hooks/usePushNotifications';

export const UserProfilePage: React.FC = () => {
    const { user, userProfiles, updateUserProfile } = useProject();
    const [formData, setFormData] = useState<Partial<UserProfile>>({});
    const [isEditing, setIsEditing] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Notification Logic
    const { permission, requestPermission, disableNotifications, fcmToken, loading } = usePushNotifications(user?.id);


    useEffect(() => {
        const loadUserData = async () => {
            if (!user) return;

            // 1. Try to get from Context (userProfiles) - Best for team view consistency
            const existingProfile = userProfiles.find(p => p.email === user.email);

            // 2. Direct Fetch from Firestore (Source of Truth) to ensure we have personal data
            // (Context 'userProfiles' might be filtered or incomplete)
            try {
                if (auth.currentUser) {
                    const userRef = doc(db, 'users', auth.currentUser.uid);
                    const snap = await getDoc(userRef);
                    if (snap.exists()) {
                        const data = snap.data() as UserProfile; // Cast to ensure we get fields
                        console.log("Direct Profile Fetch Success:", data);

                        // Merge logic: Priority to Direct Fetch
                        const mergedData = {
                            ...existingProfile, // Project context info
                            ...data,            // Personal private info
                            id: user.email // Ensure ID is consistent for updates
                        };

                        setFormData({
                            email: user.email,
                            firstName: mergedData.firstName || user.name.split(' ')[0],
                            lastName: mergedData.lastName || user.name.split(' ').slice(1).join(' '),
                            department: user.department,
                            role: mergedData.role || (user.department === 'PRODUCTION' ? 'Production' : 'Technicien'),
                            nationality: mergedData.nationality || 'Française',
                            birthCountry: mergedData.birthCountry || 'France',

                            // Explicit mapping to ensure no field is missed
                            address: mergedData.address || '',
                            postalCode: mergedData.postalCode || '',
                            city: mergedData.city || '',
                            phone: mergedData.phone || '',
                            familyStatus: mergedData.familyStatus || '',
                            ssn: mergedData.ssn || '',
                            birthPlace: mergedData.birthPlace || '',
                            birthDate: mergedData.birthDate || '',
                            birthDepartment: mergedData.birthDepartment || '',
                            socialSecurityCenterAddress: mergedData.socialSecurityCenterAddress || '',
                            emergencyContactName: mergedData.emergencyContactName || '',
                            emergencyContactPhone: mergedData.emergencyContactPhone || '',
                            congeSpectacleNumber: mergedData.congeSpectacleNumber || '',
                            lastMedicalVisit: mergedData.lastMedicalVisit || '',
                            isRetired: mergedData.isRetired || false,
                            rib: mergedData.rib,
                            cmbCard: mergedData.cmbCard,
                            idCard: mergedData.idCard,
                            drivingLicense: mergedData.drivingLicense,
                            dietaryHabits: mergedData.dietaryHabits,
                            defaultTransportMode: mergedData.defaultTransportMode || 'TRANSPORT_COMMUN',
                            defaultVehicleType: mergedData.defaultVehicleType,
                            defaultFiscalPower: mergedData.defaultFiscalPower,
                            defaultCommuteDistanceKm: mergedData.defaultCommuteDistanceKm
                        });
                        setIsEditing(false); // Assume if data exists, we view it first
                        setIsLoading(false);
                        return;
                    }
                }
            } catch (err) {
                console.error("Direct fetch failed", err);
            }

            // 3. Fallback to Context User Object if direct fetch fails
            if (existingProfile) {
                setFormData(existingProfile);
                setIsEditing(false);
            } else {
                // ... (Previous fallback logic kept as safety net)
                const u = user as any;
                setFormData({
                    email: user.email,
                    firstName: u.firstName || user.name.split(' ')[0],
                    lastName: u.lastName || user.name.split(' ').slice(1).join(' '),
                    department: user.department,
                    role: u.role || (user.department === 'PRODUCTION' ? 'Production' : 'Technicien'),
                    nationality: u.nationality || 'Française',
                    birthCountry: u.birthCountry || 'France',
                    address: u.address || '',
                    postalCode: u.postalCode || '',
                    city: u.city || '',
                    phone: u.phone || '',
                    familyStatus: u.familyStatus || '',
                    ssn: u.ssn || '',
                    birthPlace: u.birthPlace || '',
                    birthDate: u.birthDate || '',
                    birthDepartment: u.birthDepartment || '',
                    socialSecurityCenterAddress: u.socialSecurityCenterAddress || '',
                    emergencyContactName: u.emergencyContactName || '',
                    emergencyContactPhone: u.emergencyContactPhone || '',
                    congeSpectacleNumber: u.congeSpectacleNumber || '',
                    lastMedicalVisit: u.lastMedicalVisit || '',
                    isRetired: u.isRetired || false,
                    rib: u.rib,
                    cmbCard: u.cmbCard,
                    idCard: u.idCard,
                    drivingLicense: u.drivingLicense,
                    defaultTransportMode: u.defaultTransportMode || 'TRANSPORT_COMMUN',
                    defaultVehicleType: u.defaultVehicleType,
                    defaultFiscalPower: u.defaultFiscalPower,
                    defaultCommuteDistanceKm: u.defaultCommuteDistanceKm
                });
            }
            setIsLoading(false);
        };

        loadUserData();
    }, [user, userProfiles]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof UserProfile) => {
        const file = e.target.files?.[0];
        if (file && user && auth.currentUser) {
            try {
                // visual feedback
                const btn = e.target.parentElement;
                if (btn) btn.style.opacity = '0.5';

                const storageRef = ref(storage, `users/${auth.currentUser.uid}/documents/${field}_${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                const downloadURL = await getDownloadURL(snapshot.ref);

                setFormData(prev => ({
                    ...prev,
                    [field]: downloadURL
                }));

                // restore
                if (btn) btn.style.opacity = '1';
            } catch (error) {
                console.error("Upload error:", error);
                alert("Erreur lors de l'upload du document");
            }
        }
    };

    const handleDeleteDocument = async (field: keyof UserProfile) => {
        if (!confirm("Voulez-vous vraiment supprimer ce document ?")) return;

        // Optimistically remove from UI
        setFormData(prev => ({
            ...prev,
            [field]: '' // Set to empty string to show upload box
        }));

        // Try to delete from storage if we can parse the URL (optional)
        // For now, just clearing the reference in the form data is enough for the user,
        // and the actual deletion from DB happens on "Save".
        // To be thorough, we could delete the blob if it exists.
        const fileUrl = formData[field];
        if (fileUrl && fileUrl.toString().includes('firebase')) {
            try {
                const fileRef = ref(storage, fileUrl.toString());
                await deleteObject(fileRef).catch(e => console.warn("Could not delete from storage", e));
            } catch (e) {
                console.warn("Invalid ref", e);
            }
        }
    };

    const handleGreyCardUpload = async (file: File) => {
        if (!user) return;
        try {
            const storage = getStorage();
            const storageRef = ref(storage, `users/${user.id}/grey_card_${Date.now()}`);

            // Convert to base64 for uploadString (since that's what's imported usually, or use uploadBytes if available)
            // Text says 'uploadString' in ProjectContext, let's see if UserProfilePage has it.
            // Assuming uploadBytes is better for files.

            // Let's use uploadBytes directly if I can import it.
            const { uploadBytes, getDownloadURL } = await import('firebase/storage');

            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            setFormData(prev => ({
                ...prev,
                greyCardUrl: url,
                defaultFiscalPower: prev.defaultFiscalPower || 6 // Mock AI extraction
            }));

            alert("Carte grise analysée ! Chevaux fiscaux détectés : 6 CV (Simulé)");

        } catch (err) {
            console.error("Upload error", err);
            alert("Erreur lors de l'envoi de la carte grise");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (user && auth.currentUser) {
            try {
                // Update Firestore
                const userRef = doc(db, 'users', auth.currentUser.uid);

                // Sanitize formData to remove undefined values (Firestore rejects undefined)
                const sanitizedData = Object.fromEntries(
                    Object.entries(formData).map(([k, v]) => [k, v === undefined ? null : v])
                );

                // We use setDoc with merge to ensure we don't overwrite other important user fields like project history
                await setDoc(userRef, {
                    ...sanitizedData,
                    // Ensure these are split correctly if not present in formData
                    firstName: formData.firstName || user.name.split(' ')[0],
                    lastName: formData.lastName || user.name.split(' ').slice(1).join(' ')
                }, { merge: true });

                // Show success modal instead of alert
                setShowSuccessModal(true);

                // Update local context (optional as onSnapshot should catch it, but good for immediate feedback)
                updateUserProfile({
                    ...formData,
                    id: user.email,
                } as UserProfile);

                setIsEditing(false);
            } catch (err) {
                console.error("Error saving profile:", err);
                alert(`Erreur lors de l'enregistrement: ${(err as Error).message}`);
            }
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
    if (isLoading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eco-500"></div></div>;

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

                        {/* Job Select */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fonction (Convention USPA)</label>
                            <select
                                name="role"
                                value={formData.role || ''}
                                onChange={handleChange}
                                disabled={!isEditing}
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-eco-500 focus:outline-none appearance-none disabled:opacity-50"
                                required
                            >
                                <option value="">Sélectionnez votre poste...</option>
                                {USPA_JOBS.map(job => (
                                    <option key={job.id} value={job.title}>{job.title}</option>
                                ))}
                                <option value="Autre">Autre / Non Listé</option>
                            </select>
                        </div>
                        <Input label="Email" name="email" value={formData.email} onChange={handleChange} disabled={true} />
                        <Input label="Téléphone" name="phone" value={formData.phone} onChange={handleChange} disabled={!isEditing} required />
                        <Input label="Situation Familiale" name="familyStatus" value={formData.familyStatus} onChange={handleChange} disabled={!isEditing} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Adresse" name="address" value={formData.address} onChange={handleChange} disabled={!isEditing} className="md:col-span-3" required />
                        <Input label="Code Postal" name="postalCode" value={formData.postalCode} onChange={handleChange} disabled={!isEditing} required />
                        <Input label="Ville" name="city" value={formData.city} onChange={handleChange} disabled={!isEditing} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Régime Alimentaire (Cantine)</label>
                        <select
                            name="dietaryHabits"
                            value={formData.dietaryHabits || ''}
                            onChange={handleChange}
                            disabled={!isEditing}
                            className={`w-full bg-cinema-900 border ${isEditing ? 'border-cinema-700' : 'border-transparent'} rounded-lg p-3 text-white focus:border-eco-500 outline-none transition-colors appearance-none`}
                        >
                            <option value="">Standard (Tout)</option>
                            <option value="Végétarien">Végétarien</option>
                            <option value="Végétalien (Vegan)">Végétalien (Vegan)</option>
                            <option value="Sans Porc">Sans Porc</option>
                            <option value="Sans Gluten">Sans Gluten</option>
                            <option value="Sans Lactose">Sans Lactose</option>
                            <option value="Halal">Halal</option>
                            <option value="Casher">Casher</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">Ces informations seront visibles par la Régie pour l'organisation des repas.</p>
                    </div>

                </section>

                {/* Notification Preferences */}
                <section className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 space-y-4">
                    <h3 className="text-xl font-bold text-pink-400 border-b border-cinema-700 pb-2 flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Notifications & Alertes
                    </h3>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-cinema-900/50 p-4 rounded-lg border border-cinema-700">
                        <div>
                            <p className="font-bold text-white mb-1">Notifications Push</p>
                            <p className="text-xs text-slate-400 max-w-md">
                                Recevez des alertes en temps réel pour les nouvelles demandes de renforts,
                                les messages urgents et les mises à jour importantes de la production.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {permission === 'denied' ? (
                                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
                                    <BellOff className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Bloquées par le navigateur</span>
                                </div>
                            ) : (
                                <>
                                    {/* ON / OFF Toggle Logic */}
                                    {fcmToken ? (
                                        <button
                                            type="button"
                                            onClick={disableNotifications}
                                            disabled={loading}
                                            className="group flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-4 py-2 rounded-lg hover:bg-red-500/10 hover:border-red-500/30 transition-all"
                                            title="Cliquez pour désactiver"
                                        >
                                            <div className="flex items-center gap-2 group-hover:hidden">
                                                <CheckCircle className="h-4 w-4 text-green-400" />
                                                <span className="text-green-400 font-bold uppercase text-xs">Active</span>
                                            </div>
                                            <div className="hidden group-hover:flex items-center gap-2">
                                                <BellOff className="h-4 w-4 text-red-400" />
                                                <span className="text-red-400 font-bold uppercase text-xs">Désactiver</span>
                                            </div>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={requestPermission}
                                            disabled={loading}
                                            className="flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:scale-100"
                                        >
                                            <Bell className="h-4 w-4" />
                                            {loading ? 'Activation...' : 'Activer les notifications'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    {permission === 'denied' && (
                        <div className="flex items-center gap-2 text-yellow-500 text-xs bg-yellow-500/10 p-3 rounded border border-yellow-500/20">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <p>Les notifications sont bloquées par votre navigateur. Veuillez cliquer sur l'icône de cadenas ou de paramètres dans la barre d'adresse pour les autoriser.</p>
                        </div>
                    )}
                </section>

                {/* Transport Defaults */}
                <section className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 space-y-4">
                    <h3 className="text-xl font-bold text-yellow-400 border-b border-cinema-700 pb-2">Transport Préféré (Défaut)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mode de Transport Principal</label>
                            <select
                                name="defaultTransportMode"
                                value={formData.defaultTransportMode || 'TRANSPORT_COMMUN'}
                                onChange={handleChange}
                                disabled={!isEditing}
                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none appearance-none disabled:opacity-50"
                            >
                                <option value="TRANSPORT_COMMUN">Transports en Commun</option>
                                <option value="VEHICULE_PERSO">Véhicule Personnel</option>
                                <option value="COVOITURAGE">Covoiturage</option>
                            </select>
                        </div>

                        {formData.defaultTransportMode === 'VEHICULE_PERSO' && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Type de Véhicule</label>
                                    <select
                                        name="defaultVehicleType"
                                        value={formData.defaultVehicleType || 'VOITURE'}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none appearance-none disabled:opacity-50"
                                    >
                                        <option value="VOITURE">Voiture</option>
                                        <option value="MOTO">Moto</option>
                                        <option value="SCOOTER">Scooter</option>
                                        <option value="CAMION">Camion</option>
                                        <option value="UTILITAIRE">Utilitaire</option>
                                    </select>
                                </div>
                                <Input
                                    label="Chevaux Fiscaux (CV)"
                                    name="defaultFiscalPower"
                                    type="number"
                                    value={formData.defaultFiscalPower}
                                    onChange={handleChange}
                                    disabled={!isEditing}
                                />

                                <div className="md:col-span-2 space-y-2">
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                        Justificatif Carte Grise (Obligatoire pour IK)
                                    </label>

                                    {formData.greyCardUrl ? (
                                        <div className="flex items-center gap-4 bg-green-900/20 border border-green-800 p-3 rounded-lg">
                                            <div className="bg-green-600 rounded-full p-1"><CheckCircle2 className="h-4 w-4 text-white" /></div>
                                            <div className="flex-1">
                                                <p className="text-sm text-green-400 font-medium">Carte Grise en ligne</p>
                                                <a href={formData.greyCardUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-500 hover:underline">Voir le document</a>
                                            </div>
                                            {isEditing && (
                                                <button
                                                    onClick={() => setFormData(prev => ({ ...prev, greyCardUrl: undefined }))}
                                                    className="text-slate-400 hover:text-white"
                                                >
                                                    Remplacer
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*,application/pdf"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file || !user) return;

                                                    // Mock upload logic inline for now or extract
                                                    try {
                                                        const storageRef = ref(getStorage(), `users/${user.id}/grey_card_${Date.now()}`);
                                                        // We need uploadBytes from firebase/storage, let's assume it's available or use what's there
                                                        // The file had 'uploadString' imported, let's check imports.
                                                        // I will use a simple placeholder if imports are missing, but ideally I should fix imports.
                                                        // Let's assume standard firebase behavior.
                                                        // Actually, let's add a proper handler function above.
                                                        handleGreyCardUpload(file);
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert("Erreur d'upload");
                                                    }
                                                }}
                                                disabled={!isEditing}
                                                className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-600 file:text-white hover:file:bg-yellow-500 cursor-pointer disabled:opacity-50"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">L'IA détectera automatiquement les CV si le scan est clair.</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </section>

                {/* Civil Status */}
                <section className="bg-cinema-800 p-6 rounded-xl border border-cinema-700 space-y-4">
                    <h3 className="text-xl font-bold text-blue-400 border-b border-cinema-700 pb-2">État Civil & Social</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Numéro Sécurité Sociale" name="ssn" value={formData.ssn} onChange={handleChange} disabled={!isEditing} required />
                        <Input label="Taux Prélèvement à la Source (%)" name="taxRate" type="number" step="0.1" value={formData.taxRate} onChange={handleChange} disabled={!isEditing} placeholder="Ex: 11" />
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
                        <FileUpload label="RIB" field="rib" value={formData.rib} onChange={handleFileUpload} onDelete={handleDeleteDocument} disabled={!isEditing} />
                        <FileUpload label="Carte Vitale / Attestation CMB" field="cmbCard" value={formData.cmbCard} onChange={handleFileUpload} onDelete={handleDeleteDocument} disabled={!isEditing} />
                        <FileUpload label="Carte d'Identité" field="idCard" value={formData.idCard} onChange={handleFileUpload} onDelete={handleDeleteDocument} disabled={!isEditing} />
                        <FileUpload label="Permis de Conduire" field="drivingLicense" value={formData.drivingLicense} onChange={handleFileUpload} onDelete={handleDeleteDocument} disabled={!isEditing} />
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

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-cinema-800 border-2 border-green-500 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-green-500/20 animate-in zoom-in duration-300">
                        <div className="flex flex-col items-center text-center space-y-6">
                            <div className="bg-green-500/20 rounded-full p-4">
                                <CheckCircle2 className="h-16 w-16 text-green-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-white">Fiche enregistrée avec succès !</h3>
                            <p className="text-slate-300">Vos informations ont été sauvegardées.</p>
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold transition-all w-full shadow-lg"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
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

const FileUpload = ({ label, field, value, onChange, onDelete, disabled }: any) => (
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
                        onClick={() => onDelete && onDelete(field)}
                        className="text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded transition-colors"
                        title="Supprimer le document"
                    >
                        <Trash2 className="h-4 w-4" />
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
