
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircleIcon, XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon } from './icons';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    addToast: (message: string, type: ToastType) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, 4000); // Auto dismiss after 4 seconds
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            onRemove(toast.id);
        }, 300); // Wait for exit animation
    };

    const styles = {
        success: { icon: CheckCircleIcon, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-950/40' },
        error: { icon: XMarkIcon, color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-950/40' },
        warning: { icon: ExclamationTriangleIcon, color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-950/40' },
        info: { icon: InformationCircleIcon, color: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-950/40' },
    }[toast.type];

    const Icon = styles.icon;

    return (
        <div 
            className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border ${styles.border} ${styles.bg} backdrop-blur-xl shadow-2xl flex items-center gap-4 p-4 transition-all duration-300 transform ${isExiting ? 'opacity-0 translate-y-[-20px] scale-95' : 'opacity-100 translate-y-0 scale-100'} animate-slide-up`}
            role="alert"
        >
            <div className={`shrink-0 ${styles.color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
                <p className="font-bold text-white text-sm leading-snug">{toast.message}</p>
            </div>
            <button onClick={handleClose} className="shrink-0 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                <XMarkIcon className="w-4 h-4" />
            </button>
        </div>
    );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // Helper functions
    const success = (msg: string) => addToast(msg, 'success');
    const error = (msg: string) => addToast(msg, 'error');
    const warning = (msg: string) => addToast(msg, 'warning');
    const info = (msg: string) => addToast(msg, 'info');

    return (
        <ToastContext.Provider value={{ addToast, success, error, warning, info }}>
            {children}
            
            {/* Toast Container */}
            <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-3 px-4 pointer-events-none">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};
