
import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  userEmail: string | null;
  userName: string | null;
  session: Session | null;
  isAdmin: boolean;
  isBasic: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  userRole: string;
  setUserName: (name: string) => void;
}

export const AuthContext = createContext<AuthContextType>({
  userEmail: null,
  userName: null,
  session: null,
  isAdmin: false,
  isBasic: false,
  loading: true,
  isAuthenticated: false,
  isLoading: true,
  userRole: 'basic',
  signOut: async () => {},
  setUserName: () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBasic, setIsBasic] = useState(false);
  const [userRole, setUserRole] = useState('basic');

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUserEmail(null);
      setUserName(null);
      setSession(null);
      setIsAdmin(false);
      setIsBasic(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    const fetchUserRole = async (email: string) => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('email', email.toLowerCase())
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user role:', error);
          return;
        }

        if (data) {
          const isUserAdmin = data.role === 'admin';
          const isUserBasic = data.role === 'basic';
          setIsAdmin(isUserAdmin);
          setIsBasic(isUserBasic);
        } else {
          setIsAdmin(false);
          setIsBasic(true); // Default to basic role if not specified
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setIsBasic(true);
      }
    };

    const setupAuthListener = async () => {
      try {
        // Check for existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
          setUserEmail(session.user?.email || null);
          setUserName(session.user?.user_metadata?.name || session.user?.email || null);
          setSession(session);
          
          if (session.user?.email) {
            await fetchUserRole(session.user.email);
          }
        }
        
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            setUserEmail(newSession?.user?.email || null);
            setUserName(newSession?.user?.user_metadata?.name || newSession?.user?.email || null);
            setSession(newSession);
            
            if (newSession?.user?.email) {
              await fetchUserRole(newSession.user.email);
            }
          }
        );

        setLoading(false);
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up auth:', error);
        setLoading(false);
      }
    };

    setupAuthListener();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      userEmail, 
      userName, 
      session, 
      isAdmin, 
      isBasic, 
      loading, 
      signOut,
      isAuthenticated: !!session,
      isLoading: loading,
      userRole: isAdmin ? 'admin' : 'basic',
      setUserName
    }}>
      {children}
    </AuthContext.Provider>
  );
};
