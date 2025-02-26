
import { SignIn } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

const Auth = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8">
        <SignIn 
          afterSignInUrl="/players"
          signUpUrl="/auth?sign-up=true"
          appearance={{
            elements: {
              formButtonPrimary: 'bg-primary hover:bg-primary/90',
              card: 'bg-background border border-border',
            }
          }}
        />
      </div>
    </div>
  );
};

export default Auth;
