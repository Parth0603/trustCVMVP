import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Database,
  Cpu,
  Fingerprint,
  CloudSun,
  Scale,
  ArrowRight,
  Flame,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Layers,
  Lock,
  Radio,
  BookOpen,
  Binary,
  Eye,
  Key,
  ChevronDown,
  RefreshCw,
  Play,
  ArrowUp
} from 'lucide-react';
import { useApp, PageRoute } from '../state/AppContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { DemoRunnerModal } from '../components/simulation/DemoRunnerModal';
import { RESEARCH_REFERENCES } from '../data/mockData';

export const LandingPage: React.FC = () => {
  const {
    state,
    setActivePage,
    simulatePoisoning,
    simulateBackdoor,
    simulateTampering,
    setDistributionScenario,
    resetSystem,
    runFullDemoSequence
  } = useApp();

  const [showDemoModal, setShowDemoModal] = useState(false);
  const [activeMiniSim, setActiveMiniSim] = useState<string | null>(null);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleMiniSimulation = (simName: string, action: () => void) => {
    action();
    setActiveMiniSim(simName);
  };

  const handleLaunchTour = () => {
    runFullDemoSequence();
    setActivePage('overview');
  };

  return (
    <div className="min-h-screen bg-[#070A10] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 antialiased overflow-x-hidden">
      {/* ========================================================
          TOP NAVIGATION (HOME)
      ======================================================== */}
      <header className="sticky top-0 z-50 bg-[#070A10]/95 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.2)]">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-base font-black tracking-wider text-white telemetry-mono flex items-center gap-1.5">
              TRUST-CV
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-[10px] font-mono tracking-tight text-slate-400 hidden sm:block">
              Unified AI Integrity Assurance Layer • MoD / Indian Army DGIS
            </div>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-6 text-xs font-mono text-slate-300">
          <button onClick={() => scrollToSection('hero')} className="hover:text-cyan-400 transition-colors">
            Overview
          </button>
          <button onClick={() => scrollToSection('problem')} className="hover:text-cyan-400 transition-colors">
            The Challenge
          </button>
          <button onClick={() => scrollToSection('core-idea')} className="hover:text-cyan-400 transition-colors">
            Core Concept
          </button>
          <button onClick={() => scrollToSection('engines')} className="hover:text-cyan-400 transition-colors">
            Assurance Engines
          </button>
          <button onClick={() => scrollToSection('how-it-works')} className="hover:text-cyan-400 transition-colors">
            Workflow
          </button>
          <button onClick={() => scrollToSection('mini-demo')} className="hover:text-cyan-400 transition-colors">
            Interactive Lab
          </button>
          <button onClick={() => scrollToSection('research')} className="hover:text-cyan-400 transition-colors">
            Standards
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActivePage('overview')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white text-xs font-mono font-bold tracking-wide shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all hover:scale-[1.02]"
          >
            <span>ENTER CONSOLE</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ========================================================
          SECTION 1 — HERO
      ======================================================== */}
      <section id="hero" className="relative military-grid pt-12 pb-20 px-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Hero Text */}
          <div className="lg:col-span-7 space-y-6">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-400 font-bold">
                DEFENSE SPECIFICATION PS-26228
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">
                MoD / Indian Army DGIS
              </span>
              <span className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-bold flex items-center gap-1.5">
                <Radio className="w-3 h-3 animate-pulse" />
                AIR-GAPPED SOVEREIGN
              </span>
              <span className="px-2.5 py-1 rounded bg-sky-950 border border-sky-500/40 text-sky-300">
                TACTICAL CV ASSURANCE
              </span>
            </div>

            {/* Title & Tagline */}
            <div>
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight uppercase telemetry-mono leading-tight">
                TRUST-CV
              </h1>
              <div className="text-lg sm:text-xl font-bold text-cyan-400 mt-1.5 font-mono">
                Unified AI Integrity Assurance Layer
              </div>
              <p className="text-base sm:text-lg font-semibold text-slate-200 mt-2 italic font-serif">
                &ldquo;Trust the Data. Verify the Model. Prove the Output.&rdquo;
              </p>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
              An air-gapped, evidence-driven assurance layer for securing computer-vision pipelines across training data, AI models, inference outputs, cryptographic provenance, and environmental distribution shifts in high-stakes defense operations.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => setActivePage('overview')}
                className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all hover:scale-[1.02]"
              >
                <span>ENTER COMMAND CONSOLE</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => scrollToSection('problem')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-slate-300 font-mono text-sm font-semibold transition-all"
              >
                <span>EXPLORE ARCHITECTURE</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setShowDemoModal(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border border-cyan-500/40 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-300 font-mono text-xs font-semibold transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current text-cyan-400" />
                <span>SYSTEM TOUR</span>
              </button>
            </div>
          </div>

          {/* Right Column: Live Telemetry Pipeline Card */}
          <div className="lg:col-span-5">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden glow-card">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-[11px] font-mono font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Live Pipeline Telemetry
                </span>
                <span className="text-[10px] font-mono text-slate-500">SOVEREIGN NODE: DGIS-01</span>
              </div>

              {/* Vertical Pipeline Flow */}
              <div className="space-y-2.5 mt-3.5 font-mono text-xs">
                {[
                  { name: 'DATA BOUNDARY', status: state.dataset?.status || 'NOT ANALYZED', color: state.dataset?.status === 'VERIFIED' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/50' : 'text-slate-400 border-slate-700/30 bg-slate-900/50', metric: state.dataset ? `${state.dataset.integrityScore}% Score` : 'No Data' },
                  { name: 'MODEL BOUNDARY', status: state.model ? (state.model.fingerprintStatus === 'MATCH' && state.model.triggerRisk === 'LOW' ? 'VERIFIED' : 'ANOMALY') : 'NOT ANALYZED', color: state.model?.fingerprintStatus === 'MATCH' && state.model?.triggerRisk === 'LOW' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/50' : 'text-slate-400 border-slate-700/30 bg-slate-900/50', metric: state.model ? state.model.fingerprintStatus : 'No Model' },
                  { name: 'INFERENCE BITSTREAM', status: state.inference ? (state.inference.sealStatus === 'VERIFIED' ? 'SIGNED' : 'TAMPERED') : 'NOT AVAILABLE', color: state.inference?.sealStatus === 'VERIFIED' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/50' : 'text-slate-400 border-slate-700/30 bg-slate-900/50', metric: state.inference ? (state.inference.sealStatus === 'VERIFIED' ? 'Pixel Seal Valid' : 'Seal Compromised') : 'No Inference' },
                  { name: 'PROVENANCE CHAIN', status: state.inference ? (state.inference.sealStatus === 'VERIFIED' ? 'VERIFIED' : 'BROKEN') : 'NOT AVAILABLE', color: state.inference?.sealStatus === 'VERIFIED' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/50' : 'text-slate-400 border-slate-700/30 bg-slate-900/50', metric: state.inference ? 'Ed25519 Bound' : 'Pending' },
                  { name: 'DISTRIBUTION SHIFT', status: state.distribution ? (state.distribution.currentScenario === 'NORMAL' ? 'NORMAL' : state.distribution.currentScenario === 'ADVERSARIAL_INPUT' ? 'MALICIOUS' : 'DRIFT') : 'NOT ANALYZED', color: state.distribution?.currentScenario === 'NORMAL' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/50' : 'text-slate-400 border-slate-700/30 bg-slate-900/50', metric: state.distribution ? `MMD: ${state.distribution.scenarios[state.distribution.currentScenario]?.mmd ?? 0}` : 'No Baseline' },
                ].map((st, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-slate-300 text-[11px]">{st.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">{st.metric}</span>
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${st.color}`}>
                        {st.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Fused Governance Result */}
              <div className="mt-3.5 pt-3 border-t border-slate-800">
                <div className="text-[10px] font-mono text-slate-500 uppercase mb-1">
                  AUTONOMOUS GOVERNANCE CONSENSUS
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-cyan-400" />
                    <span className="font-mono text-xs font-bold text-white">GOVERNANCE VERDICT:</span>
                  </div>
                  <StatusBadge status={state.governance?.status || 'REVIEW'} type="decision" size="sm" />
                </div>
                <div className="mt-2 text-[10px] font-mono text-slate-400 text-center">
                  Policy: <strong className="text-emerald-400">ACCEPT</strong> | <strong className="text-amber-400">REVIEW</strong> | <strong className="text-rose-400">QUARANTINE</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 2 — THE PROBLEM
      ======================================================== */}
      <section id="problem" className="py-20 px-6 border-b border-slate-800 bg-slate-950/60">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-mono text-cyan-400 uppercase font-bold tracking-widest px-2.5 py-1 rounded bg-cyan-950/50 border border-cyan-500/30">
              DEFENSE THREAT TAXONOMY
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase telemetry-mono">
              Why AI Accuracy Is Not Enough
            </h2>
            <p className="text-sm text-slate-300 font-medium">
              &ldquo;High model accuracy does not by itself establish the integrity of the data, model, inference output, or provenance chain.&rdquo;
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 01 */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="text-xs font-mono font-bold text-cyan-400">01</span>
                  <Database className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight mt-2.5">
                  Data Integrity
                </h3>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Training datasets aggregated from multiple vendors can carry:
                </p>
                <ul className="mt-2.5 space-y-1 text-xs font-mono text-slate-300">
                  <li className="flex items-center gap-1.5">
                    <span className="text-rose-400">•</span> Clean-label poisoned samples
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-rose-400">•</span> Systematic mislabeling
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-rose-400">•</span> Duplicate perceptual flooding
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-rose-400">•</span> Out-of-distribution (OOD) noise
                  </li>
                </ul>
              </div>
              <div className="text-[10px] font-mono text-slate-500 pt-2.5 border-t border-slate-800">
                Risk: Trojan triggers embedded at source
              </div>
            </div>

            {/* Card 02 */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="text-xs font-mono font-bold text-cyan-400">02</span>
                  <Cpu className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight mt-2.5">
                  Model Integrity
                </h3>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Third-party models can be modified in the supply chain to embed:
                </p>
                <ul className="mt-2.5 space-y-1 text-xs font-mono text-slate-300">
                  <li className="flex items-center gap-1.5">
                    <span className="text-rose-400">•</span> Hidden backdoor triggers
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-rose-400">•</span> Anomalous activation clusters
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-rose-400">•</span> Unauthorized weight drifts
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-rose-400">•</span> Model binary substitution
                  </li>
                </ul>
              </div>
              <div className="text-[10px] font-mono text-slate-500 pt-2.5 border-t border-slate-800">
                Risk: Silent target misdirection
              </div>
            </div>

            {/* Card 03 */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="text-xs font-mono font-bold text-cyan-400">03</span>
                  <Fingerprint className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight mt-2.5">
                  Output Integrity
                </h3>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Inference outputs reaching commanders can potentially be:
                </p>
                <ul className="mt-2.5 space-y-1 text-xs font-mono text-slate-300">
                  <li className="flex items-center gap-1.5">
                    <span className="text-rose-400">•</span> Modified post-generation
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-rose-400">•</span> Injected with phantom targets
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-rose-400">•</span> Replayed from older sorties
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-rose-400">•</span> Severed from valid provenance
                  </li>
                </ul>
              </div>
              <div className="text-[10px] font-mono text-slate-500 pt-2.5 border-t border-slate-800">
                Risk: Man-in-the-middle target spoofing
              </div>
            </div>

            {/* Card 04 */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="text-xs font-mono font-bold text-cyan-400">04</span>
                  <CloudSun className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight mt-2.5">
                  Environmental Shift
                </h3>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Physical variations degrade computer vision without malicious intent:
                </p>
                <ul className="mt-2.5 space-y-1 text-xs font-mono text-slate-300">
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-400">•</span> Fog, rain &amp; atmospheric scatter
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-400">•</span> Low-light night operations
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-400">•</span> Glacial snow albedo glare
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-amber-400">•</span> Sensor EO/IR payload swaps
                  </li>
                </ul>
              </div>
              <div className="text-[10px] font-mono text-amber-400 pt-2.5 border-t border-slate-800">
                Distinguishes weather from attacks (REVIEW)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 3 — THE CORE IDEA
      ======================================================== */}
      <section id="core-idea" className="py-20 px-6 border-b border-slate-800 military-grid">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono text-cyan-400 uppercase font-bold tracking-widest px-2.5 py-1 rounded bg-cyan-950/40 border border-cyan-500/30">
              PARADIGM SHIFT IN DEFENSE AI
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase telemetry-mono">
              The TRUST-CV Core Idea
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Old Paradigm */}
            <div className="p-7 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono text-slate-500 uppercase font-bold">CONVENTIONAL VALIDATION ASKS:</div>
                <div className="text-2xl font-black text-slate-300 mt-2 font-mono">
                  &ldquo;IS THE MODEL ACCURATE?&rdquo;
                </div>
                <div className="mt-4 text-xs text-slate-400 leading-relaxed space-y-2">
                  <p>• Only evaluates static test split metrics.</p>
                  <p>• Assumes training data was pristine and unpoisoned.</p>
                  <p>• Assumes deployed weights match development checkpoints.</p>
                  <p>• Blind to post-inference pixel manipulation.</p>
                  <p>• Treats every physical distribution drop as model failure.</p>
                </div>
              </div>
              <div className="mt-6 p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs font-mono">
                Result: A 99.4% accurate model can carry a devastating Trojan backdoor.
              </div>
            </div>

            {/* TRUST-CV Paradigm */}
            <div className="p-7 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-slate-950 border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.12)] flex flex-col justify-between glow-card">
              <div>
                <div className="text-xs font-mono text-cyan-400 uppercase font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  TRUST-CV ASKS:
                </div>
                <div className="text-2xl font-black text-white mt-2 font-mono">
                  &ldquo;CAN THE ENTIRE AI PIPELINE BE TRUSTED?&rdquo;
                </div>
                <div className="mt-4 text-xs text-slate-300 leading-relaxed space-y-2">
                  <p>• Validates <strong>Training Data Lineage</strong> &amp; spectral signatures.</p>
                  <p>• Verifies <strong>Weight Cryptographic Hashes</strong> &amp; TrojAI activations.</p>
                  <p>• Cryptographically binds <strong>Output Pixels</strong> via Steganographic Seal.</p>
                  <p>• Distinguishes <strong>Weather Shift</strong> from adversarial perturbation.</p>
                  <p>• Enforces <strong>Tri-State Governance</strong> backed by audit evidence.</p>
                </div>
              </div>
              <div className="mt-6 p-3 rounded-lg bg-cyan-950/50 border border-cyan-500/40 text-cyan-200 text-xs font-mono font-bold">
                Formula: DATA + MODEL + OUTPUT + PROVENANCE + ENVIRONMENT → EVIDENCE → GOVERNANCE
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 4 — FIVE INTEGRATED ENGINES
      ======================================================== */}
      <section id="engines" className="py-20 px-6 border-b border-slate-800 bg-slate-950/60">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-xs font-mono text-cyan-400 uppercase font-bold tracking-widest px-2.5 py-1 rounded bg-cyan-950/40 border border-cyan-500/30">
              MODULAR DEFENSIVE ARCHITECTURE
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase telemetry-mono">
              One System. Five Integrated Assurance Engines.
            </h2>
            <p className="text-xs text-slate-400">
              Click any engine to launch directly into that live module in the command console.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Engine 1 */}
            <div
              onClick={() => setActivePage('data')}
              className="group cursor-pointer p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60 transition-all flex flex-col justify-between space-y-3 glow-card"
            >
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">ENGINE 01</span>
                  <Database className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight mt-2.5 group-hover:text-cyan-300 transition-colors">
                  Data Integrity Engine
                </h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Detects and analyzes simulated poisoning, duplicate flooding, OOD insertion, spectral anomalies, and contributor-level risk across multi-vendor datasets.
                </p>
              </div>
              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-cyan-400">
                <span>Inspect Data Engine →</span>
                <span className="text-slate-500">12,480 samples</span>
              </div>
            </div>

            {/* Engine 2 */}
            <div
              onClick={() => setActivePage('model')}
              className="group cursor-pointer p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60 transition-all flex flex-col justify-between space-y-3 glow-card"
            >
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">ENGINE 02</span>
                  <Cpu className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight mt-2.5 group-hover:text-cyan-300 transition-colors">
                  Model Integrity Engine
                </h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Analyzes model fingerprints (FIPS 180-4 SHA-256), weight statistics, activation behavior, hidden-trigger indicators (NIST TrojAI), and black-box consistency.
                </p>
              </div>
              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-cyan-400">
                <span>Inspect Model Engine →</span>
                <span className="text-slate-500">32-Channel Heatmap</span>
              </div>
            </div>

            {/* Engine 3 */}
            <div
              onClick={() => setActivePage('inference')}
              className="group cursor-pointer p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60 transition-all flex flex-col justify-between space-y-3 glow-card"
            >
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">ENGINE 03</span>
                  <Fingerprint className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight mt-2.5 group-hover:text-cyan-300 transition-colors">
                  Provenance Engine
                </h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Binds input, model, configuration, and output into a cryptographically verifiable provenance chain with Steganographic Pixel Seals and Temporal Merkle Trees.
                </p>
              </div>
              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-cyan-400">
                <span>Inspect Provenance →</span>
                <span className="text-slate-500">Ed25519 Signed</span>
              </div>
            </div>

            {/* Engine 4 */}
            <div
              onClick={() => setActivePage('distribution')}
              className="group cursor-pointer p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60 transition-all flex flex-col justify-between space-y-3 glow-card"
            >
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">ENGINE 04</span>
                  <CloudSun className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight mt-2.5 group-hover:text-cyan-300 transition-colors">
                  Distribution Shift Engine
                </h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Uses Maximum Mean Discrepancy (MMD) and Wasserstein Distance to characterize environmental changes and distinguish physical drift from adversarial perturbation.
                </p>
              </div>
              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-cyan-400">
                <span>Inspect Distribution →</span>
                <span className="text-slate-500">6 Scenarios</span>
              </div>
            </div>

            {/* Engine 5 */}
            <div
              onClick={() => setActivePage('overview')}
              className="group cursor-pointer p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60 transition-all flex flex-col justify-between space-y-3 glow-card md:col-span-2 lg:col-span-1"
            >
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                  <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">ENGINE 05</span>
                  <Scale className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight mt-2.5 group-hover:text-cyan-300 transition-colors">
                  Governance Engine
                </h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Converts evidence into three actionable, understandable military operational states: ACCEPT, REVIEW, and QUARANTINE with confidence-backed consensus.
                </p>
              </div>
              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-cyan-400">
                <span>Inspect Governance →</span>
                <span className="text-slate-500">Tri-State Policy</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 5 — HOW TRUST-CV WORKS
      ======================================================== */}
      <section id="how-it-works" className="py-20 px-6 border-b border-slate-800 military-grid">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-xs font-mono text-cyan-400 uppercase font-bold tracking-widest px-2.5 py-1 rounded bg-cyan-950/40 border border-cyan-500/30">
              OPERATIONAL LIFECYCLE
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase telemetry-mono">
              How TRUST-CV Works
            </h2>
            <p className="text-xs text-slate-400">
              Six synchronized steps from raw sensor ingestion to immutable defense audit logging.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            {[
              { num: '01', title: 'INGEST', desc: 'Data, model weights, configuration, and inference artifacts enter the air-gapped pipeline with hardware timestamps.' },
              { num: '02', title: 'ANALYZE', desc: 'Integrity engines inspect available evidence across dataset partitions and model activation layers.' },
              { num: '03', title: 'VERIFY', desc: 'Provenance, cryptographic SHA-256 hashes, Ed25519 signatures, and pixel watermarks are verified.' },
              { num: '04', title: 'CORRELATE', desc: 'Environmental shift metrics (MMD / Wasserstein) and behavioral evidence are fused together.' },
              { num: '05', title: 'DECIDE', desc: 'Governance engine enacts tri-state policy: ACCEPT (nominal), REVIEW (weather), or QUARANTINE (tamper).' },
              { num: '06', title: 'AUDIT', desc: 'Complete evidence trail is committed to the hash-chained, non-repudiation sovereign audit vault.' },
            ].map(step => (
              <div key={step.num} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-2">
                <div>
                  <div className="text-base font-black text-cyan-400 font-mono">{step.num}</div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mt-1">{step.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 6 — KEY TECHNICAL INNOVATIONS
      ======================================================== */}
      <section className="py-20 px-6 border-b border-slate-800 bg-slate-950/60">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-xs font-mono text-cyan-400 uppercase font-bold tracking-widest px-2.5 py-1 rounded bg-cyan-950/40 border border-cyan-500/30">
              CORE CAPABILITIES
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase telemetry-mono">
              Key Technical Innovations
            </h2>
            <p className="text-xs text-slate-400">
              Defensive cryptographic architectures designed for sovereign tactical edge environments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <Eye className="w-5 h-5 text-cyan-400 mb-2" />
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                  Visual Cryptographic Seals
                </h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Pixel-level steganographic sealing of inference outputs. Bounding coordinate flips collapse the recovered Ed25519 signature.
                </p>
              </div>
              <div className="text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800">
                LSB watermarking • Anti-tamper
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <Layers className="w-5 h-5 text-cyan-400 mb-2" />
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                  Temporal Merkle Trees
                </h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Temporal aggregation of 60 FPS video frame metadata into per-second hash structures, slashing ledger storage overhead by 99.9%.
                </p>
              </div>
              <div className="text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800">
                Low-bandwidth tactical links
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <Key className="w-5 h-5 text-cyan-400 mb-2" />
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                  Active Provenance Markers
                </h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Cryptographic markers and nonces used to immediately catch unauthorized supply-chain data substitution or unauthorized checkpoint swaps.
                </p>
              </div>
              <div className="text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800">
                Non-repudiation • Supply chain
              </div>
            </div>

            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3">
              <div>
                <Radio className="w-5 h-5 text-cyan-400 mb-2" />
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                  Air-Gapped Update Workflow
                </h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Offline Sneakernet protocol utilizing read-only physical hardware tokens and YubiKey FIPS 140-3 authentication to deploy threat signatures without public internet.
                </p>
              </div>
              <div className="text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800">
                100% Isolated military operations
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 7 — GOVERNANCE
      ======================================================== */}
      <section className="py-20 px-6 border-b border-slate-800 military-grid">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="text-xs font-mono text-cyan-400 uppercase font-bold tracking-widest px-2.5 py-1 rounded bg-cyan-950/40 border border-cyan-500/30">
              ACTIONABLE DECISION ENGINE
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase telemetry-mono">
              From Technical Signals to Actionable Decisions
            </h2>
            <p className="text-xs text-slate-400">
              TRUST-CV translates complex telemetry into unambiguous military command states.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ACCEPT */}
            <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                  <h3 className="text-base font-black text-white font-mono uppercase">ACCEPT</h3>
                </div>
                <div className="text-xs font-bold text-emerald-400 mt-1 uppercase font-mono">
                  Full Pipeline Verified
                </div>
                <ul className="mt-4 space-y-2 text-xs font-mono text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    Verified sovereign provenance
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    Zero significant integrity anomalies
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    Normal environmental baseline (MMD &lt; 0.15)
                  </li>
                </ul>
              </div>
              <div className="p-2.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-[11px] text-emerald-300 font-mono">
                System action: Forward targeting output to commander.
              </div>
            </div>

            {/* REVIEW */}
            <div className="p-6 rounded-xl bg-amber-950/20 border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-6 h-6 text-amber-400" />
                  <h3 className="text-base font-black text-white font-mono uppercase">REVIEW</h3>
                </div>
                <div className="text-xs font-bold text-amber-400 mt-1 uppercase font-mono">
                  Analyst Assessment Needed
                </div>
                <ul className="mt-4 space-y-2 text-xs font-mono text-slate-300">
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    Statistical anomaly detected
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    Evidence requires analyst verification
                  </li>
                  <li className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    Physical environmental shift (fog, rain, night)
                  </li>
                </ul>
              </div>
              <div className="p-2.5 rounded bg-amber-950/60 border border-amber-500/30 text-[11px] text-amber-300 font-mono">
                System action: Flag for secondary validation without aborting.
              </div>
            </div>

            {/* QUARANTINE */}
            <div className="p-6 rounded-xl bg-rose-950/20 border border-rose-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldX className="w-6 h-6 text-rose-400" />
                  <h3 className="text-base font-black text-white font-mono uppercase">QUARANTINE</h3>
                </div>
                <div className="text-xs font-bold text-rose-400 mt-1 uppercase font-mono">
                  Critical Trust Breach Enacted
                </div>
                <ul className="mt-4 space-y-2 text-xs font-mono text-slate-300">
                  <li className="flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    Pixel Seal signature failure or tamper
                  </li>
                  <li className="flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    Model Trojan backdoor activation cluster
                  </li>
                  <li className="flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    Strong evidence of supply-chain sabotage
                  </li>
                </ul>
              </div>
              <div className="p-2.5 rounded bg-rose-950/60 border border-rose-500/30 text-[11px] text-rose-300 font-mono">
                System action: Isolate artifact, alert security officer, record audit.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 8 & 9 — TECHNICAL & RESEARCH STANDARDS
      ======================================================== */}
      <section id="research" className="py-20 px-6 border-b border-slate-800 bg-slate-950/60">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Technical Foundation */}
          <div className="space-y-6">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <span className="text-xs font-mono text-cyan-400 uppercase font-bold tracking-widest px-2.5 py-1 rounded bg-cyan-950/40 border border-cyan-500/30">
                ARCHITECTURAL STANDARDS
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase telemetry-mono">
                Technical Foundation
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-mono text-xs">
              {[
                { name: 'SHA-256', role: 'Cryptographic Hashing' },
                { name: 'Ed25519 / EdDSA', role: 'Digital Signatures' },
                { name: 'Temporal Merkle Trees', role: 'Tamper-Evident Structures' },
                { name: 'MMD', role: 'Distribution Shift' },
                { name: 'Wasserstein Distance', role: 'Distribution Shift' },
                { name: 'Activation Analysis', role: 'Model Integrity' },
                { name: 'Model Fingerprinting', role: 'Model Integrity' },
                { name: 'Metamorphic Testing', role: 'Black-Box Assurance' },
                { name: 'Air-Gapped Execution', role: 'Deployment Security' },
                { name: 'Steganographic LSB', role: 'Output Seal Binding' }
              ].map((tech, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="font-bold text-cyan-400">{tech.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{tech.role}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Research Foundation */}
          <div className="space-y-6 pt-6 border-t border-slate-800">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <span className="text-xs font-mono text-cyan-400 uppercase font-bold tracking-widest px-2.5 py-1 rounded bg-cyan-950/40 border border-cyan-500/30">
                DEFENSE &amp; ACADEMIC BENCHMARKS
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase telemetry-mono">
                Research-Backed Design
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {RESEARCH_REFERENCES.slice(0, 6).map(ref => (
                <div key={ref.code} className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs">
                  <div className="flex items-center justify-between text-cyan-400 font-bold mb-1">
                    <span>{ref.code}</span>
                    <span className="text-[10px] text-slate-500 uppercase">{ref.organization}</span>
                  </div>
                  <div className="text-white font-semibold text-xs mt-1">{ref.title}</div>
                  <div className="text-slate-400 text-[10px] mt-1.5 leading-relaxed">{ref.focus}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 10 — MINI INTERACTIVE DEMO (REUSES GLOBAL STATE)
      ======================================================== */}
      <section id="mini-demo" className="py-20 px-6 border-b border-slate-800 military-grid">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono text-cyan-400 uppercase font-bold tracking-widest px-2.5 py-1 rounded bg-cyan-950/40 border border-cyan-500/30">
              LIVE SIMULATION HARNESS
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase telemetry-mono">
              See TRUST-CV in Action
            </h2>
            <p className="text-xs text-slate-400 max-w-xl mx-auto">
              Trigger any defensive integrity simulation below. The real-time evidence engine updates immediately and seamlessly carries through into the main console.
            </p>
          </div>

          {/* Simulation Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => handleMiniSimulation('DATA POISONING', simulatePoisoning)}
              className="p-3 rounded-lg border border-rose-500/40 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 font-mono text-xs font-bold transition-all text-center"
            >
              [SIMULATE DATA POISONING]
            </button>

            <button
              onClick={() => handleMiniSimulation('MODEL BACKDOOR', simulateBackdoor)}
              className="p-3 rounded-lg border border-rose-500/40 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 font-mono text-xs font-bold transition-all text-center"
            >
              [SIMULATE MODEL BACKDOOR]
            </button>

            <button
              onClick={() => handleMiniSimulation('OUTPUT TAMPERING', simulateTampering)}
              className="p-3 rounded-lg border border-rose-500/40 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 font-mono text-xs font-bold transition-all text-center"
            >
              [SIMULATE OUTPUT TAMPERING]
            </button>

            <button
              onClick={() => handleMiniSimulation('ENVIRONMENTAL SHIFT', () => setDistributionScenario('WEATHER'))}
              className="p-3 rounded-lg border border-amber-500/40 bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 font-mono text-xs font-bold transition-all text-center"
            >
              [SIMULATE ENV SHIFT]
            </button>
          </div>

          {/* Live Reactive Telemetry Feedback Card */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="font-mono text-xs font-bold uppercase text-white">
                  Current Threat Reaction: {activeMiniSim || 'Clean Sovereign Baseline'}
                </span>
              </div>

              <button
                onClick={() => {
                  resetSystem();
                  setActiveMiniSim(null);
                }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-mono"
              >
                <RefreshCw className="w-3 h-3" />
                Reset Baseline
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 rounded bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">PIXEL SEAL</span>
                <span className={`text-sm font-bold mt-1 block ${state.inference?.sealStatus === 'VERIFIED' ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {state.inference?.sealStatus || 'NOT AVAILABLE'}
                </span>
              </div>

              <div className="p-3 rounded bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">OUTPUT HASH</span>
                <span className={`text-sm font-bold mt-1 block ${state.inference?.sealStatus === 'VERIFIED' ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {state.inference?.sealStatus === 'VERIFIED' ? 'MATCH' : 'N/A'}
                </span>
              </div>

              <div className="p-3 rounded bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">GOVERNANCE VERDICT</span>
                <div className="mt-1">
                  <StatusBadge status={state.governance?.status || 'REVIEW'} type="decision" size="sm" />
                </div>
              </div>

              <div className="p-3 rounded bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">AUDIT JOURNAL</span>
                <span className="text-sm font-bold text-cyan-400 mt-1 block">
                  COMMITTED ({state.auditEvents[0]?.id || 'NONE'})
                </span>
              </div>
            </div>

            <div className="p-3 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
              <span className="text-slate-500 uppercase font-bold text-[10px] block">LATEST EVIDENCE:</span>
              <div className="text-white mt-0.5">{state.governance?.reason || 'No evidence evaluated yet.'}</div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActivePage('overview')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                <span>ENTER CONSOLE WITH THIS STATE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 11 — PROJECT VALUE
      ======================================================== */}
      <section className="py-20 px-6 border-b border-slate-800 bg-slate-950/60">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono text-cyan-400 uppercase font-bold tracking-widest px-2.5 py-1 rounded bg-cyan-950/40 border border-cyan-500/30">
              HIGH-STAKES ASSURANCE
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase telemetry-mono">
              What TRUST-CV Assures
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <div className="text-xs font-mono font-bold text-cyan-400 uppercase">DATA ASSURANCE</div>
              <p className="text-sm font-semibold text-slate-200">
                &ldquo;Can we trust what the model learned from?&rdquo;
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <div className="text-xs font-mono font-bold text-cyan-400 uppercase">MODEL ASSURANCE</div>
              <p className="text-sm font-semibold text-slate-200">
                &ldquo;Can we trust the model that was supplied?&rdquo;
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <div className="text-xs font-mono font-bold text-cyan-400 uppercase">OUTPUT ASSURANCE</div>
              <p className="text-sm font-semibold text-slate-200">
                &ldquo;Can we prove the output has not been altered?&rdquo;
              </p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <div className="text-xs font-mono font-bold text-cyan-400 uppercase">ENVIRONMENTAL ASSURANCE</div>
              <p className="text-sm font-semibold text-slate-200">
                &ldquo;Is the observed anomaly malicious, or is the environment simply different?&rdquo;
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-cyan-950/40 border border-cyan-500/40 text-center font-mono font-black text-sm text-cyan-300 tracking-wider">
            ONE UNIFIED EVIDENCE LAYER FOR SOVEREIGN DEFENSE COMPUTER VISION
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 12 — FINAL CTA
      ======================================================== */}
      <section className="py-24 px-6 border-b border-slate-800 military-grid relative">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(6,182,212,0.25)]">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase telemetry-mono">
              TRUST-CV
            </h2>
            <div className="text-base font-bold text-cyan-400 font-mono">
              Unified AI Integrity Assurance Layer
            </div>
            <p className="text-base text-slate-300 italic font-serif pt-1">
              &ldquo;Verify the pipeline. Protect the evidence. Trust the output.&rdquo;
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-xs text-slate-400">
            <span className="px-3 py-1 rounded bg-slate-900 border border-slate-800">
              Defense Specification PS-26228
            </span>
            <span className="px-3 py-1 rounded bg-slate-900 border border-slate-800">
              Ministry of Defence / Indian Army DGIS
            </span>
            <span className="px-3 py-1 rounded bg-slate-900 border border-slate-800">
              Theme: Blockchain &amp; Cybersecurity
            </span>
            <span className="px-3 py-1 rounded bg-slate-900 border border-slate-800">
              Category: Software
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setActivePage('overview')}
              className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all hover:scale-[1.02]"
            >
              <span>ENTER COMMAND CONSOLE</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleLaunchTour}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-cyan-500/50 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 font-mono text-sm font-semibold transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            >
              <Play className="w-4 h-4 fill-current text-cyan-400" />
              <span>RUN SYSTEM TOUR</span>
            </button>

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-mono text-xs font-semibold transition-all"
            >
              <ArrowUp className="w-4 h-4" />
              <span>BACK TO TOP</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================
          SOLID DEFENSE FOOTER
      ======================================================== */}
      <footer className="py-6 px-6 bg-[#070A10] border-t border-slate-800 text-center text-xs font-mono text-slate-500 space-y-2">
        <p className="text-slate-400 font-medium">
          Ministry of Defence / Indian Army DGIS • TRUST-CV Autonomous AI Integrity Assurance Layer (PS-26228)
        </p>
        <p className="text-[11px] text-slate-600">
          Air-Gapped Sovereign Security Corridor • FIPS 180-4 SHA-256 &amp; FIPS 186-5 Ed25519 Architecture
        </p>
      </footer>

      {/* Verification Tour Modal */}
      <DemoRunnerModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
      />
    </div>
  );
};

export default LandingPage;
