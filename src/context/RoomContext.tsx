
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RoomContextType {
  currentRoomId: string | null;
  currentRoomName: string | null;
  setCurrentRoom: (roomId: string) => void;
  clearCurrentRoom: () => void;
  loadRoomName: () => Promise<void>;
  inRoom: boolean;
}

const RoomContext = createContext<RoomContextType>({
  currentRoomId: null,
  currentRoomName: null,
  setCurrentRoom: () => {},
  clearCurrentRoom: () => {},
  loadRoomName: async () => {},
  inRoom: false,
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
  const [inRoom, setInRoom] = useState<boolean>(false);

  useEffect(() => {
    // Initialize from localStorage or set to null
    const initRoom = async () => {
      const savedRoomId = localStorage.getItem("currentRoomId");
      
      if (savedRoomId) {
        setCurrentRoomId(savedRoomId);
        await loadRoomNameById(savedRoomId);
        setInRoom(true);
      } else {
        setInRoom(false);
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
    setInRoom(true);
  };

  const clearCurrentRoom = () => {
    setCurrentRoomId(null);
    setCurrentRoomName(null);
    localStorage.removeItem("currentRoomId");
    setInRoom(false);
  };

  return (
    <RoomContext.Provider value={{ currentRoomId, currentRoomName, setCurrentRoom, clearCurrentRoom, loadRoomName, inRoom }}>
      {children}
    </RoomContext.Provider>
  );
};
