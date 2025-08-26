import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, X, Heart, MapPin, Clock, DollarSign, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Mock task data
const mockTasks = [
  {
    id: 1,
    title: "Help with grocery shopping",
    description: "Need someone to help me with my weekly grocery shopping. I have a list ready and just need assistance getting around the store.",
    elderName: "Margaret Thompson",
    elderAge: 73,
    location: "Downtown Campus Area",
    payment: 25,
    timeEstimate: "2 hours",
    category: "Shopping",
    urgency: "This week"
  },
  {
    id: 2,
    title: "Computer setup assistance", 
    description: "I got a new laptop and need help setting it up. Installing programs, transferring files, and showing me how to use video calling.",
    elderName: "Robert Chen",
    elderAge: 68,
    location: "University District",
    payment: 40,
    timeEstimate: "3 hours",
    category: "Technology",
    urgency: "Flexible"
  },
  {
    id: 3,
    title: "Garden cleanup",
    description: "My backyard garden needs some cleanup before winter. Raking leaves, trimming bushes, and general tidying up.",
    elderName: "Dorothy Williams",
    elderAge: 71,
    location: "Near Campus",
    payment: 35,
    timeEstimate: "4 hours",
    category: "Yard Work",
    urgency: "This weekend"
  },
  {
    id: 4,
    title: "Moving boxes to attic",
    description: "I have some storage boxes that need to be moved up to the attic. Not too heavy but I can't manage the ladder anymore.",
    elderName: "Frank Rodriguez",
    elderAge: 76,
    location: "Student Housing Area",
    payment: 30,
    timeEstimate: "1.5 hours",
    category: "Moving",
    urgency: "Today"
  }
];

const StudentDashboard = () => {
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [tasks, setTasks] = useState(mockTasks);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/');
      }
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const currentTask = tasks[currentTaskIndex];

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      toast({
        title: "Match! 💚",
        description: `You've been matched with ${currentTask?.elderName}. They will be notified!`,
      });
    } else {
      toast({
        title: "Task passed",
        description: "Looking for the next opportunity...",
      });
    }

    // Move to next task
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    } else {
      // Reset to beginning or show "no more tasks"
      setCurrentTaskIndex(0);
    }
  };

  if (!currentTask) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">No more tasks available</h2>
          <p className="text-muted-foreground">Check back later for new opportunities!</p>
          <Button onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="bg-white/50 backdrop-blur border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="hover:bg-white/20"
            >
              <User className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Find Tasks</h1>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Task Card */}
      <main className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="w-full max-w-sm">
          <Card className="bg-white shadow-card-custom border-0 overflow-hidden">
            <CardContent className="p-0">
              {/* Task Header */}
              <div className="bg-gradient-warm p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    {currentTask.category}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-0">
                    {currentTask.urgency}
                  </Badge>
                </div>
                <h2 className="text-xl font-bold mb-2">{currentTask.title}</h2>
                <p className="text-sm opacity-90">{currentTask.elderName}, {currentTask.elderAge}</p>
              </div>

              {/* Task Details */}
              <div className="p-6 space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  {currentTask.description}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{currentTask.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{currentTask.timeEstimate}</span>
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-2 bg-gradient-primary p-3 rounded-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                  <span className="text-xl font-bold text-white">${currentTask.payment}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex p-6 pt-0 space-x-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 border-2 border-red-200 hover:bg-red-50 hover:border-red-300"
                  onClick={() => handleSwipe('left')}
                >
                  <X className="h-6 w-6 text-red-500" />
                </Button>
                <Button
                  size="lg"
                  className="flex-1 bg-gradient-primary hover:opacity-90"
                  onClick={() => handleSwipe('right')}
                >
                  <Heart className="h-6 w-6" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Progress Indicator */}
          <div className="flex justify-center mt-6 space-x-2">
            {tasks.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentTaskIndex ? 'bg-primary' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;