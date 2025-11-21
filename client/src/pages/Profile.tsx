import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { Loader2, Upload, Trash2, User, Mail, Camera, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { AchievementsSection } from "@/components/AchievementsSection";

export default function Profile() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
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
      // Invalidate auth.me cache to update user display everywhere
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

  // Redirect to login if not authenticated
  if (!authLoading && !isAuthenticated) {
    const loginUrl = getLoginUrl();
    if (loginUrl) window.location.href = loginUrl;
    else window.location.href = "/login";
    return null;
  }

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.");
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size exceeds 5MB limit.");
      return;
    }

    setSelectedFile(file);

    // Create preview
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

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Profile Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your account information and avatar
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Avatar Section */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Avatar</CardTitle>
              <CardDescription>Your profile picture</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <Avatar className="w-32 h-32">
                <AvatarImage src={avatarPreview || profile?.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
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

              <div className="flex flex-col gap-2 w-full">
                {!avatarPreview && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Choose Photo
                    </Button>

                    {profile?.avatarUrl && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleAvatarDelete}
                        disabled={deleteAvatarMutation.isPending}
                        className="w-full"
                      >
                        {deleteAvatarMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-2" />
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
                      className="w-full"
                    >
                      {uploadAvatarMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
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
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                JPEG, PNG, GIF, or WebP. Max 5MB.
              </p>
            </CardContent>
          </Card>

          {/* Profile Information */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  <User className="w-4 h-4 inline mr-2" />
                  Name
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
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
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
                />
              </div>

              {isEditing && (
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                    className="flex-1"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={updateProfileMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <strong>Member since:</strong>{" "}
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString()
                      : "Unknown"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Achievements Section */}
          <div className="md:col-span-3">
            <AchievementsSection />
          </div>
        </div>
      </main>
    </div>
  );
}
