
import { useEffect, useState } from "react";
import { UserProfile } from "@/components/UserProfile";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { UserManagement } from "@/components/UserManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, UserCog } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Profile = () => {
  const { isAuthenticated, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("basic");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const isAdmin = userRole === "admin";
  const { toast } = useToast();
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  useEffect(() => {
    if (isAdmin && activeTab === "users") {
      loadUsers();
    }
  }, [isAdmin, activeTab]);
  
  const loadUsers = async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    try {
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
        
      if (rolesError) throw rolesError;
      
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*');
        
      if (profilesError) throw profilesError;
      
      // Combine user profiles with roles
      const combinedUsers = userProfiles.map(profile => {
        const userRole = userRoles.find(r => r.email === profile.email);
        return {
          ...profile,
          role: userRole ? userRole.role : 'basic'
        };
      });
      
      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleRoleChange = async (email: string, role: string) => {
    try {
      // Check if user role exists
      const { data: existingRole, error: checkError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('email', email)
        .single();
        
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existingRole) {
        // Update existing role
        const { error: updateError } = await supabase
          .from('user_roles')
          .update({ role })
          .eq('email', email);
          
        if (updateError) throw updateError;
      } else {
        // Insert new role
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert([{ email, role }]);
          
        if (insertError) throw insertError;
      }
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.email === email ? { ...user, role } : user
      ));
      
      setEditingUser(null);
      toast({
        title: "Success",
        description: `User role updated to ${role}`,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteUser = async (email: string) => {
    try {
      // Delete user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('email', email);
        
      if (roleError) throw roleError;
      
      // Delete user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('email', email);
        
      if (profileError) throw profileError;
      
      // Update local state
      setUsers(prev => prev.filter(user => user.email !== email));
      
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };
  
  const startEditingRole = (email: string, currentRole: string) => {
    setSelectedRole(currentRole);
    setEditingUser(email);
  };
  
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserCog className="mr-2 h-5 w-5" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center py-4">Loading users...</p>
                ) : (
                  <div className="space-y-4">
                    {users.map(user => (
                      <Card key={user.id} className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{user.display_name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            <p className="text-sm">
                              Role: <span className="font-medium capitalize">{user.role}</span>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Dialog open={editingUser === user.email} onOpenChange={(open) => {
                              if (!open) setEditingUser(null);
                            }}>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => startEditingRole(user.email, user.role)}
                                >
                                  <Pencil className="h-4 w-4 mr-1" /> Role
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Update User Role</DialogTitle>
                                </DialogHeader>
                                <div className="py-4">
                                  <p className="mb-4">
                                    Change role for <span className="font-medium">{user.display_name}</span>
                                  </p>
                                  <Select 
                                    value={selectedRole} 
                                    onValueChange={setSelectedRole}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="admin">Admin</SelectItem>
                                      <SelectItem value="basic">Basic</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <div className="flex justify-end gap-2 mt-4">
                                    <DialogClose asChild>
                                      <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button 
                                      onClick={() => handleRoleChange(user.email, selectedRole)}
                                    >
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDeleteUser(user.email)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                    {users.length === 0 && (
                      <p className="text-center py-4 text-muted-foreground">No users found</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
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
