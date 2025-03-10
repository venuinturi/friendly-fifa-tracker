
import { useState, FormEvent } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    if (!password || password.length < 6) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (isLogin) {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
        
        // Log the user in
        await login(email);
        navigate("/");
      } else {
        // Sign up 
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        });
        
        if (error) throw error;
        
        // First check if we have a user profile for this email
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        
        // If no profile exists, create one
        if (!existingProfile) {
          await supabase
            .from('user_profiles')
            .insert([{ 
              email, 
              display_name: email.split('@')[0] // Use part of email as default display name
            }]);
        }
        
        toast({
          title: "Account created",
          description: "Please check your email for the confirmation link",
        });
      }
    } catch (error: any) {
      console.error("Error during auth:", error);
      toast({
        title: isLogin ? "Login failed" : "Signup failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container pt-28 md:pt-24 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{isLogin ? "Sign In" : "Sign Up"}</CardTitle>
          <CardDescription>
            {isLogin
              ? "Enter your email and password to sign in"
              : "Create a new account"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Input
                  id="email"
                  placeholder="name@example.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Input
                  id="password"
                  placeholder="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting 
                ? (isLogin ? "Signing in..." : "Signing up...") 
                : (isLogin ? "Sign In" : "Sign Up")}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              className="w-full"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin 
                ? "Don't have an account? Sign Up" 
                : "Already have an account? Sign In"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Auth;
