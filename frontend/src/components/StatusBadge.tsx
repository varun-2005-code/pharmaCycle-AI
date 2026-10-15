import React from 'react';
import type { WasteStatus } from '../types';
import {
  Sparkles,
  Clock,
  PackageCheck,
  Truck,
  Recycle,
  HelpCircle
} from 'lucide-react';

interface StatusBadgeProps {
  status: WasteStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const getStatusConfig = (s: string) => {
    switch (s) {
      case 'identified':
        return {
          label: 'Identified',
          icon: Sparkles,
          bg: 'bg-blue-50 border-blue-200 text-blue-700',
          dot: 'bg-blue-500',
        };
      case 'awaiting_confirmation':
        return {
          label: 'Awaiting Confirmation',
          icon: Clock,
          bg: 'bg-amber-50 border-amber-200 text-amber-700',
          dot: 'bg-amber-500',
        };
      case 'collection_pending':
        return {
          label: 'Collection Pending',
          icon: PackageCheck,
          bg: 'bg-purple-50 border-purple-200 text-purple-700',
          dot: 'bg-purple-500',
        };
      case 'collected':
        return {
          label: 'Collected',
          icon: Truck,
          bg: 'bg-teal-50 border-teal-200 text-teal-700',
          dot: 'bg-teal-500',
        };
      case 'processed':
        return {
          label: 'Processed & Recovered',
          icon: Recycle,
          bg: 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold',
          dot: 'bg-emerald-600',
        };
      default:
        return {
          label: s.replace(/_/g, ' '),
          icon: HelpCircle,
          bg: 'bg-slate-50 border-slate-200 text-slate-700',
          dot: 'bg-slate-400',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs sm:text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-xs ${config.bg} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {showIcon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span className="capitalize">{config.label}</span>
    </span>
  );
};
