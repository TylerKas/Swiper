import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, X, Heart, MapPin, Clock, DollarSign, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ActiveTasksList from "@/components/ActiveTasksList";
import { EarningsDashboard } from "@/components/EarningsDashboard";

interface Task {
  id: string;
  title: string;
  description: string;
  elderName: string;
  elderAge?: number;
  elder_id: string;
  location: string;
  payment: number;
  timeEstimate: string;
  category: string;
  urgency: string;
}

const StudentDashboard = () => {
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'discover' | 'active'>('discover');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch real tasks from database
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) return;
      
      try {
        const { data: tasksData, error } = await supabase
          .from('tasks')
          .select(`
            id,
            title,
            description,
            location,
            payment,
            time_estimate,
            category,
            urgency,
            elder_id,
            profiles!tasks_elder_id_fkey (
              full_name
            )
          `)
          .eq('status', 'open')
          .limit(20);

        if (error) {
          console.error('Error fetching tasks:', error);
          toast({
            title: "Error loading tasks",
            description: "Could not load available tasks. Please try again.",
            variant: "destructive"
          });
          return;
        }

        const formattedTasks: Task[] = tasksData?.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          elderName: task.profiles?.full_name || 'Elder User',
          elder_id: task.elder_id,
          location: task.location || 'Location not specified',
          payment: task.payment,
          timeEstimate: task.time_estimate || 'Time not specified',
          category: task.category,
          urgency: task.urgency || 'Flexible'
        })) || [];

        setTasks(formattedTasks);
      } catch (error) {
        console.error('Unexpected error fetching tasks:', error);
        toast({
          title: "Error loading tasks",
          description: "Something went wrong. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user, toast]);

  const currentTask = tasks[currentTaskIndex];

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/student-auth');
    }
  }, [user, loading, navigate]);

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (direction === 'right') {
      await createMatch();
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

  const createMatch = async () => {
    if (!user || !currentTask) return;

    try {
      // Get current user's profile ID
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!studentProfile) throw new Error('Student profile not found');

      // Create actual match record
      const { error } = await supabase
        .from('matches')
        .insert({
          task_id: currentTask.id,
          student_id: studentProfile.id,
          elder_id: currentTask.elder_id,
          status: 'liked'
        });

      if (error) {
        console.error('Error creating match:', error);
        toast({
          title: "Failed to create match",
          description: "Please try again",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Match! 💚",
        description: `You've been matched with ${currentTask?.elderName}. They will be notified!`,
      });
    } catch (error) {
      console.error('Error creating match:', error);
      toast({
        title: "Failed to create match",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <h2 className="text-xl font-semibold">Loading tasks...</h2>
        </div>
      </div>
    );
  }

  if (!currentTask || tasks.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">No tasks available</h2>
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
              onClick={() => navigate('/')}
              className="hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">
              {activeView === 'discover' ? 'Find Tasks' : 'Active Tasks'}
            </h1>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setActiveView(activeView === 'discover' ? 'active' : 'discover')}
              className="hover:bg-white/20"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 min-h-[calc(100vh-120px)]">
        {activeView === 'discover' ? (
          <div className="flex items-center justify-center h-full">
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
          </div>
        ) : (
          <div className="space-y-6">
            <EarningsDashboard />
            <ActiveTasksList userType="student" />
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;