
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  userName: string | null;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  setUserName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userEmail: null,
  userName: null,
  login: async () => {},
  logout: async () => {},
  setUserName: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated on page load
    const checkUser = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (data.session) {
        setIsAuthenticated(true);
        setUserEmail(data.session.user.email);
        // Fetch user profile if it exists
        if (data.session.user.email) {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('display_name')
            .eq('email', data.session.user.email)
            .single();
          
          if (profileData) {
            setUserName(profileData.display_name);
          }
        }
      }
    };

    checkUser();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          setIsAuthenticated(true);
          setUserEmail(session.user.email);
          // Fetch user profile if it exists
          if (session.user.email) {
            const { data: profileData } = await supabase
              .from('user_profiles')
              .select('display_name')
              .eq('email', session.user.email)
              .single();
            
            if (profileData) {
              setUserName(profileData.display_name);
            }
          }
        } else if (event === "SIGNED_OUT") {
          setIsAuthenticated(false);
          setUserEmail(null);
          setUserName(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setIsAuthenticated(false);
    setUserEmail(null);
    setUserName(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userEmail,
        userName,
        login,
        logout,
        setUserName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
