import React from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className, ...props }) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-slate-300">{label}</label>}
      <div className="relative flex items-center">
        {icon && <span className="absolute left-3.5 text-slate-400 select-none pointer-events-none">{icon}</span>}
        <input
          className={clsx(
            'w-full glass-input rounded-xl px-3.5 py-2.5 text-sm placeholder-slate-500 transition-all duration-200',
            icon && 'pl-10',
            error ? 'border-rose-500 focus:border-rose-400 focus:ring-rose-500/20' : 'border-white/10 focus:border-cyan-400',
            className
          )}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-rose-400 font-medium">{error}</span>}
    </div>
  );
};
