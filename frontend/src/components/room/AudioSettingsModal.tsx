import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useMediaDevices } from '../../hooks/useMediaDevices';
import { useAudioVisualizer } from '../../hooks/useAudioVisualizer';
import { AudioSettings } from '../../types';
import { Mic, Volume2, Sliders, Check } from 'lucide-react';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AudioSettings;
  onSave: (settings: AudioSettings) => void;
  localStream: MediaStream | null;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  localStream,
}) => {
  const { microphones, speakers } = useMediaDevices();
  const [currentSettings, setCurrentSettings] = React.useState<AudioSettings>(settings);

  // Monitor live mic volume for test bar
  const { volume } = useAudioVisualizer(localStream);

  React.useEffect(() => {
    setCurrentSettings(settings);
  }, [settings, isOpen]);

  const handleSave = () => {
    onSave(currentSettings);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Audio & Device Settings">
      <div className="flex flex-col gap-5">
        {/* Microphone Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-cyan-400" /> Microphone Input
          </label>
          <select
            value={currentSettings.selectedMic}
            onChange={(e) => setCurrentSettings({ ...currentSettings, selectedMic: e.target.value })}
            className="glass-input rounded-xl px-3.5 py-2.5 text-sm bg-slate-900 border border-white/10 text-white focus:border-cyan-400"
          >
            <option value="default">Default Microphone</option>
            {microphones.map((mic) => (
              <option key={mic.deviceId} value={mic.deviceId}>
                {mic.label}
              </option>
            ))}
          </select>
        </div>

        {/* Live Mic Test Meter */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Microphone Input Test</span>
            <span className="font-mono text-cyan-400">{volume}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-75"
              style={{ width: `${volume}%` }}
            />
          </div>
        </div>

        {/* Speaker Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> Speaker Output
          </label>
          <select
            value={currentSettings.selectedSpeaker}
            onChange={(e) => setCurrentSettings({ ...currentSettings, selectedSpeaker: e.target.value })}
            className="glass-input rounded-xl px-3.5 py-2.5 text-sm bg-slate-900 border border-white/10 text-white focus:border-cyan-400"
          >
            <option value="default">Default Speaker</option>
            {speakers.map((spk) => (
              <option key={spk.deviceId} value={spk.deviceId}>
                {spk.label}
              </option>
            ))}
          </select>
        </div>

        {/* Audio Processing Toggles */}
        <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" /> Audio Processing DSP
          </h4>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-200">Echo Cancellation</span>
            <input
              type="checkbox"
              checked={currentSettings.echoCancellation}
              onChange={(e) =>
                setCurrentSettings({ ...currentSettings, echoCancellation: e.target.checked })
              }
              className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-200">Noise Suppression</span>
            <input
              type="checkbox"
              checked={currentSettings.noiseSuppression}
              onChange={(e) =>
                setCurrentSettings({ ...currentSettings, noiseSuppression: e.target.checked })
              }
              className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-200">Automatic Gain Control</span>
            <input
              type="checkbox"
              checked={currentSettings.autoGainControl}
              onChange={(e) =>
                setCurrentSettings({ ...currentSettings, autoGainControl: e.target.checked })
              }
              className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} icon={<Check className="w-4 h-4" />}>
            Apply Settings
          </Button>
        </div>
      </div>
    </Modal>
  );
};
