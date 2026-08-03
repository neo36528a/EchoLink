import React from 'react';
import { Button } from '../common/Button';
import { Mic, Zap, ShieldCheck, PlusCircle, LogIn, Radio } from 'lucide-react';

interface HeroSectionProps {
  onOpenCreate: () => void;
  onOpenJoin: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenCreate, onOpenJoin }) => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
      {/* Dynamic Background Glow Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-wider uppercase mb-8 shadow-lg shadow-cyan-500/10 animate-fade-in">
        <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
        <span>Ultra-Low Latency Voice & Text Mesh</span>
      </div>

      {/* Main Heading */}
      <h1 className="text-4xl md:text-6xl font-extrabold text-center text-white tracking-tight max-w-4xl leading-tight mb-6">
        Continuous High-Quality <br />
        <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-500 bg-clip-text text-transparent glow-text-cyan">
          Voice Rooms for Everyone
        </span>
      </h1>

      <p className="text-slate-400 text-base md:text-lg text-center max-w-2xl mb-10 leading-relaxed">
        Instantly create private rooms for gaming, studying, or team collaboration. No registration required. WebRTC P2P low latency voice and real-time text chat.
      </p>

      {/* Action CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 z-10">
        <Button
          onClick={onOpenCreate}
          variant="primary"
          size="lg"
          icon={<PlusCircle className="w-5 h-5" />}
          className="w-full sm:w-auto px-8"
        >
          Create Instant Room
        </Button>
        <Button
          onClick={onOpenJoin}
          variant="glass"
          size="lg"
          icon={<LogIn className="w-5 h-5" />}
          className="w-full sm:w-auto px-8"
        >
          Join with Room Code or Name
        </Button>
      </div>

      {/* Feature Highlights Grid (3 Columns, File Sharing Removed) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full z-10">
        <div className="glass-card rounded-2xl p-6 flex flex-col gap-3 hover:border-cyan-500/30 transition-all">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 w-fit">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Sub-100ms Latency</h3>
          <p className="text-xs text-slate-400 leading-relaxed">Direct WebRTC P2P mesh audio connection without central audio server delays.</p>
        </div>

        <div className="glass-card rounded-2xl p-6 flex flex-col gap-3 hover:border-cyan-500/30 transition-all">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 w-fit">
            <Mic className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Smart Audio DSP</h3>
          <p className="text-xs text-slate-400 leading-relaxed">Built-in Echo Cancellation, Noise Suppression, Auto Gain Control & Live Visualizers.</p>
        </div>

        <div className="glass-card rounded-2xl p-6 flex flex-col gap-3 hover:border-cyan-500/30 transition-all">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 w-fit">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Private & Temporary</h3>
          <p className="text-xs text-slate-400 leading-relaxed">Guest mode first. Optional password protection & automatic room destruction.</p>
        </div>
      </div>
    </div>
  );
};
