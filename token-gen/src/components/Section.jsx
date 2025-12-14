import React from 'react';

const Section = ({ title, icon, children }) => (
  <div className="mb-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 duration-500">
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
      {icon}
      <h3 className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-sm">{title}</h3>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {children}
    </div>
  </div>
);

export default Section;
