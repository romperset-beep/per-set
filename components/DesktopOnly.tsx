import { ReactNode } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

interface DesktopOnlyProps {
    children: ReactNode;
}

export const DesktopOnly = ({ children }: DesktopOnlyProps) => {
    const isMobile = useIsMobile();

    if (isMobile) {
        return null;
    }

    return <>{children}</>;
};
