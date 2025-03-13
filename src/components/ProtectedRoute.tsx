
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";

const ProtectedRoute = ({ element }: { element: React.ReactNode }) => {
  const { session, isLoading, userEmail } = useAuth();
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
    }
  }, [session, isLoading, navigate, toast, userEmail]);

  if (isLoading) {
    return <div className="container mx-auto pt-24 text-center">Loading...</div>;
  }

  return session ? <>{element}</> : null;
};

export default ProtectedRoute;
