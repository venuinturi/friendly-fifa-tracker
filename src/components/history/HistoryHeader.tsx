
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

interface HistoryHeaderProps {
  title: string;
  roomName?: string;
  onExport: () => void;
}

export const HistoryHeader = ({ title, roomName, onExport }: HistoryHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-6">
      <h1 className="text-3xl font-bold mb-4 md:mb-0">{title}</h1>
      {roomName && (
        <h2 className="text-xl font-medium text-muted-foreground mb-4 md:mb-0">
          Room: {roomName}
        </h2>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onExport} className="bg-primary hover:bg-primary-hover">
          <FileDown className="mr-2 h-4 w-4" /> Export to Excel
        </Button>
      </div>
    </div>
  );
};
