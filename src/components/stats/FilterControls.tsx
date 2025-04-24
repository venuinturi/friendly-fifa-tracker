
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

interface FilterControlsProps {
  gameType: "1v1" | "2v2";
  onGameTypeChange: (value: "1v1" | "2v2") => void;
  timeFilter: "month" | "allTime";
  onTimeFilterChange: (value: "month" | "allTime") => void;
  selectedMonth: string;
  onMonthChange: (value: string) => void;
  months: Array<{ value: string; label: string }>;
  isMonthVisible: boolean;
}

export const FilterControls = ({
  gameType,
  onGameTypeChange,
  timeFilter,
  onTimeFilterChange,
  selectedMonth,
  onMonthChange,
  months,
  isMonthVisible
}: FilterControlsProps) => {
  return (
    <Card className="p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <Tabs value={gameType} onValueChange={(v) => onGameTypeChange(v as "1v1" | "2v2")} className="w-full md:w-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="1v1">1v1</TabsTrigger>
            <TabsTrigger value="2v2">2v2</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <Select
            value={timeFilter}
            onValueChange={(v) => onTimeFilterChange(v as "month" | "allTime")}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="allTime">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          {isMonthVisible && (
            <Select
              value={selectedMonth}
              onValueChange={onMonthChange}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </Card>
  );
};
