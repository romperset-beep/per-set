import { ReactNode } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

interface MobileOnlyProps {
    children: ReactNode;
}

export const MobileOnly = ({ children }: MobileOnlyProps) => {
    const isMobile = useIsMobile();

    if (!isMobile) {
        return null;
    }

    return <>{children}</>;
};
