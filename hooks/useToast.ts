import toast from 'react-hot-toast';

/**
 * Custom toast hook for consistent error/success messaging
 */
export const useToast = () => ({
    success: (message: string) =>
        toast.success(message, {
            duration: 3000,
            style: {
                background: '#10b981',
                color: '#fff',
            },
        }),

    error: (message: string) =>
        toast.error(message, {
            duration: 4000,
            style: {
                background: '#ef4444',
                color: '#fff',
            },
        }),

    loading: (message: string) =>
        toast.loading(message, {
            style: {
                background: '#1e293b',
                color: '#fff',
            },
        }),

    promise: <T,>(
        promise: Promise<T>,
        messages: {
            loading: string;
            success: string;
            error: string;
        }
    ) =>
        toast.promise(promise, messages, {
            style: {
                background: '#1e293b',
                color: '#fff',
            },
        }),
});
