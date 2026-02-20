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
                // Force reload if not already reloaded recently (within last 10 seconds to avoid loop)
                const lastReload = window.sessionStorage.getItem('last_chunk_reload');
                const now = Date.now();
                if (!lastReload || now - parseInt(lastReload) > 10000) {
                    window.sessionStorage.setItem('last_chunk_reload', now.toString());
                    window.location.reload();
                    // Return a never-resolving promise to pause rendering while reloading
                    return new Promise(() => { });
                }
            }
            throw error; // Propagate other errors
        }
    });
};
