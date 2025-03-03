
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, LogIn, HomeIcon } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useRoom } from "@/context/RoomContext";
import { useEffect } from "react";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, userEmail, signOut } = useAuth();
  const { currentRoomName, loadRoomName } = useRoom();

  useEffect(() => {
    loadRoomName();
  }, [loadRoomName]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="w-full bg-white shadow-sm fixed top-0 z-50">
      <div className="container mx-auto py-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="mr-2"
            >
              <HomeIcon className="h-5 w-5 mr-2" />
              {currentRoomName && (
                <span className="text-sm font-medium">{currentRoomName}</span>
              )}
            </Button>
            
            <div className="sm:hidden flex items-center">
              {session ? (
                <Button onClick={handleSignOut} variant="outline" size="sm">
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </Button>
              ) : (
                <Button onClick={() => navigate("/auth")} variant="outline" size="sm">
                  <LogIn className="h-4 w-4 mr-2" /> Login
                </Button>
              )}
            </div>
          </div>
          
          <Tabs 
            defaultValue={location.pathname} 
            className="w-full max-w-3xl mt-2 sm:mt-0" 
            onValueChange={(value) => navigate(value)}
          >
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1 md:gap-4">
              <TabsTrigger value="/rooms" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                Rooms
              </TabsTrigger>
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
          
          <div className="hidden sm:flex items-center gap-2 ml-auto">
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
