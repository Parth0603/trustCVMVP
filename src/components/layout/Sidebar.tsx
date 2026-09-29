import React from 'react';
import { useApp, PageRoute } from '../../state/AppContext';

export const Sidebar: React.FC = () => {
  const { activePage, setActivePage } = useApp();

  const navItemClass = (page: PageRoute) => {
    const isActive = activePage === page;
    return `flex items-center gap-space-sm px-space-sm py-space-xs transition-colors rounded-lg font-label-md text-sm ${
      isActive
        ? 'bg-primary-container text-on-primary-container font-medium shadow-xs'
        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low font-normal'
    }`;
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-lowest z-50 flex flex-col justify-between p-space-md border-r border-surface-container-high select-none">
      <div className="flex flex-col gap-space-lg">
        {/* Brand Header */}
        <div className="flex flex-col px-space-xs cursor-pointer" onClick={() => setActivePage('overview')}>
          <div className="flex items-center gap-space-sm">
            <div className="w-7 h-7 rounded-lg bg-primary-container flex items-center justify-center text-on-primary shadow-xs">
              <span className="material-symbols-outlined text-[18px]">shield_with_heart</span>
            </div>
            <span className="font-title-md text-base font-bold text-on-surface tracking-tight">
              TRUST-CV
            </span>
          </div>
          <span className="font-body-sm text-xs text-secondary pl-[36px] mt-0.5 font-medium">
            AI Integrity Assurance
          </span>
        </div>

        {/* Primary Navigation */}
        <nav className="flex flex-col gap-space-xs">
          {/* Overview */}
          <button
            onClick={() => setActivePage('overview')}
            className={navItemClass('overview')}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            <span>Overview</span>
          </button>

          {/* Group 1: Assurance */}
          <div className="pt-space-sm pb-space-xs px-space-sm">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-secondary font-semibold">
              Assurance
            </span>
          </div>
          <div className="flex flex-col gap-space-xs pl-space-xs">
            <button
              onClick={() => setActivePage('data')}
              className={navItemClass('data')}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">database</span>
              <span>Data</span>
            </button>
            <button
              onClick={() => setActivePage('model')}
              className={navItemClass('model')}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">memory</span>
              <span>Model</span>
            </button>
            <button
              onClick={() => setActivePage('inference')}
              className={navItemClass('inference')}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>Provenance</span>
            </button>
            <button
              onClick={() => setActivePage('distribution')}
              className={navItemClass('distribution')}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">compare_arrows</span>
              <span>Shift</span>
            </button>
          </div>

          {/* Group 2: Validation */}
          <div className="pt-space-sm pb-space-xs px-space-sm">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-secondary font-semibold">
              Validation
            </span>
          </div>
          <div className="flex flex-col gap-space-xs pl-space-xs">
            <button
              onClick={() => setActivePage('attack-lab')}
              className={navItemClass('attack-lab')}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">science</span>
              <span>Simulation</span>
            </button>
            <button
              onClick={() => setActivePage('audit')}
              className={navItemClass('audit')}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
              <span>Audit</span>
            </button>
          </div>

          {/* Group 3: Reports */}
          <div className="pt-space-sm pb-space-xs px-space-sm">
            <span className="font-label-sm text-[11px] uppercase tracking-wider text-secondary font-semibold">
              Reports
            </span>
          </div>
          <div className="flex flex-col gap-space-xs pl-space-xs">
            <button
              onClick={() => setActivePage('report')}
              className={navItemClass('report')}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">description</span>
              <span>Assurance Report</span>
            </button>
          </div>
        </nav>
      </div>

      {/* System Status Footer */}
      <div className="flex flex-col gap-2 pt-space-md border-t border-surface-container-high">
        <div className="flex items-center justify-between px-space-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-label-sm text-xs text-on-surface font-medium">System Online</span>
          </div>
          <span className="font-label-sm text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container-low text-secondary border border-outline-variant/40">
            AIR-GAPPED
          </span>
        </div>
      </div>
    </aside>
  );
};
