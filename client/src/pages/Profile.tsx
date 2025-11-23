import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { Loader2, Upload, Trash2, User, Mail, Camera } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { AchievementsSection } from "@/components/AchievementsSection";

export default function Profile() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = trpc.profile.getProfile.useQuery(
    undefined,
    {
      enabled: isAuthenticated,
      onSuccess: (data) => {
        setName(data.name || "");
        setEmail(data.email || "");
      },
    }
  );

  const updateProfileMutation = trpc.profile.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      refetchProfile();
      utils.auth.me.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });

  const uploadAvatarMutation = trpc.profile.uploadAvatar.useMutation({
    onSuccess: () => {
      toast.success("Avatar uploaded successfully!");
      setAvatarPreview(null);
      setSelectedFile(null);
      refetchProfile();
    },
    onError: (error) => {
      toast.error(`Failed to upload avatar: ${error.message}`);
    },
  });

  const deleteAvatarMutation = trpc.profile.deleteAvatar.useMutation({
    onSuccess: () => {
      toast.success("Avatar removed successfully!");
      refetchProfile();
    },
    onError: (error) => {
      toast.error(`Failed to remove avatar: ${error.message}`);
    },
  });

  if (!authLoading && !isAuthenticated) {
    const loginUrl = getLoginUrl();
    if (loginUrl) window.location.href = loginUrl;
    else window.location.href = "/login";
    return null;
  }

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-weed-green" />
      </div>
    );
  }

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
    if (!selectedFile) return;
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

  const handleAvatarDelete = async () => {
    if (confirm("Are you sure you want to remove your avatar?")) {
      await deleteAvatarMutation.mutateAsync();
    }
  };

  const handleSaveProfile = async () => {
    const updates: { name?: string; email?: string } = {};
    if (name !== profile?.name) {
      updates.name = name;
    }
    if (email !== profile?.email) {
      updates.email = email;
    }
    if (Object.keys(updates).length > 0) {
      await updateProfileMutation.mutateAsync(updates);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setName(profile?.name || "");
    setEmail(profile?.email || "");
    setIsEditing(false);
    setAvatarPreview(null);
    setSelectedFile(null);
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
    <div className="space-y-8 pb-12">
      <section className="rounded-[28px] bg-white/5 p-6 shadow-inner">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Profile</p>
            <h1 className="text-3xl font-bold text-white">Account Settings</h1>
            <p className="text-sm text-white/70">Manage your avatar and personal details.</p>
          </div>
          <Link href="/">
            <Button variant="ghost" className="rounded-2xl border border-white/10 text-white">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-white">
          <h2 className="text-lg font-semibold">Avatar</h2>
          <p className="text-sm text-white/60">Your profile picture</p>

          <div className="mt-6 flex flex-col items-center gap-4">
            <Avatar className="h-32 w-32 border-2 border-white/20">
              <AvatarImage src={avatarPreview || profile?.avatarUrl || undefined} />
              <AvatarFallback className="text-2xl bg-white/10 text-white">
                {getInitials(profile?.name)}
              </AvatarFallback>
            </Avatar>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex w-full flex-col gap-2">
              {!avatarPreview && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-2xl border-white/20 text-white"
                  >
                    <Camera className="mr-2 h-4 w-4" /> Choose Photo
                  </Button>
                  {profile?.avatarUrl && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleAvatarDelete}
                      disabled={deleteAvatarMutation.isPending}
                      className="w-full rounded-2xl"
                    >
                      {deleteAvatarMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Remove
                    </Button>
                  )}
                </>
              )}

              {avatarPreview && (
                <>
                  <Button
                    size="sm"
                    onClick={handleAvatarUpload}
                    disabled={uploadAvatarMutation.isPending}
                    className="w-full rounded-2xl bg-weed-green text-black"
                  >
                    {uploadAvatarMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAvatarPreview(null);
                      setSelectedFile(null);
                    }}
                    className="w-full rounded-2xl border-white/20 text-white"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>

            <p className="text-center text-xs text-white/50">JPEG, PNG, GIF, or WebP. Max 5MB.</p>
          </div>
        </div>

        <div className="md:col-span-2 rounded-[28px] border border-white/10 bg-white/5 p-6 text-white">
          <h2 className="text-lg font-semibold">Profile Information</h2>
          <p className="text-sm text-white/60">Update your personal details</p>

          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">
                <User className="mr-2 inline h-4 w-4" /> Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!isEditing) setIsEditing(true);
                }}
                placeholder="Enter your name"
                disabled={updateProfileMutation.isPending}
                className="rounded-2xl border-white/20 bg-black/40 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">
                <Mail className="mr-2 inline h-4 w-4" /> Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (!isEditing) setIsEditing(true);
                }}
                placeholder="Enter your email"
                disabled={updateProfileMutation.isPending}
                className="rounded-2xl border-white/20 bg-black/40 text-white"
              />
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                  className="flex-1 rounded-2xl bg-weed-green text-black"
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateProfileMutation.isPending}
                  className="rounded-2xl border-white/20 text-white"
                >
                  Cancel
                </Button>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">
              <p>
                <strong>Member since:</strong>{" "}
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString()
                  : "Unknown"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-white">
        <h2 className="text-lg font-semibold mb-4">Achievements</h2>
        <AchievementsSection />
      </section>
    </div>
  );
}
