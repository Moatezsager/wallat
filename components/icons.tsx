
import React from 'react';

type IconProps = { className?: string; strokeWidth?: number };

// Helper to ensure consistent styling (Lucide style)
const IconWrapper: React.FC<{ children: React.ReactNode; className?: string; fill?: boolean; strokeWidth?: number }> = ({ children, className, fill = false, strokeWidth = 2 }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill={fill ? "currentColor" : "none"} 
        stroke={fill ? "none" : "currentColor"} 
        strokeWidth={fill ? 0 : strokeWidth} 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        {children}
    </svg>
);

// --- Navigation & Core Icons ---

export const HomeIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </IconWrapper>
);

export const TransactionsIcon: React.FC<IconProps> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M8 3 4 7l4 4" />
        <path d="M4 7h16" />
        <path d="m16 21 4-4-4-4" />
        <path d="M20 17H4" />
    </IconWrapper>
);

export const DebtsIcon: React.FC<IconProps> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17" />
        <path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9" />
        <path d="m2 16 6 6" />
        <circle cx="16" cy="9" r="2.9" />
        <circle cx="6" cy="5" r="3" />
    </IconWrapper>
);

export const AccountsIcon: React.FC<IconProps> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M3 21h18" />
        <path d="M5 21v-7" />
        <path d="M19 21v-7" />
        <path d="M10 9L3 21" />
        <path d="M14 9l7 12" />
        <rect x="2" y="3" width="20" height="6" rx="2" />
    </IconWrapper>
);

export const CategoriesIcon: React.FC<IconProps> = ({ className }) => (
    <IconWrapper className={className}>
        <rect width="7" height="7" x="3" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="3" rx="1" />
        <rect width="7" height="7" x="14" y="14" rx="1" />
        <rect width="7" height="7" x="3" y="14" rx="1" />
    </IconWrapper>
);

export const ReportsIcon: React.FC<IconProps> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M3 3v18h18" />
        <path d="M18 17V9" />
        <path d="M13 17V5" />
        <path d="M8 17v-3" />
    </IconWrapper>
);

export const ChartPieIcon: React.FC<IconProps> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </IconWrapper>
);

export const ContactsIcon: React.FC<IconProps> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconWrapper>
);

export const ClipboardDocumentIcon: React.FC<IconProps> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z" />
        <path d="M12 11h4" />
        <path d="M12 16h4" />
        <path d="M8 11h.01" />
        <path d="M8 16h.01" />
    </IconWrapper>
);

// --- Actions & UI Elements ---

export const PlusIcon: React.FC<IconProps> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M5 12h14" />
        <path d="M12 5v14" />
    </IconWrapper>
);

export const XMarkIcon: React.FC<IconProps> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </IconWrapper>
);

export const PencilSquareIcon: React.FC<IconProps> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
    </IconWrapper>
);

export const TrashIcon: React.FC<IconProps> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        <line x1="10" x2="10" y1="11" y2="17" />
        <line x1="14" x2="14" y1="11" y2="17" />
    </IconWrapper>
);

export const EllipsisVerticalIcon: React.FC<IconProps> = ({ className }) => (
    <IconWrapper className={className}>
        <circle cx="12" cy="12" r="1" />
        <circle cx="12" cy="5" r="1" />
        <circle cx="12" cy="19" r="1" />
    </IconWrapper>
);

export const InformationCircleIcon: React.FC<IconProps> = ({ className }) => (
    <IconWrapper className={className}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
    </IconWrapper>
);

export const Bars3Icon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </IconWrapper>
);

export const CurrencyDollarIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <line x1="12" x2="12" y1="2" y2="22" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </IconWrapper>
);

export const ArrowLeftIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </IconWrapper>
);

export const WalletIcon: React.FC<IconProps> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
        <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </IconWrapper>
);

export const ArrowDownIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </IconWrapper>
);

export const ArrowUpIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </IconWrapper>
);

export const ClockIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </IconWrapper>
);

export const ChevronLeftIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="m15 18-6-6 6-6" />
  </IconWrapper>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="m9 18 6-6-6-6" />
  </IconWrapper>
);

export const DocumentTextIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
    <line x1="10" x2="8" y1="9" y2="9" />
  </IconWrapper>
);

export const CheckCircleIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </IconWrapper>
);

export const ExclamationTriangleIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </IconWrapper>
);

export const WealthIcon: React.FC<IconProps> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="M6 3h12l4 6-10 13L2 9Z" />
        <path d="M11 3 8 9l4 13 4-13-3-6" />
        <path d="M2 9h20" />
    </IconWrapper>
);

export const CreditCardIcon: React.FC<IconProps> = ({ className }) => (
    <IconWrapper className={className}>
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
    </IconWrapper>
);

export const ArrowsRightLeftIcon: React.FC<IconProps> = ({ className }) => (
    <IconWrapper className={className}>
        <path d="m16 3 4 4-4 4" />
        <path d="M20 7H4" />
        <path d="m8 21-4-4 4-4" />
        <path d="M4 17h16" />
    </IconWrapper>
);

export const ScaleIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="M7 21h10" />
    <path d="M12 3v18" />
    <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
  </IconWrapper>
);

export const MagnifyingGlassIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </IconWrapper>
);

export const FunnelIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </IconWrapper>
);

export const HandRaisedIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
    <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
    <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </IconWrapper>
);

export const UserPlusIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" x2="19" y1="8" y2="14" />
    <line x1="22" x2="16" y1="11" y2="11" />
  </IconWrapper>
);

export const SparklesIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M9 5H5" />
  </IconWrapper>
);

export const LandmarkIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <line x1="3" x2="21" y1="22" y2="22" />
    <line x1="6" x2="6" y1="18" y2="11" />
    <line x1="10" x2="10" y1="18" y2="11" />
    <line x1="14" x2="14" y1="18" y2="11" />
    <line x1="18" x2="18" y1="18" y2="11" />
    <polygon points="12 2 20 7 4 7" />
  </IconWrapper>
);

// --- Finance Specific Icons ---

export const UtensilsIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
    <path d="M7 2v20" />
    <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
  </IconWrapper>
);

export const ShoppingBagIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </IconWrapper>
);

export const CarIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <path d="M9 17h6" />
    <circle cx="17" cy="17" r="2" />
  </IconWrapper>
);

export const HomeModernIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </IconWrapper>
);

export const HeartPulseIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
  </IconWrapper>
);

export const SmartphoneIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <path d="M12 18h.01" />
  </IconWrapper>
);

export const WifiIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </IconWrapper>
);

export const ZapIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </IconWrapper>
);

export const BriefcaseIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </IconWrapper>
);

export const BanknoteIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <rect width="20" height="12" x="2" y="6" rx="2" />
    <circle cx="12" cy="12" r="2" />
    <path d="M6 12h.01M18 12h.01" />
  </IconWrapper>
);

export const PlaneIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M2 12h5" />
    <path d="M17 7 7 12l10 5 3-5-3-5Z" />
    <path d="M10 13.5v3.5l4-2" />
  </IconWrapper>
);

export const Gamepad2Icon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <line x1="6" x2="10" y1="12" y2="12" />
    <line x1="8" x2="8" y1="10" y2="14" />
    <line x1="15" x2="15.01" y1="13" y2="13" />
    <line x1="18" x2="18.01" y1="11" y2="11" />
    <rect width="20" height="12" x="2" y="6" rx="2" />
  </IconWrapper>
);

export const GraduationCapIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </IconWrapper>
);

export const ShirtIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
  </IconWrapper>
);

export const GiftIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M12 8v13" />
    <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
    <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.9 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
  </IconWrapper>
);

export const FuelIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <line x1="3" x2="15" y1="22" y2="22" />
    <path d="M4 9h10" />
    <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" />
    <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42l-1.82-1.82a2 2 0 0 0-1.42-.59H14" />
  </IconWrapper>
);

// --- Note Editor Icons ---

export const PinIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <line x1="12" x2="12" y1="17" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
  </IconWrapper>
);

export const SolidPinIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className} fill={true}>
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    <line x1="12" x2="12" y1="17" y2="22" stroke="currentColor" strokeWidth={2} />
  </IconWrapper>
);

export const PaintBrushIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M18.375 2.625a3.875 3.875 0 0 0-5.5 5.5l-7 7-.75 4.5 4.5-.75 7-7a3.875 3.875 0 0 0 5.5-5.5Z" />
    <path d="M11.5 7.5 16.5 12.5" />
  </IconWrapper>
);

export const BoldIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M14 12a4 4 0 0 0 0-8H6v8" />
    <path d="M15 20a4 4 0 0 0 0-8H6v8Z" />
  </IconWrapper>
);

export const ItalicIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <line x1="19" x2="10" y1="4" y2="4" />
    <line x1="14" x2="5" y1="20" y2="20" />
    <line x1="15" x2="9" y1="4" y2="20" />
  </IconWrapper>
);

export const UnderlineIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M6 4v6a6 6 0 0 0 12 0V4" />
    <line x1="4" x2="20" y1="20" y2="20" />
  </IconWrapper>
);

export const StrikethroughIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M16 4H9a3 3 0 0 0-2.83 4" />
    <path d="M14 12a4 4 0 0 1 0 8H6" />
    <line x1="4" x2="20" y1="12" y2="12" />
  </IconWrapper>
);

export const ListBulletIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <line x1="8" x2="21" y1="6" y2="6" />
    <line x1="8" x2="21" y1="12" y2="12" />
    <line x1="8" x2="21" y1="18" y2="18" />
    <line x1="3" x2="3.01" y1="6" y2="6" />
    <line x1="3" x2="3.01" y1="12" y2="12" />
    <line x1="3" x2="3.01" y1="18" y2="18" />
  </IconWrapper>
);

export const QueueListIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <line x1="10" x2="21" y1="6" y2="6" />
    <line x1="10" x2="21" y1="12" y2="12" />
    <line x1="10" x2="21" y1="18" y2="18" />
    <path d="M4 6h1v4" />
    <path d="M4 10h2" />
    <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
  </IconWrapper>
);

export const ChatBubbleLeftQuoteIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
  </IconWrapper>
);

export const ArrowTrendingUp: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </IconWrapper>
);

export const ArrowTrendingDown: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
    <polyline points="16 17 22 17 22 11" />
  </IconWrapper>
);

export const DocumentArrowDownIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    <path d="M12 11v6" />
    <path d="m9 14 3 3 3-3" />
  </IconWrapper>
);

export const KeyIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
    <circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>
  </IconWrapper>
);

export const CalendarDaysIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <path d="M16 14h.01" />
    <path d="M8 18h.01" />
    <path d="M12 18h.01" />
    <path d="M16 18h.01" />
  </IconWrapper>
);

export const TagIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
    <path d="M7 7h.01" />
  </IconWrapper>
);

export const ChartBarSquareIcon: React.FC<IconProps> = ({ className }) => (
    <IconWrapper className={className}>
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M7 16h.01" />
        <path d="M12 16v-5" />
        <path d="M17 16v-8" />
    </IconWrapper>
);

export const CopyIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </IconWrapper>
);

export const UndoIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </IconWrapper>
);

export const RedoIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
  </IconWrapper>
);

export const AlignLeftIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="15" x2="3" y1="12" y2="12" />
    <line x1="17" x2="3" y1="18" y2="18" />
  </IconWrapper>
);

export const AlignCenterIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="17" x2="7" y1="12" y2="12" />
    <line x1="19" x2="5" y1="18" y2="18" />
  </IconWrapper>
);

export const AlignRightIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <line x1="21" x2="3" y1="6" y2="6" />
    <line x1="21" x2="9" y1="12" y2="12" />
    <line x1="21" x2="7" y1="18" y2="18" />
  </IconWrapper>
);

export const Heading1Icon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M4 12h8" />
    <path d="M4 18V6" />
    <path d="M12 18V6" />
    <path d="m17 12 3-2v8" />
  </IconWrapper>
);

export const Heading2Icon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <path d="M4 12h8" />
    <path d="M4 18V6" />
    <path d="M12 18V6" />
    <path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" />
  </IconWrapper>
);

export const CheckSquareIcon: React.FC<IconProps> = ({ className }) => (
  <IconWrapper className={className}>
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </IconWrapper>
);


export const iconMap: { [key: string]: React.FC<IconProps> } = {
    HomeIcon,
    TransactionsIcon,
    DebtsIcon,
    AccountsIcon,
    PlusIcon,
    XMarkIcon,
    PencilSquareIcon,
    TrashIcon,
    EllipsisVerticalIcon,
    InformationCircleIcon,
    Bars3Icon,
    CurrencyDollarIcon,
    ContactsIcon,
    CategoriesIcon,
    ReportsIcon,
    ChartPieIcon,
    ClipboardDocumentIcon,
    ArrowLeftIcon,
    WalletIcon,
    ArrowDownIcon,
    ArrowUpIcon,
    ClockIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    WealthIcon,
    CreditCardIcon,
    ArrowsRightLeftIcon,
    ScaleIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    HandRaisedIcon,
    UserPlusIcon,
    SparklesIcon,
    PinIcon, SolidPinIcon, PaintBrushIcon,
    BoldIcon, ItalicIcon, UnderlineIcon, StrikethroughIcon,
    ListBulletIcon, QueueListIcon, ChatBubbleLeftQuoteIcon,
    KeyIcon,
    CalendarDaysIcon,
    TagIcon,
    ArrowTrendingUp,
    ArrowTrendingDown,
    ChartBarSquareIcon,
    // New Finance Icons
    UtensilsIcon,
    ShoppingBagIcon,
    CarIcon,
    HomeModernIcon,
    HeartPulseIcon,
    SmartphoneIcon,
    WifiIcon,
    ZapIcon,
    BriefcaseIcon,
    BanknoteIcon,
    PlaneIcon,
    Gamepad2Icon,
    GraduationCapIcon,
    ShirtIcon,
    GiftIcon,
    FuelIcon,
    LandmarkIcon,
    // Editor Icons
    CopyIcon, UndoIcon, RedoIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon,
    Heading1Icon, Heading2Icon, CheckSquareIcon
};
