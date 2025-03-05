
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  userName: string | null;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  setUserName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const { toast } = useToast();

  // Load initial auth state
  useEffect(() => {
    const storedEmail = localStorage.getItem("userEmail");
    const storedName = localStorage.getItem("userName");
    
    if (storedEmail) {
      setIsAuthenticated(true);
      setUserEmail(storedEmail);
      setUserName(storedName);
      
      // Try to fetch user profile from Supabase
      if (storedEmail) {
        fetchUserProfile(storedEmail);
      }
    }
  }, []);

  const fetchUserProfile = async (email: string) => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('email', email)
        .single();
      
      if (data?.display_name) {
        setUserName(data.display_name);
        localStorage.setItem("userName", data.display_name);
      }
    } catch (error) {
      console.log("No user profile found or error fetching profile");
    }
  };

  const login = async (email: string) => {
    try {
      setIsAuthenticated(true);
      setUserEmail(email);
      localStorage.setItem("userEmail", email);
      
      // Fetch user profile on login
      await fetchUserProfile(email);
      
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
      setIsAuthenticated(false);
      setUserEmail(null);
      setUserName(null);
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userName");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const updateUserName = (name: string) => {
    setUserName(name);
    localStorage.setItem("userName", name);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userEmail,
        userName,
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
