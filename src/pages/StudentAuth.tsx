import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, User, Mail, Phone, MapPin, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  schoolEmail: z.string().email('Invalid school email').refine(
    (email) => email.includes('.edu'),
    'Must be a valid school email (.edu)'
  ),
  phone: z.string().min(10, 'Phone number required'),
  location: z.string().min(2, 'Location is required'),
  milesRadius: z.number().min(1).max(50),
  preferences: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

type SignupForm = z.infer<typeof signupSchema>;
type LoginForm = z.infer<typeof loginSchema>;

const StudentAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      milesRadius: 10
    }
  });

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  // Redirect if already authenticated
  React.useEffect(() => {
    if (user) {
      navigate('/student');
    }
  }, [user, navigate]);

  const handleSignup = async (data: SignupForm) => {
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/student`;
      
      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: data.fullName
          }
        }
      });

      if (signUpError) {
        toast({
          title: 'Signup Error',
          description: signUpError.message,
          variant: 'destructive'
        });
        return;
      }

      // Update profile with additional information
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          email: data.email,
          school_email: data.schoolEmail,
          phone: data.phone,
          location: data.location,
          miles_radius: data.milesRadius,
          preferences: data.preferences ? data.preferences.split(',').map(p => p.trim()) : [],
          user_type: 'student'
        })
        .eq('email', data.email);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      toast({
        title: 'Account Created!',
        description: 'Please check your email to verify your account.'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (data: LoginForm) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (error) {
        toast({
          title: 'Login Error',
          description: error.message,
          variant: 'destructive'
        });
        return;
      }

      navigate('/student');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary">
      <header className="container mx-auto px-4 py-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/')}
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </header>

      <main className="container mx-auto px-4 py-8 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center space-x-2">
              <Users className="h-6 w-6 text-primary" />
              <span>{isLogin ? 'Student Login' : 'Student Signup'}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLogin ? (
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      placeholder="Enter your email"
                      className="pl-10"
                      {...loginForm.register('email')}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    {...loginForm.register('password')}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </Button>
              </form>
            ) : (
              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="John Doe"
                        className="pl-10"
                        {...signupForm.register('fullName')}
                      />
                    </div>
                    {signupForm.formState.errors.fullName && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="(555) 123-4567"
                        className="pl-10"
                        {...signupForm.register('phone')}
                      />
                    </div>
                    {signupForm.formState.errors.phone && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Personal Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      placeholder="john@gmail.com"
                      className="pl-10"
                      {...signupForm.register('email')}
                    />
                  </div>
                  {signupForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolEmail">School Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="schoolEmail"
                      placeholder="john@university.edu"
                      className="pl-10"
                      {...signupForm.register('schoolEmail')}
                    />
                  </div>
                  {signupForm.formState.errors.schoolEmail && (
                    <p className="text-sm text-destructive">{signupForm.formState.errors.schoolEmail.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Choose a password"
                    {...signupForm.register('password')}
                  />
                  {signupForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{signupForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="location"
                        placeholder="Los Angeles, CA"
                        className="pl-10"
                        {...signupForm.register('location')}
                      />
                    </div>
                    {signupForm.formState.errors.location && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.location.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="milesRadius">Miles Radius</Label>
                    <Input
                      id="milesRadius"
                      type="number"
                      placeholder="10"
                      {...signupForm.register('milesRadius', { valueAsNumber: true })}
                    />
                    {signupForm.formState.errors.milesRadius && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.milesRadius.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferences">Preferences (comma separated)</Label>
                  <Textarea
                    id="preferences"
                    placeholder="Technology, Shopping, Yard Work, Moving..."
                    {...signupForm.register('preferences')}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            )}

            <div className="text-center">
              <Button 
                variant="link" 
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StudentAuth;