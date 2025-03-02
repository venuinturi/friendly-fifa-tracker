
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, LogIn } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, userEmail, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="w-full bg-white shadow-sm fixed top-0 z-50">
      <div className="container mx-auto py-4">
        <div className="flex justify-between items-center">
          <Tabs defaultValue={location.pathname} className="w-full max-w-3xl" onValueChange={(value) => navigate(value)}>
            <TabsList className="grid w-full grid-cols-5 gap-4">
              <TabsTrigger value="/players" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Players
              </TabsTrigger>
              <TabsTrigger value="/1v1" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                1v1
              </TabsTrigger>
              <TabsTrigger value="/2v2" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                2v2
              </TabsTrigger>
              <TabsTrigger value="/history" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                History
              </TabsTrigger>
              <TabsTrigger value="/leaderboard" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Leaderboard
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-4 ml-4">
            {session ? (
              <>
                <span className="text-sm hidden md:inline">{userEmail}</span>
                <Button onClick={handleSignOut} variant="outline" size="sm">
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate("/auth")} variant="outline" size="sm">
                <LogIn className="h-4 w-4 mr-2" /> Login
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
