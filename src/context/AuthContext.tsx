
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { UserRole } from "@/types/auth";
import { logError } from "@/integrations/supabase/client";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: Session | null;
  userEmail: string | null;
  userName: string | null;
  userRole: UserRole;
  isAdmin: boolean;
  setUserName: (name: string) => void;
  signOut: () => Promise<void>;
}

const defaultContext: AuthContextType = {
  isAuthenticated: false,
  isLoading: true,
  session: null,
  userEmail: null,
  userName: null,
  userRole: 'basic',
  isAdmin: false,
  setUserName: () => {},
  signOut: async () => {},
};

const AuthContext = createContext<AuthContextType>(defaultContext);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('basic');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setIsAuthenticated(!!initialSession);
        
        if (initialSession?.user?.email) {
          const email = initialSession.user.email;
          setUserEmail(email);
          console.log('Auth state changed: INITIAL_SESSION', email);
          
          // Load user profile information
          await loadUserProfile(email);
        }
        
        // Listen for auth state changes
        const { data: { subscription } } = await supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log('Auth state changed:', event, newSession?.user?.email);
            setSession(newSession);
            setIsAuthenticated(!!newSession);
            
            if (newSession?.user?.email) {
              const email = newSession.user.email;
              setUserEmail(email);
              
              // Load user profile information
              await loadUserProfile(email);
            } else {
              setUserEmail(null);
              setUserName(null);
              setUserRole('basic');
              setIsAdmin(false);
            }
          }
        );
        
        setIsLoading(false);
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error in auth initialization:', error);
        setIsLoading(false);
      }
    };
    
    initializeAuth();
  }, []);
  
  const loadUserProfile = async (email: string) => {
    console.log('Fetching user profile for email:', email);
    try {
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (!profileError && profileData) {
        console.log('User profile data:', profileData);
        setUserName(profileData.display_name);
      }
      
      // Get user role from the user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (!roleError && roleData) {
        console.log('User role data:', roleData);
        setUserRole(roleData.role as UserRole);
        setIsAdmin(roleData.role === 'admin');
      } else {
        // Default to basic role if no role found
        console.log('No role found, defaulting to basic');
        setUserRole('basic');
        setIsAdmin(false);
        
        // Special case for venu.inturi@outlook.com
        if (email === 'venu.inturi@outlook.com') {
          console.log('Setting admin role for venu.inturi@outlook.com');
          setUserRole('admin');
          setIsAdmin(true);
        }
      }
    } catch (error) {
      logError(error, 'Loading user profile');
    }
  };
  
  const signOut = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
    setUserName(null);
    setUserRole('basic');
    setIsAdmin(false);
  };
  
  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated, 
        isLoading,
        session, 
        userEmail, 
        userName, 
        userRole,
        isAdmin,
        setUserName, 
        signOut 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
