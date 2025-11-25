import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { Loader2, Camera, Upload, User, Sparkles, Leaf } from "lucide-react";
import { toast } from "sonner";

interface ProfileSetupDialogProps {
  open: boolean;
  onComplete: () => void;
  currentName?: string;
  currentAvatarUrl?: string | null;
  needsUsername?: boolean;
  needsAvatar?: boolean;
}

export function ProfileSetupDialog({ 
  open, 
  onComplete, 
  currentName, 
  currentAvatarUrl,
  needsUsername = true,
  needsAvatar = true,
}: ProfileSetupDialogProps) {
  const [name, setName] = useState(currentName || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Start with the appropriate step based on what's needed
  const [step, setStep] = useState<"name" | "avatar">(needsUsername ? "name" : "avatar");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setName(currentName || "");
      setStep(needsUsername ? "name" : "avatar");
    }
  }, [open, currentName, needsUsername]);

  const updateProfileMutation = trpc.profile.updateProfile.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      utils.profile.getProfile.invalidate();
      if (step === "name") {
        // If avatar is needed, go to avatar step; otherwise complete
        if (needsAvatar) {
          setStep("avatar");
        } else {
          toast.success("Profile setup complete! 🎉");
          onComplete();
        }
      }
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  const uploadAvatarMutation = trpc.profile.uploadAvatar.useMutation({
    onSuccess: () => {
      toast.success("Profile setup complete! 🎉");
      utils.auth.me.invalidate();
      utils.profile.getProfile.invalidate();
      onComplete();
    },
    onError: (error) => {
      toast.error(`Failed to upload avatar: ${error.message}`);
    },
  });

  const handleNameSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a username");
      return;
    }
    await updateProfileMutation.mutateAsync({ name: name.trim() });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size exceeds 5MB limit.");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!selectedFile) {
      // Skip avatar - just complete setup
      toast.success("Profile setup complete! 🎉");
      onComplete();
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = (reader.result as string).split(",")[1];
      await uploadAvatarMutation.mutateAsync({
        fileName: selectedFile.name,
        fileData: base64Data,
        contentType: selectedFile.type,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleSkipAvatar = () => {
    toast.success("Profile setup complete! 🎉");
    onComplete();
  };

  const getInitials = (value: string | null | undefined) => {
    if (!value) return "?";
    const parts = value.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return value.substring(0, 2).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-[#1f1b2e] to-[#2d1f33] border-white/10 text-white [&>button]:hidden">
        <DialogHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-weed-green to-weed-coral rounded-full blur-xl opacity-50" />
              <div className="relative bg-black/40 rounded-full p-4">
                {step === "name" ? (
                  <User className="h-10 w-10 text-weed-green" />
                ) : (
                  <Camera className="h-10 w-10 text-weed-green" />
                )}
              </div>
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold text-white">
            {step === "name" 
              ? "Welcome! Set Up Your Profile" 
              : needsUsername 
                ? "Add a Profile Picture" 
                : "Welcome! Add a Profile Picture"
            }
          </DialogTitle>
          <DialogDescription className="text-white/70">
            {step === "name" 
              ? "Choose a username that other players will see in leagues and on leaderboards."
              : needsUsername
                ? "Add a photo so other players can recognize you (optional)."
                : "Add a photo so other players can recognize you in leagues."
            }
          </DialogDescription>
        </DialogHeader>

        {step === "name" ? (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label htmlFor="username" className="text-white/90 text-sm font-medium">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                <Input
                  id="username"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your username"
                  disabled={updateProfileMutation.isPending}
                  className="pl-10 h-12 rounded-2xl border-white/20 bg-black/40 text-white placeholder:text-white/40 focus-visible:ring-weed-green"
                  onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                  autoFocus
                />
              </div>
              <p className="text-xs text-white/50">
                This will be visible to other players in your leagues.
              </p>
            </div>

            <Button
              onClick={handleNameSubmit}
              disabled={updateProfileMutation.isPending || !name.trim()}
              className="w-full h-12 rounded-2xl bg-weed-green text-black font-semibold hover:bg-weed-green/80 transition-all"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  Continue <Sparkles className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-28 w-28 border-4 border-white/20 ring-4 ring-weed-green/20">
                <AvatarImage src={avatarPreview || currentAvatarUrl || undefined} />
                <AvatarFallback className="text-3xl bg-gradient-to-br from-weed-green/30 to-weed-purple/30 text-white">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex flex-col gap-2 w-full">
                {!avatarPreview ? (
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-12 rounded-2xl border-white/20 bg-black/30 text-white hover:bg-black/50"
                  >
                    <Camera className="mr-2 h-5 w-5" /> Choose Photo
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="w-full h-10 rounded-2xl border-white/20 bg-black/30 text-white hover:bg-black/50"
                    >
                      <Camera className="mr-2 h-4 w-4" /> Choose Different Photo
                    </Button>
                  </>
                )}
              </div>

              <p className="text-xs text-white/50 text-center">
                JPEG, PNG, GIF, or WebP. Max 5MB.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleAvatarUpload}
                disabled={uploadAvatarMutation.isPending}
                className="w-full h-12 rounded-2xl bg-weed-green text-black font-semibold hover:bg-weed-green/80"
              >
                {uploadAvatarMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                  </>
                ) : avatarPreview ? (
                  <>
                    <Upload className="mr-2 h-4 w-4" /> Save & Continue
                  </>
                ) : (
                  <>
                    <Leaf className="mr-2 h-4 w-4" /> Continue Without Photo
                  </>
                )}
              </Button>

              {avatarPreview && (
                <Button
                  variant="ghost"
                  onClick={handleSkipAvatar}
                  disabled={uploadAvatarMutation.isPending}
                  className="w-full h-10 rounded-2xl text-white/60 hover:text-white hover:bg-white/5"
                >
                  Skip for now
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Progress indicator - only show if both steps are needed */}
        {needsUsername && needsAvatar && (
          <div className="flex justify-center gap-2 pt-2">
            <div className={`h-2 w-8 rounded-full transition-colors ${step === "name" ? "bg-weed-green" : "bg-white/20"}`} />
            <div className={`h-2 w-8 rounded-full transition-colors ${step === "avatar" ? "bg-weed-green" : "bg-white/20"}`} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

