import React from 'react';
import { Landmark } from 'lucide-react';

export const Header = () => {
  return (
    <header className="border-b-2 border-[#8B9A6E] pb-5 mb-8 text-center">
      <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#8B9A6E] text-white mb-3 shadow-sm">
        <Landmark className="w-7 h-7" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight uppercase">
        Proposed Banking Agents Trade Union
      </h1>
      <h2 className="text-base sm:text-lg font-bold text-[#55633e] tracking-wide mt-1">
        Membership Application Form
      </h2>
    </header>
  );
};
