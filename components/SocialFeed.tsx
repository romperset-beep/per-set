import React, { useState, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import { MessageSquare, Image as ImageIcon, Send, Heart, User, Clock, Trash2, Users, Lock, ChevronDown } from 'lucide-react'; // Added icons
import { SocialPost, Department } from '../types'; // Added Department

export const SocialFeed: React.FC = () => {
    const { socialPosts, addSocialPost, deleteSocialPost, user, userProfiles } = useProject(); // Added deleteSocialPost
    const [newPostContent, setNewPostContent] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Targeting State
    const [targetAudience, setTargetAudience] = useState<'GLOBAL' | 'DEPARTMENT' | 'USER'>('GLOBAL');
    const [targetDept, setTargetDept] = useState<Department | 'PRODUCTION'>('PRODUCTION');
    const [targetUserId, setTargetUserId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState(''); // Added for search input
    const [showSuggestions, setShowSuggestions] = useState(false);

    const [showGallery, setShowGallery] = useState(false); // Toggle for Gallery Mode

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        // ... (existing resize logic preserved)
        // Note: For brevity in this diff, assuming unchanged existing helper functions 
        // are preserved. But wait, I must preserve previous code EXACTLY or use `replace_file_content` block correctly.
        // Actually, I can insert the state at line 18. And then replace the whole return block to include new UI.

        // Let's do a larger replace to be safe and clean.
        // Re-implementing handlePhotoUpload to be sure (it was long). 
        // BETTER STRATEGY: Use MULTI_REPLACE or be very careful. 
        // The user wants me to edit the file. I will look at the previous content again.
        // It's safer to just replace the whole file content or large chunks if I am confident.
        // I will replace the component body.

        const file = e.target.files?.[0];
        if (file) {
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

    // Filter suggestions locally
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

    // Filter Posts Logic (Security + Channel View)
    const visiblePosts = socialPosts.filter(post => {
        // 1. SECURITY FILTER (Can I see this?)
        let allowed = false;

        // Global posts -> Everyone
        if (!post.targetAudience || post.targetAudience === 'GLOBAL') allowed = true;

        // Department posts -> Members of Dept + Prod + Author
        else if (post.targetAudience === 'DEPARTMENT') {
            if (user?.department === 'PRODUCTION' || user?.department === 'Régie') allowed = true;
            else if (post.targetDept === user?.department) allowed = true;
            else if (post.authorDepartment === user?.department) allowed = true;
        }

        // Private DMs -> Sender + Recipient + Admin
        else if (post.targetAudience === 'USER') {
            if (user?.department === 'PRODUCTION') allowed = true;
            const myProfile = userProfiles.find(p => p.email === user?.email);
            // Recipient is me
            if (post.targetUserId === myProfile?.id) allowed = true;
            // Sender is me (check via ID or Name backup)
            if (post.authorId === myProfile?.id) allowed = true;
            else if (!post.authorId && post.authorName === user?.name) allowed = true; // Legacy fallback
        }

        if (!allowed) return false;

        // 2. CHANNEL VIEW FILTER (Does it match my current selection scope?)
        if (targetAudience === 'GLOBAL') {
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
                <div className="flex items-center justify-between">
                    <div></div>
                    <h2 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
                        <MessageSquare className="h-8 w-8 text-pink-500" />
                        Mur Social
                    </h2>
                    <button
                        onClick={() => setShowGallery(!showGallery)}
                        className={`p-2 rounded-lg transition-colors ${showGallery ? 'bg-pink-600 text-white' : 'bg-cinema-800 text-slate-400 hover:text-white'}`}
                        title={showGallery ? "Voir la discussion" : "Voir la galerie photo"}
                    >
                        {showGallery ? <MessageSquare className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
                    </button>
                </div>

                {showGallery ? (
                    <div className="bg-pink-600/10 text-pink-400 px-4 py-2 rounded-lg text-sm inline-block">
                        📸 Mode Galerie : {galleryPhotos.length} photo(s)
                    </div>
                ) : (
                    <p className="text-slate-400">
                        Partagez des photos, des infos et des moments de vie du tournage.
                    </p>
                )}
            </header>

            {/* Post Creation Form (Hidden in Gallery Mode) */}
            {!showGallery && (
                <div className="bg-cinema-800 rounded-xl p-6 border border-cinema-700 shadow-lg">
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Audience Selector */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <select
                                value={targetAudience}
                                onChange={(e) => setTargetAudience(e.target.value as any)}
                                className="bg-cinema-900 text-white border border-cinema-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 outline-none"
                            >
                                <option value="GLOBAL">🌏 Toute l'équipe</option>
                                <option value="DEPARTMENT">🏢 Un Département</option>
                                <option value="USER">👤 Une Personne</option>
                            </select>

                            {/* Department Selector */}
                            {targetAudience === 'DEPARTMENT' && (
                                <select
                                    value={targetDept}
                                    onChange={(e) => setTargetDept(e.target.value as any)}
                                    className="bg-cinema-900 text-white border border-cinema-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 outline-none animate-in fade-in slide-in-from-left-2"
                                >
                                    {Object.values(Department).map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                    <option value="PRODUCTION">Production</option>
                                </select>
                            )}

                            {/* User Selector (Searchable) */}
                            {targetAudience === 'USER' && (
                                <div className="relative animate-in fade-in slide-in-from-left-2 w-64 z-20">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Rechercher une personne..."
                                            className="w-full bg-cinema-900 text-white border border-cinema-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 outline-none pl-8"
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                setTargetUserId(''); // Clear ID when typing
                                                setShowSuggestions(true);
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                        />
                                        <User className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                                    </div>

                                    {/* Suggestions Dropdown */}
                                    {showSuggestions && searchTerm && (
                                        <div className="absolute top-full left-0 w-full mt-1 bg-cinema-800 border border-cinema-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                                            {filteredUsers.length > 0 ? (
                                                filteredUsers.map(p => (
                                                    <button
                                                        key={p.id}
                                                        type="button"
                                                        onClick={() => handleUserSelect({
                                                            id: p.id,
                                                            name: `${p.firstName} ${p.lastName}`
                                                        })}
                                                        className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-cinema-700 hover:text-white transition-colors flex items-center gap-2 border-b border-cinema-700/50 last:border-0"
                                                    >
                                                        <div className="bg-cinema-900 h-6 w-6 rounded-full flex items-center justify-center text-xs">
                                                            {p.firstName.charAt(0)}
                                                        </div>
                                                        <span>{p.firstName} {p.lastName}</span>
                                                        {p.department !== 'PRODUCTION' && (
                                                            <span className="text-xs text-slate-500 ml-auto">{p.department}</span>
                                                        )}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-3 py-2 text-sm text-slate-500 text-center">
                                                    Aucun résultat
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <div className="bg-cinema-700 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="h-6 w-6 text-slate-400" />
                            </div>
                            <div className="flex-1 space-y-4">
                                <textarea
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                    placeholder={`Quoi de neuf, ${user?.name.split(' ')[0]} ?`}
                                    className="w-full bg-cinema-900 border border-cinema-700 rounded-lg p-4 text-white focus:ring-2 focus:ring-pink-500 focus:outline-none resize-none min-h-[100px]"
                                />

                                {isProcessing && (
                                    <div className="text-pink-400 text-sm flex items-center gap-2 animate-pulse">
                                        <ImageIcon className="h-4 w-4" />
                                        Traitement de l'image en cours...
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
                                        Ajouter une photo
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
                                                Message Privé
                                            </span>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={(!newPostContent.trim() && !photo) || isProcessing}
                                            className="bg-pink-600 hover:bg-pink-500 text-white px-6 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-600/20"
                                        >
                                            <Send className="h-4 w-4" />
                                            Publier
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
                            <p>Aucune photo dans cette conversation.</p>
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
                            <p>Aucun message pour le moment. Soyez le premier à publier !</p>
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
                                                    {new Date(post.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {post.likes > 0 && (
                                                    <span className="flex items-center gap-0.5">
                                                        <Heart className="h-3 w-3 fill-current text-pink-500" /> {post.likes}
                                                    </span>
                                                )}
                                                {(isMe || user?.department === 'PRODUCTION') && (
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm("Supprimer ce message ?")) {
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
