
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, isLoading } = useAuth();
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
  }, [session, isLoading, navigate, toast]);

  if (isLoading) {
    return <div className="container mx-auto pt-24 text-center">Loading...</div>;
  }

  return session ? <>{children}</> : null;
};

export default ProtectedRoute;
