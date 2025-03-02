
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import Navbar from "@/components/Navbar";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import OneVOne from "@/pages/OneVOne";
import TwoVTwo from "@/pages/TwoVTwo";
import History from "@/pages/History";
import Leaderboard from "@/pages/Leaderboard";
import Players from "@/pages/Players";
import Auth from "@/pages/Auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/context/AuthContext";
import "./App.css";

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </Router>
    </AuthProvider>
  );
};

export default App;
