
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { UserRole } from "@/types/auth";

interface AuthContextType {
  isAuthenticated: boolean;
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

  useEffect(() => {
    const initializeAuth = async () => {
      // Get initial session
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      setIsAuthenticated(!!initialSession);
      
      if (initialSession?.user?.email) {
        const email = initialSession.user.email;
        setUserEmail(email);
        console.log('Auth state changed: INITIAL_SESSION', email);
        
        // Set admin flag for venu.inturi@outlook.com
        if (email === 'venu.inturi@outlook.com') {
          setUserRole('admin');
          setIsAdmin(true);
        }
        
        // Load user profile information
        loadUserProfile(email);
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
            
            // Set admin flag for venu.inturi@outlook.com
            if (email === 'venu.inturi@outlook.com') {
              setUserRole('admin');
              setIsAdmin(true);
            }
            
            // Load user profile information
            loadUserProfile(email);
          } else {
            setUserEmail(null);
            setUserName(null);
            setUserRole('basic');
            setIsAdmin(false);
          }
        }
      );
      
      return () => {
        subscription.unsubscribe();
      };
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
      
      // Get user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('email', email)
        .maybeSingle();
      
      if (!roleError && roleData) {
        setUserRole(roleData.role as UserRole);
        setIsAdmin(roleData.role === 'admin');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
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
