import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768; // Standard tablet/mobile breakpoint

export const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState<boolean>(
        typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
    );

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        };

        // Add event listener
        window.addEventListener('resize', handleResize);

        // Call handler right away so state gets updated with initial window size
        handleResize();

        // Remove event listener on cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return isMobile;
};
