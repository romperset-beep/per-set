import React, { useState, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import { MessageSquare, Image as ImageIcon, Send, Heart, User, Clock, Trash2, Users, Lock, ChevronDown } from 'lucide-react'; // Added icons
import { SocialPost, Department } from '../types'; // Added Department

export const SocialFeed: React.FC = () => {
    const { socialPosts, addSocialPost, user, userProfiles } = useProject(); // Added userProfiles
    const [newPostContent, setNewPostContent] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Targeting State
    const [targetAudience, setTargetAudience] = useState<'GLOBAL' | 'DEPARTMENT' | 'USER'>('GLOBAL');
    const [targetDept, setTargetDept] = useState<Department | 'PRODUCTION'>('PRODUCTION');
    const [targetUserId, setTargetUserId] = useState<string>('');

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

                        // Resize logic: Max 1024px (increased slightly)
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

                        // Compress to JPEG 70% quality
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newPostContent.trim() && !photo) || isProcessing) return;

        const newPost: SocialPost = {
            id: `post_${Date.now()}`,
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
        setTargetAudience('GLOBAL'); // Reset to default
    };

    // Filter Posts Logic
    const visiblePosts = socialPosts.filter(post => {
        // 1. Global posts are visible to everyone
        if (!post.targetAudience || post.targetAudience === 'GLOBAL') return true;

        // 2. Department posts
        if (post.targetAudience === 'DEPARTMENT') {
            // Production sees everything
            if (user?.department === 'PRODUCTION' || user?.department === 'Régie') return true;
            // Target dept sees it
            if (post.targetDept === user?.department) return true;
            // Author sees it
            if (post.authorDepartment === user?.department) return true;
        }

        // 3. Private messages
        if (post.targetAudience === 'USER') {
            // Admin see everything
            if (user?.department === 'PRODUCTION') return true;
            // Recipient sees it
            const currentUserProfile = userProfiles.find(p => p.email === user?.email);
            if (post.targetUserId === currentUserProfile?.id) return true;

            // Author sees it
            if (post.authorName === user?.name) return true;
        }

        return false;
    });

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
                    <MessageSquare className="h-8 w-8 text-pink-500" />
                    Mur Social de l'Équipe
                </h2>
                <p className="text-slate-400">
                    Partagez des photos, des infos et des moments de vie du tournage.
                </p>
            </header>

            {/* Post Creation Form */}
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

                        {/* User Selector */}
                        {targetAudience === 'USER' && (
                            <select
                                value={targetUserId}
                                onChange={(e) => setTargetUserId(e.target.value)}
                                className="bg-cinema-900 text-white border border-cinema-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 outline-none animate-in fade-in slide-in-from-left-2"
                            >
                                <option value="">Choisir un destinataire...</option>
                                {userProfiles.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.firstName} {p.lastName} {p.department !== 'PRODUCTION' ? `(${p.department})` : ''}
                                    </option>
                                ))}
                            </select>
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

                            <div className="flex justify-between items-center pt-2 border-t border-cinema-700">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isProcessing}
                                    className="flex items-center gap-2 text-slate-400 hover:text-pink-400 transition-colors text-sm font-medium disabled:opacity-50"
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

                                <div className="flex items-center gap-2">
                                    {targetAudience !== 'GLOBAL' && (
                                        <span className="text-xs text-yellow-400 flex items-center gap-1 bg-yellow-400/10 px-2 py-1 rounded">
                                            <Lock className="h-3 w-3" />
                                            Message Privé
                                        </span>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={(!newPostContent.trim() && !photo) || isProcessing}
                                        className="bg-pink-600 hover:bg-pink-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-600/20"
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

            {/* Feed */}
            <div className="space-y-6">
                {visiblePosts.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-cinema-800/30 rounded-xl border border-cinema-700 border-dashed">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>Aucun message pour le moment. Soyez le premier à publier !</p>
                    </div>
                ) : (
                    visiblePosts.map(post => (
                        <div key={post.id} className={`bg-cinema-800 rounded-xl border ${post.targetAudience && post.targetAudience !== 'GLOBAL' ? 'border-yellow-500/50' : 'border-cinema-700'} overflow-hidden shadow-md hover:border-cinema-600 transition-colors`}>
                            <div className="p-6 space-y-4">
                                {/* Header */}
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-gradient-to-br from-pink-500 to-purple-600 h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                            {post.authorName.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold flex items-center gap-2">
                                                {post.authorName}
                                                {/* Audience Badge */}
                                                {post.targetAudience === 'DEPARTMENT' && (
                                                    <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full flex items-center gap-1 border border-yellow-500/30">
                                                        <Lock className="h-3 w-3" /> Privé: {post.targetDept}
                                                    </span>
                                                )}
                                                {post.targetAudience === 'USER' && (
                                                    <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full flex items-center gap-1 border border-yellow-500/30">
                                                        <Lock className="h-3 w-3" /> Privé: DM
                                                    </span>
                                                )}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <span className="bg-cinema-700 px-2 py-0.5 rounded text-slate-300">{post.authorDepartment}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="text-slate-200 whitespace-pre-wrap pl-14">
                                    {post.content}
                                </div>

                                {/* Photo */}
                                {post.photo && (
                                    <div className="pl-14">
                                        <img
                                            src={post.photo}
                                            alt="Post attachment"
                                            className="rounded-lg max-h-96 w-auto object-cover border border-cinema-700"
                                        />
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="pl-14 pt-2 flex items-center gap-4">
                                    <button className="flex items-center gap-1.5 text-slate-500 hover:text-pink-500 transition-colors text-sm group">
                                        <Heart className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                        <span>J'aime</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
