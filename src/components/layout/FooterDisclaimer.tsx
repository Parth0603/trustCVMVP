import React from 'react';

export const FooterDisclaimer: React.FC = () => {
  return (
    <footer className="h-9 bg-surface-container-lowest border-t border-surface-container-high px-space-lg flex items-center justify-between text-[11px] text-secondary select-none z-30">
      <div className="flex items-center gap-space-md">
        <span>MoD / DGIS Sovereign AI Integrity Reference Architecture (PS-26228)</span>
        <span className="hidden md:inline text-outline-variant">•</span>
        <span className="hidden md:inline">FIPS 180-4 / FIPS 186-5 Compliance Certified</span>
      </div>
      <div className="flex items-center gap-space-sm font-mono text-[10px]">
        <span className="text-secondary/80">SIMULATION ENGINE v1.2</span>
        <span className="text-outline-variant">|</span>
        <span className="text-primary font-medium">AIR-GAPPED READY</span>
      </div>
    </footer>
  );
};
