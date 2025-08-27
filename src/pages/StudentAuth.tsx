import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User, Mail, Phone, MapPin, Users, GraduationCap, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
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
  university: z.string().min(2, 'University is required'),
  phone: z.string().min(10, 'Phone number required'),
  bio: z.string().optional(),
  address: z.string().min(2, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(5, 'ZIP code is required'),
  milesRadius: z.number().min(1).max(50),
  preferences: z.array(z.string()).min(1, 'Please select at least one work preference'),
  timeCommitment: z.string().min(1, 'Please select a time commitment')
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
      milesRadius: 10,
      preferences: [],
      timeCommitment: ''
    }
  });

  const workPreferences = [
    'Grocery Shopping',
    'Tech Help', 
    'Yard Work',
    'House Cleaning',
    'Transportation',
    'Pet Care',
    'Home Repair',
    'Moving Help',
    'Companionship',
    'General Errands'
  ];

  const timeCommitments = [
    'Less than 5 hours per week',
    '5-10 hours per week',
    '10-15 hours per week',
    '15-20 hours per week',
    'More than 20 hours per week'
  ];

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
        <Card className="w-full max-w-2xl bg-white/95 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            {!isLogin && <h1 className="text-3xl font-bold mb-2">Welcome, Student!</h1>}
            <CardTitle className="text-center flex items-center justify-center space-x-2">
              <Users className="h-6 w-6 text-primary" />
              <span>{isLogin ? 'Student Login' : 'Student Signup'}</span>
            </CardTitle>
            {!isLogin && <p className="text-muted-foreground">Let's set up your profile to start earning money helping seniors</p>}
          </CardHeader>
          <CardContent className="space-y-8">
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
              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-8">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <GraduationCap className="h-5 w-5" />
                    <span>Basic Information</span>
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      {...signupForm.register('fullName')}
                    />
                    {signupForm.formState.errors.fullName && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Personal Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@gmail.com"
                      {...signupForm.register('email')}
                    />
                    {signupForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schoolEmail">School Email</Label>
                    <Input
                      id="schoolEmail"
                      type="email"
                      placeholder="john@university.edu"
                      {...signupForm.register('schoolEmail')}
                    />
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

                  <div className="space-y-2">
                    <Label htmlFor="university">University</Label>
                    <Input
                      id="university"
                      placeholder="e.g., University of California, Berkeley"
                      {...signupForm.register('university')}
                    />
                    {signupForm.formState.errors.university && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.university.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      placeholder="(555) 123-4567"
                      {...signupForm.register('phone')}
                    />
                    {signupForm.formState.errors.phone && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio (Optional)</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell seniors a bit about yourself..."
                      rows={4}
                      {...signupForm.register('bio')}
                    />
                  </div>
                </div>

                {/* Location Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>Location</span>
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="123 Main Street"
                      {...signupForm.register('address')}
                    />
                    {signupForm.formState.errors.address && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.address.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="Berkeley"
                        {...signupForm.register('city')}
                      />
                      {signupForm.formState.errors.city && (
                        <p className="text-sm text-destructive">{signupForm.formState.errors.city.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        placeholder="CA"
                        {...signupForm.register('state')}
                      />
                      {signupForm.formState.errors.state && (
                        <p className="text-sm text-destructive">{signupForm.formState.errors.state.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      placeholder="94720"
                      {...signupForm.register('zipCode')}
                    />
                    {signupForm.formState.errors.zipCode && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.zipCode.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="milesRadius">Maximum Distance (miles)</Label>
                    <Controller
                      name="milesRadius"
                      control={signupForm.control}
                      render={({ field }) => (
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue="10">
                          <SelectTrigger>
                            <SelectValue placeholder="Select maximum distance" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 miles</SelectItem>
                            <SelectItem value="10">10 miles</SelectItem>
                            <SelectItem value="15">15 miles</SelectItem>
                            <SelectItem value="25">25 miles</SelectItem>
                            <SelectItem value="50">50 miles</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {signupForm.formState.errors.milesRadius && (
                      <p className="text-sm text-destructive">{signupForm.formState.errors.milesRadius.message}</p>
                    )}
                  </div>
                </div>

                {/* Work Preferences Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center space-x-2">
                    <Briefcase className="h-5 w-5" />
                    <span>Work Preferences</span>
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Types of work you're interested in</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {workPreferences.map((preference) => (
                          <div key={preference} className="flex items-center space-x-2">
                            <Controller
                              name="preferences"
                              control={signupForm.control}
                              render={({ field }) => (
                                <Checkbox
                                  checked={field.value?.includes(preference)}
                                  onCheckedChange={(checked) => {
                                    const currentPreferences = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentPreferences, preference]);
                                    } else {
                                      field.onChange(currentPreferences.filter((p) => p !== preference));
                                    }
                                  }}
                                />
                              )}
                            />
                            <Label className="text-sm font-normal">{preference}</Label>
                          </div>
                        ))}
                      </div>
                      {signupForm.formState.errors.preferences && (
                        <p className="text-sm text-destructive">{signupForm.formState.errors.preferences.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Preferred Time Commitment</Label>
                      <Controller
                        name="timeCommitment"
                        control={signupForm.control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time commitment" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeCommitments.map((commitment) => (
                                <SelectItem key={commitment} value={commitment}>
                                  {commitment}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {signupForm.formState.errors.timeCommitment && (
                        <p className="text-sm text-destructive">{signupForm.formState.errors.timeCommitment.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
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