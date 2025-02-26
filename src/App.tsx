
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Players from "@/pages/Players";
import OneVOne from "@/pages/OneVOne";
import TwoVTwo from "@/pages/TwoVTwo";
import History from "@/pages/History";
import Leaderboard from "@/pages/Leaderboard";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/players" replace />} />
          <Route path="/players" element={<Players />} />
          <Route path="/1v1" element={<OneVOne />} />
          <Route path="/2v2" element={<TwoVTwo />} />
          <Route path="/history" element={<History />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
