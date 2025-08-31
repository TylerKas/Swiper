import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Users, Heart, HandHeart, User, Plus, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="h-8 w-8 text-white" />
            <h1 className="text-2xl font-bold text-white">HelpMate</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <Button
                variant="secondary"
                onClick={() => navigate('/profile')}
                className="bg-white/20 backdrop-blur border-white/20 text-white hover:bg-white/30"
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
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
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                Connecting
                <span className="block text-accent"> Generations</span>
              </h2>
              <p className="text-xl text-white/90 max-w-lg">
                Match elderly people who need help with college students looking for easy income. 
                Building communities, one task at a time.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/elder')}
                className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-4"
              >
                <Plus className="h-5 w-5 mr-2" />
                Post a Job
              </Button>
              <Button
                size="lg"
                onClick={() => navigate('/student')}
                className="bg-white/20 backdrop-blur border-white/20 text-white hover:bg-white/30 text-lg px-8 py-4"
              >
                <Search className="h-5 w-5 mr-2" />
                Find Work
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-warm">
              <img 
                src={heroImage} 
                alt="Grandmother and college student working together in a cozy setting"
                className="w-full h-auto object-cover"
              />
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