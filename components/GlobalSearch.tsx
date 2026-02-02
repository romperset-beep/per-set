import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Package, MessageSquare, Bell, FileText, Loader2 } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { useSocial } from '../context/SocialContext';
import { useNotification } from '../context/NotificationContext';

interface SearchResult {
    id: string;
    type: 'item' | 'post' | 'notification';
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    onClick: () => void;
}

interface GlobalSearchProps {
    onClose: () => void;
    onNavigate: (tab: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onClose, onNavigate }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const { project } = useProject();
    const { socialPosts } = useSocial();
    const { notifications } = useNotification();

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Perform search with debounce
    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        const timer = setTimeout(() => {
            performSearch(query);
            setIsSearching(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [query, project.items, socialPosts, notifications]);

    const performSearch = (searchQuery: string) => {
        const lowerQuery = searchQuery.toLowerCase();
        const searchResults: SearchResult[] = [];

        // Search in inventory items
        project.items?.forEach(item => {
            const itemCategory = (item as any).category || '';
            if (
                item.name.toLowerCase().includes(lowerQuery) ||
                itemCategory.toLowerCase().includes(lowerQuery) ||
                item.department?.toLowerCase().includes(lowerQuery)
            ) {
                searchResults.push({
                    id: item.id,
                    type: 'item',
                    title: item.name,
                    subtitle: `${item.department} • ${itemCategory || 'Sans catégorie'}`,
                    icon: <Package size={18} className="text-eco-400" />,
                    onClick: () => {
                        onNavigate('inventory');
                        onClose();
                    },
                });
            }
        });

        // Search in social posts
        socialPosts?.forEach(post => {
            if (
                post.content.toLowerCase().includes(lowerQuery) ||
                post.authorId?.toLowerCase().includes(lowerQuery)
            ) {
                searchResults.push({
                    id: post.id,
                    type: 'post',
                    title: post.content.substring(0, 60) + (post.content.length > 60 ? '...' : ''),
                    subtitle: `Par ${post.authorId}`,
                    icon: <MessageSquare size={18} className="text-pink-400" />,
                    onClick: () => {
                        onNavigate('social');
                        onClose();
                    },
                });
            }
        });

        // Search in notifications
        notifications?.forEach(notif => {
            if (notif.message.toLowerCase().includes(lowerQuery)) {
                searchResults.push({
                    id: notif.id,
                    type: 'notification',
                    title: notif.message,
                    subtitle: new Date(notif.date).toLocaleDateString('fr-FR'),
                    icon: <Bell size={18} className="text-blue-400" />,
                    onClick: () => {
                        onClose();
                    },
                });
            }
        });

        // Limit to 10 results
        setResults(searchResults.slice(0, 10));
        setSelectedIndex(0);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter' && results[selectedIndex]) {
                e.preventDefault();
                results[selectedIndex].onClick();
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [results, selectedIndex, onClose]);

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-20 px-4"
            onClick={onClose}
        >
            <div
                className="bg-cinema-800 rounded-xl w-full max-w-2xl shadow-2xl border border-cinema-700"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 p-4 border-b border-cinema-700">
                    <Search size={20} className="text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Rechercher dans l'inventaire, posts, notifications..."
                        className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-lg"
                    />
                    {isSearching && <Loader2 size={18} className="text-slate-400 animate-spin" />}
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto">
                    {query.length < 2 ? (
                        <div className="p-8 text-center text-slate-500">
                            <Search size={48} className="mx-auto mb-3 opacity-30" />
                            <p>Tapez au moins 2 caractères pour rechercher</p>
                            <p className="text-sm mt-2 text-slate-600">
                                Inventaire • Posts sociaux • Notifications
                            </p>
                        </div>
                    ) : results.length === 0 && !isSearching ? (
                        <div className="p-8 text-center text-slate-500">
                            <FileText size={48} className="mx-auto mb-3 opacity-30" />
                            <p>Aucun résultat pour "{query}"</p>
                        </div>
                    ) : (
                        <div className="py-2">
                            {results.map((result, index) => (
                                <button
                                    key={result.id}
                                    onClick={result.onClick}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${index === selectedIndex
                                        ? 'bg-cinema-700 border-l-2 border-eco-400'
                                        : 'hover:bg-cinema-700/50'
                                        }`}
                                >
                                    <div className="flex-shrink-0">{result.icon}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium truncate">{result.title}</p>
                                        {result.subtitle && (
                                            <p className="text-slate-400 text-sm truncate">{result.subtitle}</p>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider">
                                        {result.type === 'item' ? 'Article' : result.type === 'post' ? 'Post' : 'Notif'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Hints */}
                <div className="px-4 py-3 border-t border-cinema-700 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex gap-4">
                        <span>↑↓ Naviguer</span>
                        <span>↵ Sélectionner</span>
                        <span>Esc Fermer</span>
                    </div>
                    <span>{results.length} résultat{results.length !== 1 ? 's' : ''}</span>
                </div>
            </div>
        </div>
    );
};
