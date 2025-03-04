
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/Navbar";
import NotFound from "@/pages/NotFound";
import OneVOne from "@/pages/OneVOne";
import TwoVTwo from "@/pages/TwoVTwo";
import History from "@/pages/History";
import Leaderboard from "@/pages/Leaderboard";
import Players from "@/pages/Players";
import Rooms from "@/pages/Rooms";
import Auth from "@/pages/Auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";
import { RoomProvider } from "@/context/RoomContext";
import Tournaments from "@/pages/Tournaments";
import "./App.css";

const App = () => {
  return (
    <AuthProvider>
      <RoomProvider>
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={<Navigate to="/rooms" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/rooms" element={
              <ProtectedRoute>
                <Rooms />
              </ProtectedRoute>
            } />
            <Route path="/1v1" element={
              <ProtectedRoute>
                <OneVOne />
              </ProtectedRoute>
            } />
            <Route path="/2v2" element={
              <ProtectedRoute>
                <TwoVTwo />
              </ProtectedRoute>
            } />
            <Route path="/history" element={<History />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/players" element={
              <ProtectedRoute>
                <Players />
              </ProtectedRoute>
            } />
            <Route path="/tournaments" element={
              <ProtectedRoute>
                <Tournaments />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </Router>
      </RoomProvider>
    </AuthProvider>
  );
};

export default App;
