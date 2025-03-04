
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";

const RoomRequired = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto pt-24 px-4">
      <div className="max-w-md mx-auto text-center py-12">
        <h2 className="text-2xl font-bold mb-4">No Room Selected</h2>
        <p className="text-muted-foreground mb-6">
          You need to enter a room before you can access this page. Please go to the Rooms page and select a room.
        </p>
        <Button onClick={() => navigate("/rooms")}>
          <Home className="h-4 w-4 mr-2" />
          Go to Rooms
        </Button>
      </div>
    </div>
  );
};

export default RoomRequired;
