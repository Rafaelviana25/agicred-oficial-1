
import React from 'react';

export const AgicredLogo = ({ className = "", textClassName = "text-3xl text-slate-900" }: { className?: string, textClassName?: string }) => (
  <div className={`flex flex-col ${className}`}>
    <h1 className={`${textClassName} font-black tracking-tighter leading-none`}>
      <span className="text-slate-900">AGI</span>
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-600">CRED</span>
    </h1>
  </div>
);
