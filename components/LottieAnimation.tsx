import React, { useEffect, useState } from 'react';
import Lottie from 'lottie-react';
// import { Loader2 } from 'lucide-react'; // Optional loader

interface LottieAnimationProps {
    url?: string;
    animationData?: Record<string, unknown>;
    className?: string;
    loop?: boolean;
    autoplay?: boolean;
}

export const LottieAnimation: React.FC<LottieAnimationProps> = ({
    url,
    animationData: initialData,
    className = "h-64 w-64",
    loop = true,
    autoplay = true
}) => {
    const [animationData, setAnimationData] = useState<Record<string, unknown> | undefined>(initialData);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (url && !initialData) {
            fetch(url)
                .then(response => {
                    if (!response.ok) throw new Error('Failed to load animation');
                    return response.json();
                })
                .then(data => setAnimationData(data))
                .catch(err => {
                    console.error("Lottie Load Error:", err);
                    setError(true);
                });
        }
    }, [url, initialData]);

    if (error) return <div className="text-red-500 text-xs text-center p-4">Animation Failed</div>;
    if (!animationData) return <div className={`${className} bg-white/5 animate-pulse rounded-full`}></div>;

    return (
        <div className={className}>
            <Lottie
                animationData={animationData}
                loop={loop}
                autoplay={autoplay}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};
