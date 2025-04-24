
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Menu, 
  X,
  Trophy,
  Users, 
  History, 
  Home, 
  LogOut, 
  LogIn,
  DoorClosed,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { useRoom } from "@/context/RoomContext";
import { useIsMobile } from "@/hooks/use-mobile";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, signOut } = useAuth();
  const { inRoom, clearCurrentRoom } = useRoom();
  const location = useLocation();
  const mobile = useIsMobile();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    closeMenu();
  };

  const handleLeaveRoom = async () => {
    clearCurrentRoom();
  }

  const activeLinkStyle = "font-semibold text-primary";

  const navItems = [
    { path: "/", label: "Home", icon: <Home className="h-4 w-4 mr-2" /> },
    { path: "/leaderboard", label: "Leaderboard", icon: <Trophy className="h-4 w-4 mr-2" /> },
    { path: "/players", label: "Players", icon: <Users className="h-4 w-4 mr-2" /> },
    { path: "/history", label: "History", icon: <History className="h-4 w-4 mr-2" /> },
    { path: "/rooms", label: "Rooms", icon: <DoorClosed className="h-4 w-4 mr-2" /> },
    { path: "/tournaments", label: "Tournaments", icon: <Trophy className="h-4 w-4 mr-2" /> },
  ];

  return (
    <div className="fixed top-0 left-0 w-full bg-background z-50 shadow-sm">
      <div className="container mx-auto py-4 px-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold">
          Scoreboard
        </Link>

        {/* Mobile Menu */}
        {mobile ? (
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" onClick={toggleMenu}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-3/4 sm:w-1/2">
              <div className="flex flex-col h-full">
                <div className="flex justify-end">
                  <Button variant="ghost" size="icon" onClick={closeMenu}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <nav className="flex flex-col space-y-4 mt-4">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center text-lg ${location.pathname === item.path ? activeLinkStyle : ""}`}
                      onClick={closeMenu}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  ))}
                  {isAuthenticated ? (
                    <>
                      {inRoom && (
                        <>
                          <Link
                            to="/1v1"
                            className={`flex items-center text-lg ${location.pathname === "/1v1" ? activeLinkStyle : ""}`}
                            onClick={closeMenu}
                          >
                            <Trophy className="h-4 w-4 mr-2" />
                            1v1 Match
                          </Link>
                          <Link
                            to="/2v2"
                            className={`flex items-center text-lg ${location.pathname === "/2v2" ? activeLinkStyle : ""}`}
                            onClick={closeMenu}
                          >
                            <Trophy className="h-4 w-4 mr-2" />
                            2v2 Match
                          </Link>
                        </>
                      )}
                      <Link
                        to="/profile"
                        className={`flex items-center text-lg ${location.pathname === "/profile" ? activeLinkStyle : ""}`}
                        onClick={closeMenu}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Link>
                      {inRoom && (
                        <Button variant="ghost" className="justify-start" onClick={handleLeaveRoom}>
                          <LogOut className="h-4 w-4 mr-2" />
                          Leave Room
                        </Button>
                      )}
                      <Button variant="ghost" className="justify-start" onClick={handleLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <Link
                      to="/auth"
                      className={`flex items-center text-lg ${location.pathname === "/auth" ? activeLinkStyle : ""}`}
                      onClick={closeMenu}
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Login
                    </Link>
                  )}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          // Desktop Menu
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`${location.pathname === item.path ? activeLinkStyle : ""}`}
              >
                {item.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                {inRoom && (
                  <>
                    <Link
                      to="/1v1"
                      className={`${location.pathname === "/1v1" ? activeLinkStyle : ""}`}
                    >
                      1v1 Match
                    </Link>
                    <Link
                      to="/2v2"
                      className={`${location.pathname === "/2v2" ? activeLinkStyle : ""}`}
                    >
                      2v2 Match
                    </Link>
                  </>
                )}
                <Link
                  to="/profile"
                  className={`${location.pathname === "/profile" ? activeLinkStyle : ""}`}
                >
                  Profile
                </Link>
                {inRoom ? (
                  <Button variant="outline" size="sm" onClick={handleLeaveRoom}>
                    Leave Room
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <Link
                to="/auth"
                className={`${location.pathname === "/auth" ? activeLinkStyle : ""}`}
              >
                Login
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
};

export default Navbar;
