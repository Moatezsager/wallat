
import React from 'react';
import { ExclamationTriangleIcon, XMarkIcon, CheckCircleIcon, TrashIcon } from './icons';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
    isOpen, 
    title, 
    message, 
    confirmText = "تأكيد", 
    cancelText = "إلغاء", 
    type = 'danger', 
    onConfirm, 
    onCancel 
}) => {
    if (!isOpen) return null;

    const styles = {
        danger: {
            icon: TrashIcon,
            iconBg: 'bg-rose-500/20',
            iconColor: 'text-rose-500',
            buttonBg: 'bg-rose-600 hover:bg-rose-500',
            glow: 'bg-rose-500',
            border: 'border-rose-500/30'
        },
        warning: {
            icon: ExclamationTriangleIcon,
            iconBg: 'bg-amber-500/20',
            iconColor: 'text-amber-500',
            buttonBg: 'bg-amber-600 hover:bg-amber-500',
            glow: 'bg-amber-500',
            border: 'border-amber-500/30'
        },
        info: {
            icon: CheckCircleIcon,
            iconBg: 'bg-blue-500/20',
            iconColor: 'text-blue-500',
            buttonBg: 'bg-blue-600 hover:bg-blue-500',
            glow: 'bg-blue-500',
            border: 'border-blue-500/30'
        }
    }[type];

    const Icon = styles.icon;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <div 
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
                onClick={onCancel}
            ></div>

            {/* Dialog Content */}
            <div className={`relative w-full max-w-md bg-slate-900 rounded-3xl border ${styles.border} shadow-2xl transform transition-all scale-100 opacity-100 overflow-hidden`}>
                
                {/* Ambient Glow */}
                <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 ${styles.glow}`}></div>
                
                <div className="p-6 relative z-10">
                    <div className="flex items-start gap-4">
                        <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${styles.iconBg} ${styles.iconColor}`}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{message}</p>
                        </div>
                        <button 
                            onClick={onCancel}
                            className="text-slate-500 hover:text-white transition-colors p-1"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button 
                            onClick={onCancel}
                            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors border border-white/5"
                        >
                            {cancelText}
                        </button>
                        <button 
                            onClick={onConfirm}
                            className={`flex-1 py-3 px-4 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl ${styles.buttonBg}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
