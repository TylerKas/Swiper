import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Users, Heart, HandHeart, User, Plus, Search, LogOut, LayoutDashboard } from "lucide-react";
import LogoWhite from "@/assets/LogoWhite.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { loadProfile, ProfileData } from "@/firebase";
import { useState, useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const uid = user?.uid;
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if profile is complete
  const isProfileComplete = () => {
    if (!user || !profileData) return false;
    
    // Check mandatory fields
    const mandatoryFields = [
      profileData.full_name,
      profileData.phone,
      profileData.age,
      profileData.address
    ];
    
    const isComplete = mandatoryFields.every(field => field && field.trim() !== '');
    console.log('Profile completion check:', { 
      user: !!user, 
      profileData: !!profileData, 
      fields: mandatoryFields, 
      isComplete 
    });
    
    return isComplete;
  };

  // Load profile data from Firestore
  useEffect(() => {
    const loadProfileData = async () => {
      if (!uid) {
        setProfileData(null);
        return;
      }
      
      try {
        setLoading(true);
        const savedProfile = await loadProfile(uid);
        setProfileData(savedProfile);
      } catch (error) {
        console.error('Error loading profile data:', error);
        setProfileData(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [uid]);

  const handleFindWorkClick = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to access Find Work",
        variant: "destructive",
      });
      return;
    }

    if (!isProfileComplete()) {
      toast({
        title: "Profile Incomplete",
        description: "Please complete your profile before finding work",
        variant: "destructive",
      });
      navigate('/profile');
      return;
    }

    navigate('/find-work');
  };

  const handlePostJobClick = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to post a job",
        variant: "destructive",
      });
      return;
    }

    if (!isProfileComplete()) {
      toast({
        title: "Profile Incomplete",
        description: "Please complete your profile before posting a job",
        variant: "destructive",
      });
      navigate('/profile');
      return;
    }

    navigate('/post-job');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // The AuthContext will automatically update the user state
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src={LogoWhite} 
              alt="Giggle" 
              className="h-16 w-auto mt-4"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Button 
                  onClick={() => navigate('/dashboard')}
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
                  title="Dashboard"
                >
                  <LayoutDashboard className="h-5 w-5" />
                </Button>
                <Button 
                  onClick={() => navigate('/profile')}
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
                  title="Profile"
                >
                  <User className="h-5 w-5" />
                </Button>
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  className="text-white hover:bg-white/20"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/login')}
                  className="text-white hover:bg-white/20"
                >
                  Log In
                </Button>
                <Button
                  onClick={() => navigate('/signup')}
                  className="bg-white text-primary hover:bg-white/90"
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              Connecting
              <span className="block text-accent"> Generations</span>
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Connect people who need help with workers looking for opportunities. 
              Building communities, one task at a time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <div className="text-center">
              <Button
                size="lg"
                onClick={handleFindWorkClick}
                disabled={loading || (user && !isProfileComplete())}
                className="w-full sm:w-48 h-16 bg-white text-primary hover:bg-white/90 text-xl font-semibold shadow-warm rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="h-6 w-6 mr-3" />
                Find Work
              </Button>
              <p className="text-white/80 text-sm mt-2">
                {user && !isProfileComplete() ? "Complete your profile first" : "Looking to earn money?"}
              </p>
            </div>
            <div className="text-center">
              <Button
                size="lg"
                onClick={handlePostJobClick}
                disabled={loading || (user && !isProfileComplete())}
                className="w-full sm:w-48 h-16 bg-white/20 backdrop-blur border-2 border-white/30 text-white hover:bg-white/30 text-xl font-semibold shadow-warm rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-6 w-6 mr-3" />
                Post a Job
              </Button>
              <p className="text-white/80 text-sm mt-2">
                {user && !isProfileComplete() ? "Complete your profile first" : "Need help with a task?"}
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white">Safe & Trusted</h3>
            <p className="text-white/80">Verified users and secure matching system</p>
          </div>
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white">Easy Matching</h3>
            <p className="text-white/80">Swipe-based interface for quick connections</p>
          </div>
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <HandHeart className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white">Community First</h3>
            <p className="text-white/80">Building bridges between generations</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;