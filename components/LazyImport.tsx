import React, { lazy, ComponentType } from 'react';

// Wrapper to handle ChunkLoadError by reloading page once
export const lazyImport = <T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>
) => {
    return lazy(async () => {
        try {
            return await factory();
        } catch (error: any) {
            console.error('Lazy import failed:', error);
            // Check if it's a chunk load error (common after deployments)
            if (error.message && (
                error.message.includes('Failed to fetch dynamically imported module') ||
                error.message.includes('Importing a module script failed')
            )) {
                // Force reload if not already reloaded to avoid loop
                if (!window.sessionStorage.getItem('chunk_reload_' + window.location.pathname)) {
                    window.sessionStorage.setItem('chunk_reload_' + window.location.pathname, 'true');
                    window.location.reload();
                    // Return a never-resolving promise to pause rendering while reloading
                    return new Promise(() => { });
                }
            }
            throw error; // Propagate other errors
        }
    });
};
