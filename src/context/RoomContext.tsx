
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RoomContextType {
  currentRoomId: string | null;
  currentRoomName: string | null;
  setCurrentRoom: (roomId: string) => void;
  loadRoomName: () => Promise<void>;
}

const RoomContext = createContext<RoomContextType>({
  currentRoomId: null,
  currentRoomName: null,
  setCurrentRoom: () => {},
  loadRoomName: async () => {},
});

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useRoom must be used within a RoomProvider");
  }
  return context;
};

export const RoomProvider = ({ children }: { children: ReactNode }) => {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentRoomName, setCurrentRoomName] = useState<string | null>(null);

  useEffect(() => {
    // Initialize from localStorage or set to FifaShuttlers by default
    const initRoom = async () => {
      const savedRoomId = localStorage.getItem("currentRoomId");
      
      if (savedRoomId) {
        setCurrentRoomId(savedRoomId);
        await loadRoomNameById(savedRoomId);
      } else {
        // Default to FifaShuttlers room
        try {
          const { data, error } = await supabase
            .from('rooms')
            .select('id, name')
            .eq('name', 'FifaShuttlers')
            .single();

          if (error) throw error;
          
          if (data) {
            setCurrentRoomId(data.id);
            setCurrentRoomName(data.name);
            localStorage.setItem("currentRoomId", data.id);
          }
        } catch (error) {
          console.error("Error loading default room:", error);
        }
      }
    };

    initRoom();
  }, []);

  const loadRoomNameById = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('name')
        .eq('id', roomId)
        .single();

      if (error) throw error;
      
      if (data) {
        setCurrentRoomName(data.name);
      }
    } catch (error) {
      console.error("Error loading room name:", error);
    }
  };

  const loadRoomName = async () => {
    if (currentRoomId) {
      await loadRoomNameById(currentRoomId);
    }
  };

  const setCurrentRoom = (roomId: string) => {
    setCurrentRoomId(roomId);
    localStorage.setItem("currentRoomId", roomId);
    loadRoomNameById(roomId);
  };

  return (
    <RoomContext.Provider value={{ currentRoomId, currentRoomName, setCurrentRoom, loadRoomName }}>
      {children}
    </RoomContext.Provider>
  );
};
