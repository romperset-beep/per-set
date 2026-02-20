import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-red-900/90 p-6 rounded-xl border border-red-500 max-w-md w-full">
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                            <AlertCircle className="h-6 w-6" />
                            Erreur Technique
                        </h3>
                        <p className="text-red-200 mb-4">Une erreur inattendue est survenue.</p>
                        <pre className="bg-black/50 p-3 rounded text-xs text-red-300 overflow-auto max-h-40 mb-4">
                            {this.state.error?.message || "Erreur inconnue"}
                        </pre>
                        <button
                            onClick={() => {
                                if (
                                    this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
                                    this.state.error?.message?.includes('Importing a module script failed')
                                ) {
                                    window.location.reload();
                                } else {
                                    this.setState({ hasError: false });
                                }
                            }}
                            className="w-full bg-white/10 hover:bg-white/20 text-white py-2 rounded transition-colors"
                        >
                            Réessayer
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
