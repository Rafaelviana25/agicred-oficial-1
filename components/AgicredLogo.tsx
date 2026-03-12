
import React from 'react';

export const AgicredLogo = ({ className = "", textClassName = "text-3xl text-slate-900" }: { className?: string, textClassName?: string }) => (
  <div className={`flex flex-col ${className}`}>
    <h1 className={`${textClassName} tracking-tighter leading-none`}>
      <span className="text-slate-900 leading-[1px] text-left font-bold text-[26px] w-auto">AGI</span>
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-600 text-[26px] ml-[1px] mr-[8px] mb-[3px] mt-[3px] pr-[5px]">CRED</span>
    </h1>
  </div>
);
