
import { useEffect, useState } from "react";
import { UserProfile } from "@/components/UserProfile";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { UserManagement } from "@/components/UserManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Profile = () => {
  const { isAuthenticated, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const isAdmin = userRole === "admin";
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return (
    <div className="container mx-auto px-4 pt-28 md:pt-24">
      <h1 className="text-3xl font-bold text-center mb-8">Profile Settings</h1>
      
      {isAdmin ? (
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full max-w-3xl mx-auto"
        >
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="profile">My Profile</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <UserProfile />
          </TabsContent>
          
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="max-w-3xl mx-auto">
          <UserProfile />
        </div>
      )}
    </div>
  );
};

export default Profile;
