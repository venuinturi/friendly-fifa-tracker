
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useLocation } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="w-full bg-white shadow-sm fixed top-0 z-50">
      <div className="container mx-auto py-4">
        <Tabs defaultValue={location.pathname} className="w-full" onValueChange={(value) => navigate(value)}>
          <TabsList className="grid w-full grid-cols-4 gap-4">
            <TabsTrigger value="/" className="data-[state=active]:bg-primary data-[state=active]:text-white">
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
      </div>
    </div>
  );
};

export default Navbar;
