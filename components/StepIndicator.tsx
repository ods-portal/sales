import React from 'react';

export default function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div className="flex justify-between relative">
      <div className="absolute top-[14px] left-5 right-5 h-0.5 bg-border z-0" />
      <div className="absolute top-[14px] left-5 h-0.5 bg-brand z-0 transition-[width] duration-300" style={{ width: `${(current / (total - 1)) * 100}%` }} />
      {labels.map((label, i) => {
        const active = i === current;
        const passed = i < current;
        return (
          <div key={label} className="flex flex-col items-center z-10 gap-2">
            <div className={`w-[30px] h-[30px] rounded-[15px] flex items-center justify-center font-semibold text-[13px] transition-all duration-300 border-2 ${active || passed ? 'bg-brand border-brand text-white' : 'bg-white border-border text-text-muted'}`}>
              {passed ? '✓' : i + 1}
            </div>
            <span className={`text-xs ${active ? 'font-semibold text-text-primary max-sm:max-w-[96px] max-sm:text-center' : 'font-normal text-text-muted max-sm:sr-only'}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
 