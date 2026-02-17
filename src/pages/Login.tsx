import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);

  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpLoading, setSignUpLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail.trim() || !signInPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    setSignInLoading(true);
    const { error } = await signIn(signInEmail.trim(), signInPassword);
    setSignInLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate('/');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpEmail.trim() || !signUpPassword || !signUpFullName.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    if (signUpPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSignUpLoading(true);
    const { error } = await signUp(signUpEmail.trim(), signUpPassword, signUpFullName.trim());
    setSignUpLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created successfully');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="ops-header-bg">
        <div className="mx-auto max-w-md px-4 py-20 md:px-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-9 w-9 rounded bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-sm">OP</span>
            </div>
            <h1 className="text-2xl font-bold text-primary-foreground tracking-tight">
              OpsPulse
            </h1>
          </div>
          <div className="ops-accent-line mb-4" />
          <p className="text-primary-foreground/50 text-sm">
            Sign in to continue
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 -mt-6 pb-16 md:px-6">
        <div className="rounded-lg border border-border bg-card p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input
                    type="email"
                    value={signInEmail}
                    onChange={e => setSignInEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Password</Label>
                  <Input
                    type="password"
                    value={signInPassword}
                    onChange={e => setSignInPassword(e.target.value)}
                    placeholder="Enter password"
                    className="text-sm"
                  />
                </div>
                <Button type="submit" disabled={signInLoading} className="w-full">
                  {signInLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Full Name</Label>
                  <Input
                    value={signUpFullName}
                    onChange={e => setSignUpFullName(e.target.value)}
                    placeholder="John Doe"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input
                    type="email"
                    value={signUpEmail}
                    onChange={e => setSignUpEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Password</Label>
                  <Input
                    type="password"
                    value={signUpPassword}
                    onChange={e => setSignUpPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="text-sm"
                  />
                </div>
                <Button type="submit" disabled={signUpLoading} className="w-full">
                  {signUpLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Login;
