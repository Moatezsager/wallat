
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
            buttonBg: 'bg-gradient-to-r from-rose-600 to-red-600 shadow-rose-900/30',
            glow: 'bg-rose-500',
            border: 'border-rose-500/30'
        },
        warning: {
            icon: ExclamationTriangleIcon,
            iconBg: 'bg-amber-500/20',
            iconColor: 'text-amber-500',
            buttonBg: 'bg-gradient-to-r from-amber-600 to-orange-600 shadow-amber-900/30',
            glow: 'bg-amber-500',
            border: 'border-amber-500/30'
        },
        info: {
            icon: CheckCircleIcon,
            iconBg: 'bg-blue-500/20',
            iconColor: 'text-blue-500',
            buttonBg: 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-blue-900/30',
            glow: 'bg-blue-500',
            border: 'border-blue-500/30'
        }
    }[type];

    const Icon = styles.icon;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop with blur */}
            <div 
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300"
                onClick={onCancel}
            ></div>

            {/* Dialog Content */}
            <div className={`relative w-full max-w-md bg-slate-900 rounded-[2rem] border ${styles.border} shadow-2xl animate-slide-up overflow-hidden`}>
                
                {/* Ambient Glow */}
                <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 ${styles.glow}`}></div>
                
                <div className="p-6 relative z-10">
                    <div className="flex items-start gap-4">
                        <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center ${styles.iconBg} ${styles.iconColor}`}>
                            <Icon className="w-7 h-7" />
                        </div>
                        <div className="flex-1 pt-1">
                            <h3 className="text-xl font-black text-white mb-2">{title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed font-bold">{message}</p>
                        </div>
                        <button 
                            onClick={onCancel}
                            className="text-slate-500 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/5 active:scale-90"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button 
                            onClick={onCancel}
                            className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl transition-all border border-white/5 active:scale-95"
                        >
                            {cancelText}
                        </button>
                        <button 
                            onClick={onConfirm}
                            className={`flex-1 py-4 text-white font-black rounded-2xl transition-all shadow-xl active:scale-95 ${styles.buttonBg}`}
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
