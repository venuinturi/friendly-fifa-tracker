
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Index from "./pages/Index";
import OneVOne from "./pages/OneVOne";
import TwoVTwo from "./pages/TwoVTwo";
import History from "./pages/History";
import Players from "./pages/Players";
import Rooms from "./pages/Rooms";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Leaderboard from "./pages/Leaderboard";
import Tournaments from "./pages/Tournaments";
import Profile from "./pages/Profile";
import { Toaster } from "./components/ui/toaster";
import { AuthProvider } from "./context/AuthContext";
import { RoomProvider } from "./context/RoomContext";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <RoomProvider>
        <div className="min-h-screen bg-background text-foreground">
          <Navbar />
          <div className="pt-16"> {/* Add padding top to prevent content from being under navbar */}
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/1v1" element={<ProtectedRoute element={<OneVOne />} />} />
              <Route path="/2v2" element={<ProtectedRoute element={<TwoVTwo />} />} />
              <Route path="/history" element={<ProtectedRoute element={<History />} />} />
              <Route path="/players" element={<ProtectedRoute element={<Players />} />} />
              <Route path="/rooms" element={<ProtectedRoute element={<Rooms />} />} />
              <Route path="/leaderboard" element={<ProtectedRoute element={<Leaderboard />} />} />
              <Route path="/tournaments" element={<ProtectedRoute element={<Tournaments />} />} />
              <Route path="/profile" element={<ProtectedRoute element={<Profile />} />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Toaster />
        </div>
      </RoomProvider>
    </AuthProvider>
  );
}

export default App;
