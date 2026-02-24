import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class FallbackErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-cinema-900 flex items-center justify-center p-4">
                    <div className="bg-cinema-800 border-l-4 border-red-500 rounded-r-lg p-6 max-w-lg w-full shadow-2xl">
                        <div className="flex items-center mb-4">
                            <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
                            <h1 className="text-xl font-bold text-white">Une erreur est survenue</h1>
                        </div>

                        <div className="bg-black/30 rounded p-4 mb-6 overflow-auto max-h-48">
                            <p className="text-red-300 font-mono text-xs break-all">
                                {this.state.error?.toString()}
                            </p>
                            {this.state.errorInfo && (
                                <pre className="text-slate-500 text-[10px] mt-2">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                // Clear local storage and reload as a nuclear option
                                localStorage.removeItem('perSetUser');
                                window.location.reload();
                            }}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <RefreshCcw className="h-4 w-4" />
                            Réinitialiser et Recharger
                        </button>
                        <p className="text-center text-slate-500 text-xs mt-3">
                            Le problème persiste ? Contactez le support avec le message ci-dessus.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
