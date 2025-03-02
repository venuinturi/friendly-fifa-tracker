
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Players from "@/pages/Players";
import OneVOne from "@/pages/OneVOne";
import TwoVTwo from "@/pages/TwoVTwo";
import History from "@/pages/History";
import Leaderboard from "@/pages/Leaderboard";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Navigate to="/players" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/players" element={
              <ProtectedRoute>
                <Players />
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
            <Route path="/history" element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            } />
            <Route path="/leaderboard" element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
