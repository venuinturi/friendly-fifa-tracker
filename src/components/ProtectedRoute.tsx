
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ProtectedRoute = ({ element }: { element: React.ReactNode }) => {
  const { session, isLoading, userEmail, setUserName } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !session) {
      toast({
        title: "Authentication required",
        description: "Please log in to access this page",
        variant: "destructive",
      });
      navigate("/auth");
    } else if (session && userEmail) {
      // Load user profile if authenticated
      loadUserProfile(userEmail);
    }
  }, [session, isLoading, navigate, toast, userEmail]);

  const loadUserProfile = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data && data.display_name) {
        setUserName(data.display_name);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  if (isLoading) {
    return <div className="container mx-auto pt-24 text-center">Loading...</div>;
  }

  return session ? <>{element}</> : null;
};

export default ProtectedRoute;
