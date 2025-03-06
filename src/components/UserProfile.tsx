
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function UserProfile() {
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { userEmail, setUserName, userName } = useAuth();

  useEffect(() => {
    if (userName) {
      setDisplayName(userName);
    }
  }, [userName]);

  const handleSaveProfile = async () => {
    if (!userEmail) return;
    
    setIsLoading(true);
    try {
      // First check if a user profile exists
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', userEmail)
        .maybeSingle();
      
      if (existingProfile) {
        // Update existing profile
        await supabase
          .from('user_profiles')
          .update({ display_name: displayName, updated_at: new Date().toISOString() })
          .eq('email', userEmail);
      } else {
        // Create new profile
        await supabase
          .from('user_profiles')
          .insert({ email: userEmail, display_name: displayName });
      }
      
      // Update context
      setUserName(displayName);
      
      toast({
        title: "Profile updated",
        description: "Your display name has been updated",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
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
