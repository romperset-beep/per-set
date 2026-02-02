import React, { useState, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import { useMarketplace } from '../context/MarketplaceContext';
import { Department, BuyBackItem } from '../types';
import { X, Upload, Camera, Euro, Tag, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { validatePrice, validateFile } from '../src/utils/validation';

interface SellItemModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SellItemModal: React.FC<SellItemModalProps> = ({ isOpen, onClose }) => {
    const { user, currentDept } = useProject();
    const { addBuyBackItem } = useMarketplace();
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [originalPrice, setOriginalPrice] = useState('');
    const [description, setDescription] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [isPriceTBD, setIsPriceTBD] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file
            try {
                validateFile(file, {
                    maxSizeMB: 10,
                    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
                });
            } catch (error: any) {
                alert(error.message);
                e.target.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setPhoto(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || (!price && !isPriceTBD)) return;

        // Validate price
        const priceValue = isPriceTBD ? -1 : parseFloat(price);
        try {
            validatePrice(priceValue);
        } catch (error: any) {
            alert(error.message);
            return;
        }

        const newItem: BuyBackItem = {
            id: `buyback_${Date.now()}`,
            name,
            price: priceValue,
            originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
            description,
            photo: photo || undefined,
            sellerDepartment: (user?.department || currentDept || 'PRODUCTION') as Department | 'PRODUCTION', // Fallback
            reservedBy: null,
            status: 'AVAILABLE',
            date: new Date().toISOString()
        };

        addBuyBackItem(newItem);
        onClose();

        // Reset form
        setName('');
        setPrice('');
        setOriginalPrice('');
        setDescription('');
        setPhoto(null);
        setIsPriceTBD(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-cinema-900 w-full max-w-lg rounded-2xl border border-cinema-700 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-cinema-700 flex justify-between items-center bg-cinema-800">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Tag className="h-5 w-5 text-yellow-500" />
                        Vendre un article
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">

                    {/* Photo Upload */}
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Photo de l'article</label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="relative aspect-video bg-cinema-800 rounded-xl border-2 border-dashed border-cinema-700 hover:border-yellow-500/50 hover:bg-cinema-800/80 transition-all cursor-pointer flex flex-col items-center justify-center group overflow-hidden"
                        >
                            {photo ? (
                                <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <Camera className="h-10 w-10 text-slate-500 group-hover:text-yellow-500 transition-colors mb-2" />
                                    <span className="text-sm text-slate-400 group-hover:text-slate-200">Cliquez pour ajouter une photo</span>
                                </>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handlePhotoUpload}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nom de l'article</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Projecteur LED, Câble HDMI..."
                            className="w-full bg-cinema-800 border border-cinema-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none placeholder-slate-600"
                            required
                        />
                    </div>

                    {/* Prices */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Prix de vente (€)</label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isPriceTBD}
                                        onChange={(e) => {
                                            setIsPriceTBD(e.target.checked);
                                            if (e.target.checked) setPrice('');
                                        }}
                                        className="rounded bg-cinema-800 border-cinema-700 text-yellow-500 focus:ring-0 w-3 h-3"
                                    />
                                    <span className="text-[10px] text-slate-400">À définir</span>
                                </label>
                            </div>
                            <div className={`relative ${isPriceTBD ? 'opacity-50' : ''}`}>
                                <Euro className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    disabled={isPriceTBD}
                                    className="w-full bg-cinema-800 border border-cinema-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none placeholder-slate-600 disabled:cursor-not-allowed"
                                    placeholder={isPriceTBD ? "Prix à définir" : "0.00"}
                                    required={!isPriceTBD}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Prix d'achat (Optionnel)</label>
                            <div className="relative">
                                <Euro className="absolute left-3 top-3 h-5 w-5 text-slate-500" />
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={originalPrice}
                                    onChange={(e) => setOriginalPrice(e.target.value)}
                                    className="w-full bg-cinema-800 border border-cinema-700 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none placeholder-slate-600"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Commentaire / État</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full bg-cinema-800 border border-cinema-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 focus:outline-none placeholder-slate-600 resize-none"
                            placeholder="État de l'objet, raison de la vente..."
                        />
                    </div>

                    {/* Footer */}
                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-cinema-800 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={!name || (!price && !isPriceTBD)}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20 flex items-center gap-2"
                        >
                            <Tag className="h-4 w-4" />
                            Mettre en vente
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
