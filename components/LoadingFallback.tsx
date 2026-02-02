import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingFallbackProps {
    message?: string;
    fullScreen?: boolean;
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
    message = 'Chargement...',
    fullScreen = false
}) => {
    if (fullScreen) {
        return (
            <div className="min-h-screen bg-cinema-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 text-eco-400 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 text-sm">{message}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center p-12">
            <div className="text-center">
                <Loader2 className="h-8 w-8 text-eco-400 animate-spin mx-auto mb-3" />
                <p className="text-slate-400 text-sm">{message}</p>
            </div>
        </div>
    );
};

// Skeleton variant for more sophisticated loading states
export const SkeletonLoader: React.FC = () => {
    return (
        <div className="animate-pulse space-y-4 p-6">
            <div className="h-8 bg-cinema-700 rounded w-1/3"></div>
            <div className="space-y-3">
                <div className="h-4 bg-cinema-700 rounded"></div>
                <div className="h-4 bg-cinema-700 rounded w-5/6"></div>
                <div className="h-4 bg-cinema-700 rounded w-4/6"></div>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="h-24 bg-cinema-700 rounded"></div>
                <div className="h-24 bg-cinema-700 rounded"></div>
                <div className="h-24 bg-cinema-700 rounded"></div>
            </div>
        </div>
    );
};
