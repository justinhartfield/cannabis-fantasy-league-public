import { X, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface SleeperDraftSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  autoDraftEnabled: boolean;
  onAutoDraftChange: (enabled: boolean) => void;
}

/**
 * SleeperDraftSettings
 * 
 * Modal for draft settings, primarily the auto-draft toggle.
 */
export function SleeperDraftSettings({
  isOpen,
  onClose,
  autoDraftEnabled,
  onAutoDraftChange,
}: SleeperDraftSettingsProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1a1d29] rounded-2xl w-[90%] max-w-md p-6 border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Draft Settings</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Auto-Draft Setting */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                autoDraftEnabled
                  ? "bg-[#00d4aa]/20 text-[#00d4aa]"
                  : "bg-white/10 text-white/40"
              )}
            >
              <Zap className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-white">Auto-Draft</h3>
                <Switch
                  checked={autoDraftEnabled}
                  onCheckedChange={onAutoDraftChange}
                  className="data-[state=checked]:bg-[#00d4aa]"
                />
              </div>
              <p className="text-sm text-white/60 leading-relaxed">
                When enabled, the system will automatically select the best available player
                based on your roster needs when it's your turn.
              </p>
            </div>
          </div>
        </div>

        {/* Additional Settings Placeholder */}
        <div className="mt-4 p-4 rounded-xl border border-dashed border-white/20 text-center">
          <p className="text-sm text-white/40">More settings coming soon</p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl bg-[#00d4aa] text-black font-semibold hover:bg-[#00e4b8] transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

