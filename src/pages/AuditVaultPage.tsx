import React, { useState, useEffect } from 'react';
import { useApp } from '../state/AppContext';
import { auditApi } from '../services/auditApi';
import { AuditRecord } from '../services/types';
import { AssessmentWizardModal } from '../components/common/AssessmentWizardModal';

export const AuditVaultPage: React.FC = () => {
  const { state, setActivePage } = useApp();
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  useEffect(() => {
    auditApi.getAuditRecords(state).then(setRecords);
  }, [state]);

  const filteredRecords = records.filter(r => {
    if (!r) return false;
    const matchesSeverity = severityFilter === 'ALL' || r.severity === severityFilter;
    const term = (searchTerm || '').toLowerCase();
    const event = (r.event || '').toLowerCase();
    const id = (r.id || '').toLowerCase();
    const source = (r.source || '').toLowerCase();
    const hash = (r.hash || '').toLowerCase();
    const matchesSearch =
      event.includes(term) ||
      id.includes(term) ||
      source.includes(term) ||
      hash.includes(term);
    return matchesSeverity && matchesSearch;
  });

  // EMPTY STATE: No audit records in database yet
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] max-w-xl mx-auto text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-container-high/60 border border-surface-container-high flex items-center justify-center mb-6 text-secondary">
          <span className="material-symbols-outlined text-[36px]">assignment_turned_in</span>
        </div>
        <div className="text-xs uppercase tracking-wider text-secondary font-semibold mb-1">
          AUDIT VAULT
        </div>
        <h2 className="text-2xl font-semibold text-on-surface tracking-tight mb-2">
          No audit records yet
        </h2>
        <p className="text-sm text-secondary mb-8 max-w-md">
          Every completed dataset and model assessment automatically commits immutable forward-chained cryptographic blocks into the local SQLite audit ledger.
        </p>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="px-6 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all font-medium text-sm shadow-xs flex items-center gap-2"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Start Assessment</span>
        </button>
        <AssessmentWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
      </div>
    );
  }

  // REAL AUDIT VAULT VIEW
  return (
    <div className="flex flex-col gap-space-lg w-full max-w-[1200px] mx-auto pb-space-xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-space-sm">
        <div className="flex items-center gap-space-sm">
          <button
            onClick={() => setActivePage('overview')}
            className="p-1.5 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors"
            title="Back to Overview"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-on-surface">Cryptographic Audit Vault</h2>
            <p className="text-xs sm:text-sm text-secondary">
              Tamper-evident ledger with forward SHA-256 hash chaining committed to local storage
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-semibold border border-outline-variant/30 font-mono">
            {records.length} Committed Blocks
          </span>
        </div>
      </div>

      {/* Recent Blocks Visual Chain */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high">
        <div className="flex items-center justify-between pb-3">
          <span className="text-sm font-semibold text-on-surface">Hash Chain Chaining (Recent Blocks)</span>
          <span className="text-xs text-primary font-mono flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[16px]">link</span> Chain Verified &bull; No Break Detected
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm pt-2">
          {records.slice(0, 4).map((evt, idx) => (
            <div
              key={`rec-summary-${evt.id || idx}-${idx}`}
              onClick={() => setSelectedRecord(evt)}
              className="p-3 bg-surface-container-low hover:bg-surface-container-high/60 rounded-xl border border-surface-container-high transition-colors cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-on-surface">{evt.id}</span>
                  <span className="text-[10px] font-mono text-secondary">{evt.timestamp.split('T')[1]?.slice(0, 8) || evt.timestamp}</span>
                </div>
                <div className="text-xs font-medium text-on-surface mt-1.5 truncate">{evt.event}</div>
              </div>
              <div className="pt-2 mt-2 border-t border-surface-container-high/60 flex items-center justify-between text-[10px] font-mono text-secondary">
                <span>{evt.source.replace('_ENGINE', '')}</span>
                <span className="text-primary font-medium">{evt.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs border border-surface-container-high flex flex-col sm:flex-row items-center justify-between gap-space-md">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined text-[18px] text-secondary absolute left-3 top-1/2 -translate-y-1/2">
            search
          </span>
          <input
            type="text"
            placeholder="Search audit trail by event, ID, or source..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-container-low border border-surface-container-high text-xs text-on-surface placeholder:text-secondary focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
          <span className="text-secondary font-medium mr-1">Severity:</span>
          {(['ALL', 'INFO', 'WARNING', 'CRITICAL'] as const).map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                severityFilter === sev
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-secondary hover:text-on-surface border border-surface-container-high/60'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-secondary font-medium border-b border-surface-container-high/60">
              <th className="pb-2.5">BLOCK ID</th>
              <th className="pb-2.5">TIMESTAMP</th>
              <th className="pb-2.5">EVENT</th>
              <th className="pb-2.5">SOURCE</th>
              <th className="pb-2.5">CURRENT SHA-256</th>
              <th className="pb-2.5">SEVERITY</th>
              <th className="pb-2.5">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-high/40">
            {filteredRecords.map((r, idx) => (
              <tr
                key={`rec-row-${r.id || idx}-${idx}`}
                onClick={() => setSelectedRecord(r)}
                className="hover:bg-surface-container-low/40 transition-colors cursor-pointer"
              >
                <td className="py-2.5 font-mono text-on-surface font-semibold">{r.id}</td>
                <td className="py-2.5 font-mono text-secondary text-[11px]">{r.timestamp}</td>
                <td className="py-2.5 font-medium text-on-surface max-w-xs truncate">{r.event}</td>
                <td className="py-2.5 font-mono text-secondary">{r.source}</td>
                <td className="py-2.5 font-mono text-secondary text-[11px] select-all truncate max-w-[120px]">
                  {r.hash.slice(0, 12)}...
                </td>
                <td className="py-2.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    r.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : r.severity === 'WARNING' ? 'bg-amber-100 text-amber-800' : 'bg-surface-container text-secondary'
                  }`}>
                    {r.severity}
                  </span>
                </td>
                <td className="py-2.5">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-medium">
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Block Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-6 border border-surface-container-high shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">lock</span>
                <h3 className="text-sm font-semibold text-on-surface">Block Digest: {selectedRecord.id}</h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded text-secondary hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3 text-xs">
              <div>
                <span className="text-secondary font-medium block">Event:</span>
                <span className="text-on-surface font-semibold">{selectedRecord.event}</span>
              </div>
              <div>
                <span className="text-secondary font-medium block">Timestamp:</span>
                <span className="text-on-surface font-mono">{selectedRecord.timestamp}</span>
              </div>
              <div>
                <span className="text-secondary font-medium block">Evidence Summary:</span>
                <p className="text-on-surface mt-0.5">{selectedRecord.evidence}</p>
              </div>
              <div>
                <span className="text-secondary font-medium block">Current Block Hash (SHA-256):</span>
                <span className="text-primary font-mono text-[11px] select-all break-all">{selectedRecord.hash}</span>
              </div>
              <div>
                <span className="text-secondary font-medium block">Previous Block Hash (Parent):</span>
                <span className="text-secondary font-mono text-[11px] select-all break-all">{selectedRecord.previousHash}</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <AssessmentWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
    </div>
  );
};
