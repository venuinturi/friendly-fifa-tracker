
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  userEmail: string | null;
  userName: string | null;
  session: Session | null;
  isAdmin: boolean;
  isBasic: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  userEmail: null,
  userName: null,
  session: null,
  isAdmin: false,
  isBasic: false,
  loading: true,
  signOut: async () => {}
});

export const useAuth = () => useContext(AuthContext);

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const SESSION_WARNING = 30 * 1000; // 30 seconds before timeout

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBasic, setIsBasic] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [warningId, setWarningId] = useState<NodeJS.Timeout | null>(null);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const resetSessionTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutId) clearTimeout(timeoutId);
    if (warningId) clearTimeout(warningId);
    
    if (userEmail) {
      // Set new timers
      const warningTimer = setTimeout(() => {
        setShowTimeoutWarning(true);
      }, SESSION_TIMEOUT - SESSION_WARNING);
      
      const logoutTimer = setTimeout(() => {
        signOut();
      }, SESSION_TIMEOUT);
      
      setWarningId(warningTimer);
      setTimeoutId(logoutTimer);
      setLastActivity(Date.now());
    }
  }, [userEmail]);

  const continueSession = useCallback(() => {
    setShowTimeoutWarning(false);
    resetSessionTimer();
  }, [resetSessionTimer]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUserEmail(null);
      setUserName(null);
      setSession(null);
      setIsAdmin(false);
      setIsBasic(false);
      
      // Clear timers
      if (timeoutId) clearTimeout(timeoutId);
      if (warningId) clearTimeout(warningId);
      
      setTimeoutId(null);
      setWarningId(null);
      setShowTimeoutWarning(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Activity tracking
  useEffect(() => {
    const handleActivity = () => {
      const now = Date.now();
      // Only reset if it's been more than 10 seconds since the last reset
      // This prevents constant resetting on rapid user actions
      if (now - lastActivity > 10000) {
        resetSessionTimer();
      }
    };
    
    // Track user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [lastActivity, resetSessionTimer]);

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
          
          // Start session timeout
          resetSessionTimer();
        }
        
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            setUserEmail(newSession?.user?.email || null);
            setUserName(newSession?.user?.user_metadata?.name || newSession?.user?.email || null);
            setSession(newSession);
            
            if (newSession?.user?.email) {
              await fetchUserRole(newSession.user.email);
              
              // Reset session timeout on auth change
              resetSessionTimer();
            } else {
              // Clear timers on logout
              if (timeoutId) clearTimeout(timeoutId);
              if (warningId) clearTimeout(warningId);
              setTimeoutId(null);
              setWarningId(null);
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
    
    return () => {
      // Clean up timers
      if (timeoutId) clearTimeout(timeoutId);
      if (warningId) clearTimeout(warningId);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ userEmail, userName, session, isAdmin, isBasic, loading, signOut }}>
      {children}
      
      {/* Session Timeout Warning */}
      {showTimeoutWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border rounded-lg shadow-lg p-6 max-w-md">
            <h2 className="text-xl font-bold mb-4">Session Timeout Warning</h2>
            <p className="mb-6">Your session is about to expire due to inactivity. Do you want to continue?</p>
            <div className="flex justify-end space-x-2">
              <button 
                onClick={signOut}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
              >
                Logout
              </button>
              <button 
                onClick={continueSession}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Continue Session
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};
