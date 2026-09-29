import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, RefreshCw, Key, Hash, Eye, Lock } from 'lucide-react';
import { useApp } from '../../state/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { HashDisplay } from '../common/HashDisplay';
import { JudgeAnnotation } from '../common/JudgeAnnotation';

export const PixelSealViewer: React.FC = () => {
  const { state, simulateTampering, restoreInference } = useApp();
  const { inference } = state;

  if (!inference) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
        No inference record available. Run an inference assessment to generate pixel seal verification.
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5 min-w-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase telemetry-mono flex items-center gap-2 truncate">
              <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
              Steganographic Pixel Seal Verification
            </h3>
            <StatusBadge
              status={inference.sealStatus === 'VERIFIED' ? 'SEAL VERIFIED' : 'SEAL BROKEN'}
              type="verification"
              size="sm"
            />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Embedded LSB Ed25519 signature for tamper-evident inference bitstream provenance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {inference.isTampered ? (
            <button
              onClick={restoreInference}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold tracking-wide transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              RESTORE VERIFIED IMAGE
            </button>
          ) : (
            <button
              onClick={simulateTampering}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold tracking-wide transition-all shadow-[0_0_12px_rgba(239,68,68,0.3)]"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              SIMULATE TAMPERING
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
        {/* Synthetic Non-sensitive CV Image Canvas */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              Sensor Payload Frame Buffer: {inference.sampleName}
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              FRAME SIZE: 1920x1080 • LSB-BOUND
            </span>
          </div>

          <div
            className={`relative w-full aspect-video rounded-lg overflow-hidden border ${
              inference.isTampered
                ? 'border-rose-500/70 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                : 'border-cyan-500/30 shadow-[0_0_15px_rgba(14,165,233,0.1)]'
            } bg-slate-950`}
          >
            {/* Synthetic Topographic / Tactical Grid View */}
            <div className="absolute inset-0 military-grid opacity-40" />

            {/* Synthetic Aerial Background Elements */}
            <svg className="absolute inset-0 w-full h-full opacity-35" viewBox="0 0 400 225">
              <path d="M 0,90 Q 120,40 240,110 T 400,80" fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M 20,180 Q 150,140 280,190 T 400,160" fill="none" stroke="#1E293B" strokeWidth="3" />
              <circle cx="210" cy="115" r="45" fill="none" stroke="#1E293B" strokeWidth="1" strokeDasharray="2 2" />
              <circle cx="210" cy="115" r="70" fill="none" stroke="#1E293B" strokeWidth="0.5" />
            </svg>

            {/* Tampered Glitch Effect Overlay */}
            {inference.isTampered && (
              <div className="absolute inset-0 bg-rose-950/20 backdrop-filter backdrop-invert-[0.15] pointer-events-none flex flex-col justify-between p-3">
                <div className="px-2.5 py-1 rounded bg-rose-600/90 text-white font-mono font-bold text-xs inline-flex items-center gap-1.5 self-start shadow-lg">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  TAMPERING DETECTED: BITSTREAM CORRUPTED
                </div>
                <div className="text-[10px] font-mono text-rose-300 bg-black/70 px-2 py-0.5 rounded self-end">
                  INJECTED PIXEL NOISE AT ROW 412..480
                </div>
              </div>
            )}

            {/* Bounding Detections */}
            {inference.boundingDetections.map((det, idx) => (
              <div
                key={idx}
                className="absolute border-2 transition-all duration-300"
                style={{
                  left: `${det.bbox[0]}%`,
                  top: `${det.bbox[1]}%`,
                  width: `${det.bbox[2]}%`,
                  height: `${det.bbox[3]}%`,
                  borderColor: det.color,
                  boxShadow: `0 0 10px ${det.color}40`
                }}
              >
                <div
                  className="absolute -top-5 left-0 px-1.5 py-0.5 text-[10px] font-mono font-bold text-black uppercase tracking-tight truncate rounded-t"
                  style={{ backgroundColor: det.color }}
                >
                  {det.label} ({det.confidence}%)
                </div>
                {/* Corner crosshairs */}
                <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t-2 border-l-2 border-white" />
                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b-2 border-r-2 border-white" />
              </div>
            ))}

            {/* Tactical HUD Overlay Elements */}
            <div className="absolute top-2 right-2 text-right font-mono text-[10px] text-cyan-400 bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
              <div>LAT 34.0837° N | LON 74.7973° E</div>
              <div>ALT: 2,400M • SENSOR: EO-SWIR</div>
              <div>AIR-GAPPED SOVEREIGN FEED</div>
            </div>

            <div className="absolute bottom-2 left-2 font-mono text-[10px] text-slate-400 bg-slate-950/80 px-2 py-1 rounded border border-slate-800 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${inference.isTampered ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'}`} />
              <span>STATUS: {inference.isTampered ? 'INTEGRITY FAILED' : 'AUTHENTICATED'}</span>
            </div>
          </div>
        </div>

        {/* Cryptographic Proof Comparison Panel */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              Cryptographic Binding Comparison
            </div>

            {/* Status Card */}
            <div
              className={`p-3 rounded-lg border ${
                inference.sealStatus === 'VERIFIED'
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-500/50 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-1">
                {inference.sealStatus === 'VERIFIED' ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Pixel Seal Cryptographically Valid
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Security Alert: Steganographic Seal Compromised
                  </>
                )}
              </div>
              <p className="text-xs opacity-90 leading-relaxed">
                {inference.sealStatus === 'VERIFIED'
                  ? 'Extracted LSB bitstream matches non-repudiation signature. Output manifest has not suffered post-inference tampering or adversarial sticker modification.'
                  : 'Extracted bitstream hash does NOT match Ed25519 signature payload. Bitwise diff confirms post-generation pixel perturbation or unauthorized bounding box tampering.'}
              </p>
            </div>

            {/* Expected vs Recovered Signature */}
            <div className="space-y-2">
              <HashDisplay
                label="Expected Signature (Origin Digest)"
                hash={inference.signature}
                status="match"
                tag="Ed25519"
              />
              <HashDisplay
                label="Recovered Bitstream Signature"
                hash={inference.recoveredSignature}
                status={inference.isTampered ? 'mismatch' : 'match'}
                tag={inference.isTampered ? 'CORRUPTED' : 'Ed25519 MATCH'}
              />
              <HashDisplay
                label="Calculated Output Hash (SHA-256)"
                hash={inference.outputHash}
                status={inference.isTampered ? 'mismatch' : 'match'}
                tag={inference.isTampered ? 'MISMATCH' : 'FIPS 180-4'}
              />
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            <span className="text-slate-300 font-semibold">Verification Mechanism:</span> TRUST-CV extracts 128-byte HMAC-SHA256 authenticated watermarks from deterministic pixel frequency bands. If an adversary flips even 1 bit of target classification, the recovered signature collapses.
          </div>
        </div>
      </div>

      <JudgeAnnotation
        title="WHY OUTPUT INTEGRITY & PIXEL SEALS MATTER"
        whyItMatters="Even if training data is clean and the neural model is unpoisoned, an adversary with access to the video stream or command terminal can alter inference bounding boxes before they reach human commanders. TRUST-CV closes this vulnerability by cryptographically binding model inference to pixel output."
        defenseContext="Prevents 'Phantom Target Injection' and 'Asset Concealment' attacks in live ISR video feeds."
      />
    </div>
  );
};
