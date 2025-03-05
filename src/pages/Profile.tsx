
import { useEffect } from "react";
import { UserProfile } from "@/components/UserProfile";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

const Profile = () => {
  const { isAuthenticated } = useAuth();
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return (
    <div className="container mx-auto px-4 pt-28 md:pt-24">
      <h1 className="text-3xl font-bold text-center mb-8">Profile Settings</h1>
      <UserProfile />
    </div>
  );
};

export default Profile;
