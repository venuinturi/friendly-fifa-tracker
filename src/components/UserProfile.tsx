
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { UserRole } from "@/types/auth";
import { logError } from "@/integrations/supabase/client";

export function UserProfile() {
  const [displayName, setDisplayName] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("basic");
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { userEmail, setUserName, userName, isAdmin } = useAuth();

  useEffect(() => {
    if (userName) {
      setDisplayName(userName);
    }
    // Load user profile and role
    loadUserProfile();
  }, [userName, userEmail]);

  const loadUserProfile = async () => {
    if (!userEmail) return;
    
    try {
      // First check if user_roles table has this user
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();
      
      if (!roleError && roleData) {
        setUserRole(roleData.role as UserRole);
      } else {
        // Default to basic role
        setUserRole('basic');
        
        // Check if this is admin user (venu.inturi@outlook.com)
        if (userEmail === 'venu.inturi@outlook.com') {
          setUserRole('admin');
        }
      }
      
      // Then get profile data
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setDisplayName(data.display_name);
        // Update context
        setUserName(data.display_name);
      }
    } catch (error) {
      logError(error, 'Loading profile');
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setAvatarFile(file);
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setAvatarUrl(previewUrl);
    }
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;
      
      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);
      
      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        toast({
          title: "Upload Error",
          description: "Failed to upload avatar image",
          variant: "destructive",
        });
        return null;
      }
      
      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error in uploadAvatar:', error);
      return null;
    }
  };

  const handleSaveProfile = async () => {
    if (!userEmail) return;
    
    setIsLoading(true);
    try {
      let avatarPublicUrl = null;
      
      // If there's a new avatar file, upload it
      if (avatarFile) {
        avatarPublicUrl = await uploadAvatar(avatarFile);
        if (!avatarPublicUrl) {
          toast({
            title: "Warning",
            description: "Failed to upload avatar, but continuing to save other profile details",
            variant: "destructive",
          });
        }
      }
      
      // First check if a user profile exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();
      
      // Prepare profile data to save
      const profileData: any = { display_name: displayName };
      if (avatarPublicUrl) {
        profileData.avatar_url = avatarPublicUrl;
      }
      
      if (existingProfile) {
        // Update existing profile
        await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('email', userEmail);
      } else {
        // Create new profile
        await supabase
          .from('user_profiles')
          .insert({ email: userEmail, ...profileData });
      }
      
      // Update user role if admin
      if (isAdmin) {
        // Check if user role exists for this user
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('*')
          .eq('email', userEmail)
          .maybeSingle();
        
        if (existingRole) {
          // Update existing role
          await supabase
            .from('user_roles')
            .update({ role: userRole })
            .eq('email', userEmail);
        } else {
          // Create new role
          await supabase
            .from('user_roles')
            .insert({ email: userEmail, role: userRole });
        }
      }
      
      // Update context
      setUserName(displayName);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      
      // Reset file state
      setAvatarFile(null);
      
      // Reload profile data to get the latest
      loadUserProfile();
    } catch (error) {
      logError(error, 'Updating profile');
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="items-center text-center">
        <div className="relative">
          <Avatar className="h-20 w-20 mb-4">
            <AvatarImage src={avatarUrl || ""} alt={displayName || userEmail || "User"} />
            <AvatarFallback className="text-xl bg-primary text-primary-foreground">
              {getInitials(displayName || userEmail || "User")}
            </AvatarFallback>
          </Avatar>
          <Button 
            variant="outline" 
            size="sm"
            className="absolute bottom-0 right-0 rounded-full h-8 w-8 p-0"
            onClick={() => document.getElementById('avatar-upload')?.click()}
          >
            +
          </Button>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <CardTitle>Your Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <Input id="email" value={userEmail || ""} disabled />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="displayName" className="text-sm font-medium">Display Name</label>
          <Input 
            id="displayName" 
            value={displayName} 
            onChange={(e) => setDisplayName(e.target.value)} 
            placeholder="Enter your name" 
          />
          <p className="text-xs text-muted-foreground">
            This name will be used in game history records
          </p>
        </div>
        
        {isAdmin && (
          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium">User Role</label>
            <Select
              value={userRole}
              onValueChange={(value) => setUserRole(value as UserRole)}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="basic">Basic User</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Admin users can add/edit players, basic users can only add scores
            </p>
          </div>
        )}
        
        <Button 
          onClick={handleSaveProfile} 
          disabled={isLoading || !displayName.trim()}
          className="w-full"
        >
          {isLoading ? "Saving..." : "Save Profile"}
        </Button>
      </CardContent>
    </Card>
  );
}
