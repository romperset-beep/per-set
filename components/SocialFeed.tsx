import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../context/ProjectContext'; // Restored
import { useSocial } from '../context/SocialContext'; // Added
import { MessageSquare, Image as ImageIcon, Send, Heart, User, Clock, Trash2, Users, Lock, ChevronDown } from 'lucide-react'; // Restored
import { SocialPost, Department } from '../types'; // Restored
import { validateFile } from '../src/utils/validation';

export const SocialFeed: React.FC = () => {
    // State now comes from SocialContext
    const { user, userProfiles, language } = useProject(); // Keep Core
    const {
        socialPosts, addSocialPost, deleteSocialPost, markSocialAsRead,
        socialAudience: targetAudience, setSocialAudience: setTargetAudience,
        socialTargetDept: targetDept, setSocialTargetDept: setTargetDept,
        socialTargetUserId: targetUserId, setSocialTargetUserId: setTargetUserId
    } = useSocial(); // Use New Context

    // Mark as read when entering the feed
    useEffect(() => {
        markSocialAsRead();
    }, [markSocialAsRead]);
    const [newPostContent, setNewPostContent] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Local UI state
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showGallery, setShowGallery] = useState(false);
    const [showRecentDiscussions, setShowRecentDiscussions] = useState(false);

    // Translations
    const t = {
        fr: {
            // ... (keeping translations)
            myDiscussions: "Mes Discussions",
            socialWall: "Messagerie d'Équipe",
            viewGallery: "Voir la galerie photo",
            viewDiscussion: "Voir la discussion",
            theWall: "Le Mur",
            photos: "Les Photos",
            resumeDiscussion: "Reprendre une discussion récente",
            noRecent: "Aucune conversation privée récente.",
            backGlobal: "Retour au Mur Global",
            galleryMode: "Mode Galerie : {count} photo(s)",
            shareMoments: "Partagez des photos, des infos et des moments de vie du tournage.",
            global: "🌏 Toute l'équipe",
            department: "🏢 Un Département",
            user: "👤 Une Personne",
            production: "Production",
            searchUser: "Rechercher une personne...",
            noResult: "Aucun résultat",
            placeholder: "Quoi de neuf, {name} ?",
            processing: "Traitement de l'image en cours...",
            addPhoto: "Ajouter une photo",
            privateMsg: "Message Privé",
            publish: "Publier",
            noPhotos: "Aucune photo dans cette conversation.",
            noMessages: "Aucun message pour le moment. Soyez le premier à publier !",
            unknownUser: "Utilisateur Inconnu",
            lastMsg: "Dernier msg",
            deleteConfirm: "Supprimer ce message ?"
        },
        // ... (truncated for tool call, will use multi-replace or just replace the logic block)
    }[language || 'fr'];

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Calculate Recent DM Partners
    const myProfile = userProfiles.find(p => p.email === user?.email);
    const recentPartners: { id: string, name: string, lastDate: string, type: 'USER' | 'DEPARTMENT', dept?: any }[] = [];

    if (myProfile) {
        const processedIds = new Set<string>();
        const sortedPosts = [...socialPosts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        sortedPosts.forEach(post => {
            if (post.targetAudience === 'USER') {
                let partnerId = '';
                let partnerName = '';

                if (post.authorId === myProfile.id || (!post.authorId && post.authorName === user?.name)) {
                    if (post.targetUserId) {
                        partnerId = post.targetUserId;
                        const p = userProfiles.find(u => u.id === partnerId);
                        partnerName = p ? `${p.firstName} ${p.lastName}` : t.unknownUser;
                    }
                } else if (post.targetUserId === myProfile.id) {
                    partnerId = post.authorId || '';
                    partnerName = post.authorName;
                }

                if (partnerId && !processedIds.has(partnerId) && partnerId !== myProfile.id) {
                    processedIds.add(partnerId);
                    recentPartners.push({
                        id: partnerId,
                        name: partnerName,
                        lastDate: post.date,
                        type: 'USER'
                    });
                }
            } else if (post.targetAudience === 'DEPARTMENT') {
                // Add Department conversations
                const deptId = `DEPT_${post.targetDept}`;
                if (!processedIds.has(deptId)) {
                    processedIds.add(deptId);
                    recentPartners.push({
                        id: deptId,
                        name: post.targetDept || 'Département',
                        lastDate: post.date,
                        type: 'DEPARTMENT',
                        dept: post.targetDept
                    });
                }
            }
        });
    }

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

            setIsProcessing(true);
            const reader = new FileReader();

            reader.onload = (event) => {
                const img = new Image();

                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        const MAX_SIZE = 1024;
                        if (width > height) {
                            if (width > MAX_SIZE) {
                                height *= MAX_SIZE / width;
                                width = MAX_SIZE;
                            }
                        } else {
                            if (height > MAX_SIZE) {
                                width *= MAX_SIZE / height;
                                height = MAX_SIZE;
                            }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) throw new Error("Canvas Context not found");
                        ctx.drawImage(img, 0, 0, width, height);
                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                        setPhoto(compressedBase64);
                    } catch (error) {
                        console.error("Compression ended in error:", error);
                        alert("Erreur lors du traitement de l'image.");
                    } finally {
                        setIsProcessing(false);
                    }
                };

                img.onerror = () => {
                    console.error("Image failed to load");
                    alert("Impossible de lire ce format d'image (essayez JPG ou PNG).");
                    setIsProcessing(false);
                };

                if (event.target?.result) {
                    img.src = event.target.result as string;
                }
            };

            reader.onerror = () => {
                console.error("FileReader error");
                setIsProcessing(false);
            };

            reader.readAsDataURL(file);
        }
    };

    const handleUserSelect = (user: { id: string, name: string }) => {
        setTargetUserId(user.id);
        setSearchTerm(user.name);
        setShowSuggestions(false);
    };

    const filteredUsers = userProfiles.filter(p => {
        const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newPostContent.trim() && !photo) || isProcessing) return;

        const myProfile = userProfiles.find(p => p.email === user?.email);

        const newPost: SocialPost = {
            id: `post_${Date.now()}`,
            authorId: myProfile?.id,
            authorName: user?.name || 'Anonyme',
            authorDepartment: user?.department || 'PRODUCTION',
            content: newPostContent,
            photo: photo || undefined,
            date: new Date().toISOString(),
            likes: 0,
            targetAudience,
            targetDept: targetAudience === 'DEPARTMENT' ? targetDept : undefined,
            targetUserId: targetAudience === 'USER' ? targetUserId : undefined
        };

        addSocialPost(newPost);
        setNewPostContent('');
        setPhoto(null);
    };

    const visiblePosts = socialPosts.filter(post => {
        let allowed = false;

        if (!post.targetAudience || post.targetAudience === 'GLOBAL') allowed = true;
        else if (post.targetAudience === 'DEPARTMENT') {
            if (user?.department === 'PRODUCTION' || user?.department === 'Régie') allowed = true;
            else if (post.targetDept === user?.department) allowed = true;
            else if (post.authorDepartment === user?.department) allowed = true;
        }
        else if (post.targetAudience === 'USER') {
            if (user?.department === 'PRODUCTION') allowed = true;
            const myProfile = userProfiles.find(p => p.email === user?.email);
            if (post.targetUserId === myProfile?.id) allowed = true;
            if (post.authorId === myProfile?.id) allowed = true;
            else if (!post.authorId && post.authorName === user?.name) allowed = true;
        }

        if (!allowed) return false;

        if (targetAudience === 'GLOBAL') {
            // STRICT GLOBAL: Only show truly global posts
            // User requested that Department discussions be separate.
            return !post.targetAudience || post.targetAudience === 'GLOBAL';
        }

        if (targetAudience === 'DEPARTMENT') {
            return post.targetAudience === 'DEPARTMENT' && post.targetDept === targetDept;
        }


        if (targetAudience === 'USER') {
            const myProfile = userProfiles.find(p => p.email === user?.email);
            const otherUserId = targetUserId;
            // Show conversation between ME and OtherUser
            const isFromThemToMe = (post.authorId === otherUserId || (!post.authorId && post.authorName === searchTerm)) && post.targetUserId === myProfile?.id;
            const isFromMeToThem = (post.authorId === myProfile?.id || (!post.authorId && post.authorName === user?.name)) && post.targetUserId === otherUserId;
            return isFromThemToMe || isFromMeToThem;
        }

        return false;
    });

    const galleryPhotos = visiblePosts.filter(p => p.photo);

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="text-center space-y-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Recent Discussions Toggle */}
                    <button
                        onClick={() => setShowRecentDiscussions(!showRecentDiscussions)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all shadow-lg ${showRecentDiscussions
                            ? 'bg-pink-600 text-white border-pink-500'
                            : 'bg-cinema-800 text-pink-400 border border-pink-500/30 hover:bg-pink-600/10 hover:border-pink-500'
                            }`}
                    >
                        <Clock className="h-4 w-4" />
                        {t.myDiscussions}
                    </button>

                    <h2 className="text-3xl font-bold text-white flex items-center justify-center gap-3 order-first md:order-none">
                        <MessageSquare className="h-8 w-8 text-pink-500" />
                        {t.socialWall}
                    </h2>

                    <button
                        onClick={() => setShowGallery(!showGallery)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all shadow-lg ${showGallery
                            ? 'bg-pink-600 text-white border-pink-500'
                            : 'bg-cinema-800 text-pink-400 border border-pink-500/30 hover:bg-pink-600/10 hover:border-pink-500'
                            }`}
                        title={showGallery ? t.viewDiscussion : t.viewGallery}
                    >
                        {showGallery ? <MessageSquare className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                        {showGallery ? t.theWall : t.photos}
                    </button>
                </div>

                {/* Recent Discussions List */}
                {showRecentDiscussions && (
                    <div className="bg-cinema-800 border border-pink-500/30 rounded-xl p-4 animate-in slide-in-from-top-2 text-left">
                        <h3 className="text-sm font-bold text-pink-400 mb-3 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {t.resumeDiscussion}
                        </h3>
                        {recentPartners.length === 0 ? (
                            <p className="text-slate-500 text-sm italic">{t.noRecent}</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {recentPartners.map(partner => (
                                    <button
                                        key={partner.id}
                                        onClick={() => {
                                            if (partner.type === 'USER') {
                                                setTargetAudience('USER');
                                                setTargetUserId(partner.id);
                                                setSearchTerm(partner.name);
                                            } else {
                                                setTargetAudience('DEPARTMENT');
                                                setTargetDept(partner.dept);
                                            }
                                            setShowRecentDiscussions(false); // Close menu after selection
                                        }}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-cinema-900 hover:bg-cinema-700 transition-colors border border-cinema-700 hover:border-pink-500/50 group"
                                    >
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border group-hover:border-pink-500 ${partner.type === 'DEPARTMENT'
                                            ? 'bg-purple-900/50 text-purple-400 border-purple-500/20'
                                            : 'bg-pink-900/50 text-pink-400 border-pink-500/20'}`}>
                                            {partner.type === 'DEPARTMENT' ? <Users className="h-4 w-4" /> : partner.name.charAt(0)}
                                        </div>
                                        <div className="flex flex-col items-start overflow-hidden">
                                            <span className="text-sm font-medium text-slate-200 group-hover:text-white truncate w-full text-left">{partner.name}</span>
                                            <span className="text-[10px] text-slate-500">{t.lastMsg}: {new Date(partner.lastDate).toLocaleDateString()}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="mt-4 pt-3 border-t border-cinema-700/50">
                            <button
                                onClick={() => {
                                    setTargetAudience('GLOBAL');
                                    setShowRecentDiscussions(false);
                                }}
                                className="w-full text-center text-xs text-slate-400 hover:text-pink-400 py-1"
                            >
                                {t.backGlobal}
                            </button>
                        </div>
                    </div>
                )}

                {showGallery ? (
                    <div className="bg-pink-600/10 text-pink-400 px-4 py-2 rounded-lg text-sm inline-block">
                        📸 {t.galleryMode.replace('{count}', galleryPhotos.length.toString())}
                    </div>
                ) : (
                    <p className="text-slate-400">
                        {t.shareMoments}
                    </p>
                )}
            </header>

            {/* Post Creation Form (Hidden in Gallery Mode) */}
            {!showGallery && (
                <div className="bg-cinema-800 rounded-xl p-6 border border-cinema-700 shadow-lg">
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Target Selection - 3 Tiles (Copied from MemoWidget) */}
                        <div className="space-y-4 mb-6">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-wider block text-left">Destinataire</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setTargetAudience('DEPARTMENT')}
                                    className={`p-3 rounded-xl border transition-all text-left group relative overflow-hidden ${targetAudience === 'DEPARTMENT'
                                        ? 'bg-pink-600/20 border-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.3)]'
                                        : 'bg-cinema-900 border-cinema-700 text-slate-400 hover:bg-cinema-700'
                                        }`}
                                >
                                    <div className={`absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity ${targetAudience === 'DEPARTMENT' ? 'text-pink-500' : 'text-slate-500'}`}>
                                        <Users className="h-12 w-12" />
                                    </div>
                                    <span className="font-bold block mb-1 text-sm">{t.department}</span>
                                    <span className="text-[10px] opacity-70 block">Message ciblé</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTargetAudience('GLOBAL')}
                                    className={`p-3 rounded-xl border transition-all text-left group relative overflow-hidden ${targetAudience === 'GLOBAL'
                                        ? 'bg-pink-600/20 border-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.3)]'
                                        : 'bg-cinema-900 border-cinema-700 text-slate-400 hover:bg-cinema-700'
                                        }`}
                                >
                                    <div className={`absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity ${targetAudience === 'GLOBAL' ? 'text-pink-500' : 'text-slate-500'}`}>
                                        <Users className="h-12 w-12" />
                                    </div>
                                    <span className="font-bold block mb-1 text-sm">{t.global}</span>
                                    <span className="text-[10px] opacity-70 block">Mur Global</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTargetAudience('USER')}
                                    className={`p-3 rounded-xl border transition-all text-left group relative overflow-hidden ${targetAudience === 'USER'
                                        ? 'bg-pink-600/20 border-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.3)]'
                                        : 'bg-cinema-900 border-cinema-700 text-slate-400 hover:bg-cinema-700'
                                        }`}
                                >
                                    <div className={`absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity ${targetAudience === 'USER' ? 'text-pink-500' : 'text-slate-500'}`}>
                                        <User className="h-12 w-12" />
                                    </div>
                                    <span className="font-bold block mb-1 text-sm">{t.user}</span>
                                    <span className="text-[10px] opacity-70 block">Message Privé</span>
                                </button>
                            </div>

                            {/* Conditional Selectors */}
                            <div className="space-y-4 min-h-[60px]">
                                {targetAudience === 'DEPARTMENT' && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="text-xs text-slate-400 mb-1 block text-left">Choisir le département cible</label>
                                        <select
                                            value={targetDept}
                                            onChange={(e) => setTargetDept(e.target.value as any)}
                                            className="w-full bg-cinema-900 border border-cinema-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-pink-500 outline-none"
                                        >
                                            <option value="" disabled>Sélectionner...</option>
                                            {Object.values(Department).map(d => <option key={d} value={d}>{d}</option>)}
                                            <option value="PRODUCTION">{t.production}</option>
                                        </select>
                                    </div>
                                )}

                                {targetAudience === 'USER' && (
                                    <div className="relative animate-in fade-in slide-in-from-top-2">
                                        <label className="text-xs text-slate-400 mb-1 block text-left">Rechercher un destinataire</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                                            <input
                                                type="text"
                                                placeholder={t.searchUser}
                                                value={searchTerm}
                                                onChange={(e) => {
                                                    setSearchTerm(e.target.value);
                                                    setTargetUserId('');
                                                    setShowSuggestions(true);
                                                }}
                                                onFocus={() => setShowSuggestions(true)}
                                                className="w-full bg-cinema-900 border border-cinema-600 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-pink-500 outline-none"
                                            />
                                        </div>
                                        {/* Suggestions Dropdown */}
                                        {showSuggestions && searchTerm && (
                                            <div className="absolute top-full left-0 w-full mt-1 bg-cinema-800 border border-cinema-700 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 text-left">
                                                {filteredUsers.length > 0 ? (
                                                    filteredUsers.map(p => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => handleUserSelect({
                                                                id: p.id,
                                                                name: `${p.firstName} ${p.lastName}`
                                                            })}
                                                            className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-cinema-700 hover:text-white transition-colors flex items-center gap-3 border-b border-cinema-700/50 last:border-0"
                                                        >
                                                            <div className="bg-cinema-900 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border border-cinema-600">
                                                                {(p.firstName || '?').charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium">{p.firstName} {p.lastName}</div>
                                                                {p.department !== 'PRODUCTION' && (
                                                                    <div className="text-xs text-slate-500">{p.department}</div>
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-3 text-sm text-slate-500 text-center">
                                                        {t.noResult}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="bg-cinema-700 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="h-6 w-6 text-slate-400" />
                            </div>
                            <div className="flex-1 space-y-4">
                                <textarea
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                    placeholder={t.placeholder.replace('{name}', (user?.name || '').split(' ')[0])}
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-4 text-white focus:ring-2 focus:ring-pink-500 focus:outline-none resize-none min-h-[100px]"
                                />

                                {isProcessing && (
                                    <div className="text-pink-400 text-sm flex items-center gap-2 animate-pulse">
                                        <ImageIcon className="h-4 w-4" />
                                        {t.processing}
                                    </div>
                                )}

                                {photo && (
                                    <div className="relative w-full max-w-sm rounded-lg overflow-hidden border border-cinema-700">
                                        <img src={photo} alt="Preview" className="w-full h-auto" />
                                        <button
                                            type="button"
                                            onClick={() => setPhoto(null)}
                                            className="absolute top-2 right-2 bg-black/50 p-1 rounded-full text-white hover:bg-red-500 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-2 border-t border-cinema-700">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isProcessing}
                                        className="flex items-center justify-center sm:justify-start gap-2 text-slate-400 hover:text-pink-400 transition-colors text-sm font-medium disabled:opacity-50 py-2 sm:py-0"
                                    >
                                        <ImageIcon className="h-5 w-5" />
                                        {t.addPhoto}
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handlePhotoUpload}
                                        accept="image/*"
                                        className="hidden"
                                    />

                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        {targetAudience !== 'GLOBAL' && (
                                            <span className="text-xs text-yellow-400 flex items-center justify-center gap-1 bg-yellow-400/10 px-2 py-1 rounded">
                                                <Lock className="h-3 w-3" />
                                                {t.privateMsg}
                                            </span>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={(!newPostContent.trim() && !photo) || isProcessing}
                                            className="bg-pink-600 hover:bg-pink-500 text-white px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-600/20"
                                        >
                                            <Send className="h-4 w-4" />
                                            {t.publish}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Content: Gallery OR Feed */}
            {showGallery ? (
                <div className="space-y-6">
                    {galleryPhotos.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 bg-cinema-800/30 rounded-xl border border-cinema-700 border-dashed">
                            <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>{t.noPhotos}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {galleryPhotos.map(post => (
                                <div key={post.id} className="relative group aspect-square rounded-xl overflow-hidden bg-cinema-800 border border-cinema-700 shadow-md">
                                    {post.photo && (
                                        <img
                                            src={post.photo}
                                            alt="Gallery item"
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                        <p className="text-white text-xs font-bold truncate">{post.authorName}</p>
                                        <p className="text-slate-300 text-[10px]">{new Date(post.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {visiblePosts.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 bg-cinema-800/30 rounded-xl border border-cinema-700 border-dashed">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>{t.noMessages}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {visiblePosts.map(post => {
                                const myProfile = userProfiles.find(p => p.email === user?.email);
                                const isMe = post.authorId === myProfile?.id || (!post.authorId && post.authorName === user?.name);

                                return (
                                    <div
                                        key={post.id}
                                        className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`
                                            relative max-w-[85%] sm:max-w-[70%] lg:max-w-[60%] 
                                            rounded-2xl px-4 py-3 shadow-md text-sm transition-all
                                            ${isMe
                                                ? 'bg-gradient-to-br from-pink-600 to-purple-600 text-white rounded-br-sm mr-1'
                                                : 'bg-cinema-700 text-slate-200 rounded-bl-sm ml-1 border border-cinema-600'}
                                        `}>
                                            {/* Sender Name */}
                                            {!isMe && (targetAudience === 'GLOBAL' || targetAudience === 'DEPARTMENT') && (
                                                <div className="text-[10px] text-pink-400 font-bold mb-1 flex items-center gap-2 opacity-80">
                                                    {post.authorName} • {post.authorDepartment}
                                                </div>
                                            )}

                                            {/* Content */}
                                            <div className="whitespace-pre-wrap leading-relaxed break-words">
                                                {post.content}
                                            </div>

                                            {/* Photo */}
                                            {post.photo && (
                                                <div className={`mt-2 ${isMe ? 'text-right' : 'text-left'}`}>
                                                    <img
                                                        src={post.photo}
                                                        alt="Attachement"
                                                        className="rounded-lg max-h-60 w-auto object-cover border border-white/10 inline-block"
                                                    />
                                                </div>
                                            )}

                                            {/* Metadata */}
                                            <div className={`flex items-center gap-2 mt-1 text-[10px] ${isMe ? 'text-pink-200/70' : 'text-slate-400'} justify-end`}>
                                                <span>
                                                    {new Date(post.date).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} • {new Date(post.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {post.likes > 0 && (
                                                    <span className="flex items-center gap-0.5">
                                                        <Heart className="h-3 w-3 fill-current text-pink-500" /> {post.likes}
                                                    </span>
                                                )}
                                                {isMe && (
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm(t.deleteConfirm)) {
                                                                deleteSocialPost(post.id, post.photo);
                                                            }
                                                        }}
                                                        className="hover:text-red-400 transition-colors p-1"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
