
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserProfile } from "@/components/UserProfile";
import { useAuth } from "@/context/AuthContext";

const Profile = () => {
  const { isAuthenticated, userRole } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="container mx-auto pt-28 md:pt-24 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Your Profile</h1>
      <UserProfile />
    </div>
  );
};

export default Profile;
