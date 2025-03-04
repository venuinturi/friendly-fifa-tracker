
import { User } from "lucide-react";

interface UpdatedByProps {
  createdBy?: string;
  updatedBy?: string;
  updatedAt?: string;
  createdAt: string;
}

const UpdatedBy = ({ createdBy, updatedBy, updatedAt, createdAt }: UpdatedByProps) => {
  // If the record was updated after creation, show the updated by info
  if (updatedBy && updatedAt && new Date(updatedAt).getTime() > new Date(createdAt).getTime()) {
    return (
      <div className="flex flex-col text-sm text-muted-foreground mt-2">
        <div className="flex items-center">
          <User className="h-4 w-4 mr-1" />
          <span>Added by {createdBy || "Unknown"} on {new Date(createdAt).toLocaleString()}</span>
        </div>
        <div className="flex items-center mt-1">
          <User className="h-4 w-4 mr-1" />
          <span>Updated by {updatedBy} on {new Date(updatedAt).toLocaleString()}</span>
        </div>
      </div>
    );
  }
  
  // Otherwise show the created by info
  return (
    <div className="flex items-center text-sm text-muted-foreground mt-2">
      <User className="h-4 w-4 mr-1" />
      <span>Added by {createdBy || "Unknown"} on {new Date(createdAt).toLocaleString()}</span>
    </div>
  );
};

export default UpdatedBy;
