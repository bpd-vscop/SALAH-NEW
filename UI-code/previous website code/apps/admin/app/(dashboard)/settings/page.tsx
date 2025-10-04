// filepath: apps/admin/app/(dashboard)/settings/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@automotive/ui/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@automotive/ui/components/ui/card";
import { Input } from "@automotive/ui/components/ui/input";
import { Label } from "@automotive/ui/components/ui/label";
import { Button } from "@automotive/ui/components/ui/button";
import { Textarea } from "@automotive/ui/components/ui/textarea";
import { Switch } from "@automotive/ui/components/ui/switch";
import { Separator } from "@automotive/ui/components/ui/separator";
import { useToast } from "@automotive/ui/components/ui/use-toast";
import {
  ShieldCheck,
  Key,
  Sparkles,
  UserRound,
  UploadCloud,
  Lock,
  BellRing,
  Megaphone,
  Package,
  Palette,
} from "lucide-react";

import { useAdminAuth } from "../../../hooks/useAdminAuth";
import { api } from "../../../lib/api";

const DEFAULT_LOGO_URL = "https://i.postimg.cc/nVjjhfsz/qt-q-95.png";

const notificationKeys = [
  { key: "orderAlerts", label: "Order alerts", description: "Notify me when new orders require attention." },
  { key: "vtaAlerts", label: "VTA queue", description: "Ping me when verification tasks arrive." },
  { key: "inventoryAlerts", label: "Inventory threshold", description: "Warn me when key SKUs go below stock limits." },
  { key: "activityDigest", label: "Weekly digest", description: "Send a Monday summary of staff actions." },
] as const;

type NotificationKey = (typeof notificationKeys)[number]["key"];

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  department: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

const AVATAR_PLACEHOLDERS = [
  { id: "shield", label: "Shield", icon: ShieldCheck, accent: "bg-blue-50 text-blue-600 border-blue-200" },
  { id: "key", label: "Key", icon: Key, accent: "bg-amber-50 text-amber-600 border-amber-200" },
  { id: "spark", label: "Spark", icon: Sparkles, accent: "bg-purple-50 text-purple-600 border-purple-200" },
  { id: "user", label: "User", icon: UserRound, accent: "bg-slate-50 text-slate-600 border-slate-200" },
] as const;

type PlaceholderId = (typeof AVATAR_PLACEHOLDERS)[number]["id"];

export default function SettingsPage() {
  const { user, updateUser } = useAdminAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("profile");
  const [activePlaceholder, setActivePlaceholder] = useState<PlaceholderId | null>(null);

  const userId = user?.id ?? "";

  const {
    data: staffData,
    isLoading: isProfileLoading,
    refetch: refetchStaff,
  } = api.admin.staffUsers.getById.useQuery(
    { id: userId },
    { enabled: Boolean(userId) },
  );

  const { data: themeData, isLoading: isThemeLoading } =
    api.admin.siteCustomization.getAll.useQuery(undefined, { staleTime: 1000 * 60, enabled: Boolean(userId) });

  const updateStaffMutation = api.admin.staffUsers.update.useMutation();
  const resetPasswordMutation = api.admin.staffUsers.resetPassword.useMutation();
  const updateThemeMutation = api.admin.siteCustomization.update.useMutation();

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      department: "",
      timezone: "UTC",
      language: "en",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [notifications, setNotifications] = useState<Record<NotificationKey, boolean>>({
    orderAlerts: true,
    vtaAlerts: true,
    inventoryAlerts: true,
    activityDigest: true,
  });

  const [themeState, setThemeState] = useState<Record<string, string>>({
    primaryColor: "#2563EB",
    secondaryColor: "#0F172A",
    accentColor: "#F59E0B",
    backgroundColor: "#F8FAFC",
    textColor: "#111827",
    linkColor: "#2563EB",
  });

  const profileAvatarUrl = useMemo(() => {
    if (staffData?.avatar) return staffData.avatar;
    if (staffData?.profileImage) return staffData.profileImage;
    return DEFAULT_LOGO_URL;
  }, [staffData]);

  useEffect(() => {
    if (!staffData) return;
    profileForm.reset({
      firstName: staffData.firstName ?? "",
      lastName: staffData.lastName ?? "",
      email: staffData.email ?? "",
      phone: staffData.phone ?? "",
      department: staffData.department ?? "",
      timezone: staffData.timezone ?? "UTC",
      language: staffData.language ?? "en",
    });
    setTwoFactorEnabled(Boolean(staffData.twoFactorEnabled));
    if (staffData.notificationPreferences) {
      setNotifications((prev) => ({
        ...prev,
        ...staffData.notificationPreferences,
      }));
    }
  }, [staffData, profileForm]);

  useEffect(() => {
    if (!themeData) return;
    setThemeState((prev) => ({
      ...prev,
      ...themeData,
    }));
  }, [themeData]);

  const onSubmitProfile = profileForm.handleSubmit(async (values) => {
    if (!userId) return;
    try {
      const result = await updateStaffMutation.mutateAsync({
        id: userId,
        ...values,
      });

      if (result) {
        updateUser({
          firstName: result.firstName ?? values.firstName,
          lastName: result.lastName ?? values.lastName,
          email: result.email ?? values.email,
        });
        toast({ title: "Profile updated", description: "Your profile settings were saved." });
        await refetchStaff();
      }
    } catch (error: any) {
      toast({
        title: "Unable to update profile",
        description: error?.message ?? "Please try again later.",
        variant: "destructive",
      });
    }
  });

  const onSubmitPassword = passwordForm.handleSubmit(async (values) => {
    if (!userId) return;
    const parsed = passwordSchema.safeParse(values);
    if (!parsed.success) {
      passwordForm.setError("confirmPassword", { message: parsed.error.issues[0]?.message ?? "Invalid password" });
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({ id: userId, newPassword: values.newPassword });
      toast({ title: "Password updated", description: "Use your new password the next time you sign in." });
      passwordForm.reset();
    } catch (error: any) {
      toast({
        title: "Password update failed",
        description: error?.message ?? "Please try again later.",
        variant: "destructive",
      });
    }
  });

  const handleTwoFactorToggle = async (enabled: boolean) => {
    if (!userId) return;
    setTwoFactorEnabled(enabled);
    try {
      await updateStaffMutation.mutateAsync({ id: userId, twoFactorEnabled: enabled });
      toast({
        title: enabled ? "Hardware key required" : "Hardware key disabled",
        description: enabled
          ? "Staff will need a registered passkey or FIDO device at next login."
          : "Staff can sign in without a hardware key.",
      });
      await refetchStaff();
    } catch (error: any) {
      setTwoFactorEnabled(!enabled);
      toast({
        title: "Unable to update hardware key requirement",
        description: error?.message ?? "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleNotificationsSave = async () => {
    if (!userId) return;
    try {
      await updateStaffMutation.mutateAsync({
        id: userId,
        notificationPreferences: notifications,
      });
      toast({ title: "Notification preferences saved" });
      await refetchStaff();
    } catch (error: any) {
      toast({
        title: "Unable to save notifications",
        description: error?.message ?? "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleThemeSave = async () => {
    try {
      await updateThemeMutation.mutateAsync(themeState);
      toast({ title: "Theme updated", description: "New colors will apply across the dashboard." });
    } catch (error: any) {
      toast({
        title: "Unable to save theme",
        description: error?.message ?? "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const profilePlaceholderPreview = useMemo(() => {
    if (!activePlaceholder) return null;
    return AVATAR_PLACEHOLDERS.find((item) => item.id === activePlaceholder) ?? null;
  }, [activePlaceholder]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your profile, security, notifications, and theme preferences.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" type="button" onClick={() => refetchStaff()}>
            Reload
          </Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex w-full flex-wrap gap-2 rounded-full bg-gray-100 p-1">
          <TabsTrigger value="profile" className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow">
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow">
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="theme" className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow">
            Theme
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 focus-visible:outline-none">
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                <UserRound className="h-5 w-5 text-blue-600" /> Profile information
              </CardTitle>
              <CardDescription>Update the basics your team sees across the dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative h-20 w-20 overflow-hidden rounded-full border border-gray-200 bg-gray-50">
                  {profilePlaceholderPreview ? (
                    <div
                      className={`flex h-full w-full items-center justify-center rounded-full border text-3xl ${profilePlaceholderPreview.accent}`}
                    >
                      <profilePlaceholderPreview.icon className="h-9 w-9" aria-hidden="true" />
                    </div>
                  ) : (
                    <Image src={profileAvatarUrl} alt="Profile" fill sizes="80px" className="object-contain p-2" />
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Avatar</p>
                    <p className="text-xs text-gray-500">The ULKS logo is shown until you upload a photo.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" className="gap-2 text-sm">
                      <UploadCloud className="h-4 w-4" /> Upload image
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-sm text-blue-600 hover:text-blue-700"
                      onClick={() => setActivePlaceholder(null)}
                    >
                      Use ULKS logo
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-900">Placeholder options</p>
                <p className="text-xs text-gray-500">Pick a temporary avatar until your photo is ready.</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {AVATAR_PLACEHOLDERS.map((option) => {
                    const isActive = activePlaceholder === option.id;
                    return (
                      <button
                        type="button"
                        key={option.id}
                        onClick={() => setActivePlaceholder(option.id)}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition ${
                          isActive ? "border-blue-400 bg-blue-50/50" : "border-dashed border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        <span
                          className={`flex h-12 w-12 items-center justify-center rounded-full border ${
                            option.accent
                          } ${isActive ? "border-blue-400" : "border-transparent"}`}
                        >
                          <option.icon className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <span className="text-xs font-medium text-gray-600">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              <form onSubmit={onSubmitProfile} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" {...profileForm.register("firstName") } className="mt-2" />
                  {profileForm.formState.errors.firstName && (
                    <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" {...profileForm.register("lastName") } className="mt-2" />
                  {profileForm.formState.errors.lastName && (
                    <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.lastName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...profileForm.register("email") } className="mt-2" />
                  {profileForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...profileForm.register("phone") } placeholder="(800) 555-0199" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" {...profileForm.register("department") } placeholder="Operations" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input id="timezone" {...profileForm.register("timezone") } placeholder="UTC" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Input id="language" {...profileForm.register("language") } placeholder="en" className="mt-2" />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    rows={3}
                    placeholder="Handles order fulfillment policies, VTA verification rules, and catalog updates."
                    defaultValue={staffData?.bio ?? ""}
                    className="mt-2"
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-400">Bio editing will be available once staff profiles launch.</p>
                </div>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => profileForm.reset()}>
                    Reset
                  </Button>
                  <Button type="submit" disabled={updateStaffMutation.isPending || isProfileLoading}>
                    {updateStaffMutation.isPending ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6 focus-visible:outline-none">
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                <Lock className="h-5 w-5 text-blue-600" /> Password & hardware keys
              </CardTitle>
              <CardDescription>Strengthen sign-in without relying on email or SMS codes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/60 p-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">Require hardware key</p>
                  <p className="text-xs text-gray-500">Mandate passkeys or FIDO2 devices for privileged actions.</p>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={handleTwoFactorToggle}
                  disabled={updateStaffMutation.isPending}
                />
              </div>

              <Separator />

              <form onSubmit={onSubmitPassword} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="newPassword">New password</Label>
                  <Input id="newPassword" type="password" className="mt-2" {...passwordForm.register("newPassword")} />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="mt-1 text-xs text-red-600">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input id="confirmPassword" type="password" className="mt-2" {...passwordForm.register("confirmPassword")} />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" disabled={resetPasswordMutation.isPending}>
                    {resetPasswordMutation.isPending ? "Updating..." : "Update password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 focus-visible:outline-none">
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                <BellRing className="h-5 w-5 text-blue-600" /> Notification preferences
              </CardTitle>
              <CardDescription>Choose which dashboard moments deserve a ping.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {notificationKeys.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/60 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key]}
                    onCheckedChange={(value) =>
                      setNotifications((prev) => ({
                        ...prev,
                        [item.key]: value,
                      }))
                    }
                  />
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => refetchStaff()}>
                Reset
              </Button>
              <Button type="button" onClick={handleNotificationsSave} disabled={updateStaffMutation.isPending}>
                {updateStaffMutation.isPending ? "Saving..." : "Save notifications"}
              </Button>
            </CardFooter>
          </Card>

          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                <Megaphone className="h-5 w-5 text-blue-600" /> Digest preview
              </CardTitle>
              <CardDescription>See how your weekly digest summary will look.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p>Your Monday digest includes:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Orders awaiting action</li>
                <li>Recent VTA decisions</li>
                <li>Catalog changes by staff</li>
                <li>Inventory alerts for critical SKUs</li>
              </ul>
              <p className="text-xs text-gray-400">Digests respect your notification toggles above.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="space-y-6 focus-visible:outline-none">
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                <Palette className="h-5 w-5 text-blue-600" /> Theme colors
              </CardTitle>
              <CardDescription>Keep the dashboard aligned with the ULKS visual system.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(themeState).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{key.replace(/([A-Z])/g, " $1").trim()}</p>
                    <p className="text-xs text-gray-500">{key === "textColor" ? "Typography" : "UI accent"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={value}
                      onChange={(event) =>
                        setThemeState((prev) => ({
                          ...prev,
                          [key]: event.target.value,
                        }))
                      }
                      className="h-10 w-10 cursor-pointer overflow-hidden rounded-full border border-gray-200"
                    />
                    <Input
                      value={value}
                      onChange={(event) =>
                        setThemeState((prev) => ({
                          ...prev,
                          [key]: event.target.value,
                        }))
                      }
                      className="w-28 text-sm"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => themeData && setThemeState(themeData as Record<string, string>)}
                disabled={isThemeLoading}
              >
                Reset
              </Button>
              <Button type="button" onClick={handleThemeSave} disabled={updateThemeMutation.isPending}>
                {updateThemeMutation.isPending ? "Saving..." : "Save theme"}
              </Button>
            </CardFooter>
          </Card>

          <Card className="border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                <Package className="h-5 w-5 text-blue-600" /> Theme tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <p>Colors sync directly to the public storefront and analytics dashboards.</p>
              <p className="text-xs text-gray-400">Need custom gradients or typography? Extend the theme in the branding settings API.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}




