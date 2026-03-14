
import React from 'react';

export const AgicredLogo = ({ className = "", textClassName = "text-3xl text-slate-900" }: { className?: string, textClassName?: string }) => (
  <div className={`flex flex-col ${className}`}>
    <h1 className={`${textClassName} tracking-tighter leading-none`}>
      <span className="text-slate-900 leading-[1px] text-left font-bold text-[28px] w-auto pb-0 pr-0 pt-0 mr-0">AGI</span>
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-600 text-[28px] leading-[26px] font-bold h-auto mt-[3px] mb-[3px] mr-[8px] ml-[-2px]">CRED</span>
    </h1>
  </div>
);
