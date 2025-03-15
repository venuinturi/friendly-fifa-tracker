
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";

interface ProtectedRouteProps {
  element: React.ReactNode;
  requiresAdmin?: boolean;
}

const ProtectedRoute = ({ element, requiresAdmin = false }: ProtectedRouteProps) => {
  const { session, isLoading, userEmail, userRole } = useAuth();
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
      return;
    }
    
    if (!isLoading && requiresAdmin && userRole !== 'admin') {
      toast({
        title: "Access denied",
        description: "You need administrator privileges to access this page",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [session, isLoading, navigate, toast, userEmail, userRole, requiresAdmin]);

  if (isLoading) {
    return <div className="container mx-auto pt-24 text-center">Loading...</div>;
  }

  // If admin required, check if user has admin role
  if (requiresAdmin && userRole !== 'admin') {
    return null;
  }

  return session ? <>{element}</> : null;
};

export default ProtectedRoute;
