
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  userName: string | null;
  session: any | null;
  isLoading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  setUserName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  // Load initial auth state
  useEffect(() => {
    const fetchSession = async () => {
      setIsLoading(true);
      
      // Check for existing Supabase session
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      
      if (supabaseSession) {
        setIsAuthenticated(true);
        setUserEmail(supabaseSession.user.email);
        setSession(supabaseSession);
        
        // Try to fetch user profile
        if (supabaseSession.user.email) {
          fetchUserProfile(supabaseSession.user.email);
        }
      }
      
      setIsLoading(false);
    };
    
    fetchSession();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === 'SIGNED_IN' && newSession) {
          setIsAuthenticated(true);
          setUserEmail(newSession.user.email);
          setSession(newSession);
          
          // Fetch user profile on sign in
          if (newSession.user.email) {
            fetchUserProfile(newSession.user.email);
          }
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setUserEmail(null);
          setUserName(null);
          setSession(null);
        }
      }
    );
    
    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (email: string) => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('email', email)
        .maybeSingle();
      
      if (data?.display_name) {
        setUserName(data.display_name);
      }
    } catch (error) {
      console.log("No user profile found or error fetching profile");
    }
  };

  const login = async (email: string) => {
    try {
      // We no longer need this method to perform the actual login
      // as it's handled by supabase.auth.signInWithPassword() in the Auth component
      // This is now just for post-login actions
      
      toast({
        title: "Login successful",
        description: "You're now logged in",
      });
    } catch (error) {
      console.error("Error during login:", error);
      toast({
        title: "Login failed",
        description: "Something went wrong during login",
        variant: "destructive",
      });
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setIsAuthenticated(false);
      setUserEmail(null);
      setUserName(null);
      setSession(null);
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const updateUserName = (name: string) => {
    setUserName(name);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userEmail,
        userName,
        session,
        isLoading,
        login,
        logout,
        setUserName: updateUserName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
