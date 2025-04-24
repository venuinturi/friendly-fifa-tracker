
import { useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { downloadAsExcel } from "@/utils/excelUtils";
import { GamesList } from "@/components/GamesList";
import { useAuth } from "@/context/AuthContext";
import { useRoom } from "@/context/RoomContext";
import RoomRequired from "@/components/RoomRequired";
import { HistoryHeader } from "@/components/history/HistoryHeader";
import { useGameHistory } from "@/hooks/useGameHistory";

const History = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { currentRoomId, currentRoomName, inRoom } = useRoom();
  const { 
    games, 
    editingIndex, 
    editForm, 
    startEditing,
    cancelEditing, 
    saveEdit, 
    deleteRecord, 
    handleEditFormChange,
    loadGamesHistory
  } = useGameHistory(currentRoomId);

  useEffect(() => {
    if (currentRoomId) {
      console.log("Loading game history for room:", currentRoomId);
      loadGamesHistory();
    }
  }, [currentRoomId, loadGamesHistory]);

  if (!inRoom) {
    return <RoomRequired />;
  }

  return (
    <div className="container mx-auto px-4 pt-28 md:pt-24">
      <HistoryHeader 
        title="Match History" 
        roomName={currentRoomName} 
        onExport={downloadAsExcel} 
      />
      
      <Tabs defaultValue="1v1" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="1v1" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            1v1
          </TabsTrigger>
          <TabsTrigger value="2v2" className="data-[state=active]:bg-primary data-[state=active]:text-white">
            2v2
          </TabsTrigger>
        </TabsList>
        <TabsContent value="1v1">
          <GamesList
            games={games}
            gameType="1v1"
            editingIndex={editingIndex}
            editForm={editForm}
            onStartEdit={startEditing}
            onDelete={deleteRecord}
            onSave={saveEdit}
            onCancel={cancelEditing}
            onEditFormChange={handleEditFormChange}
            canEdit={isAdmin}
            canDelete={isAdmin}
          />
        </TabsContent>
        <TabsContent value="2v2">
          <GamesList
            games={games}
            gameType="2v2"
            editingIndex={editingIndex}
            editForm={editForm}
            onStartEdit={startEditing}
            onDelete={deleteRecord}
            onSave={saveEdit}
            onCancel={cancelEditing}
            onEditFormChange={handleEditFormChange}
            canEdit={isAdmin}
            canDelete={isAdmin}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default History;
