import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, X, Heart, MapPin, Clock, DollarSign, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import ActiveTasksList from "@/components/ActiveTasksList";
import { EarningsDashboard } from "@/components/EarningsDashboard";

interface Task {
  id: string;
  title: string;
  description: string;
  clientName: string;
  clientAge?: number;
  client_id: string;
  location: string;
  payment: number;
  timeEstimate: string;
  category: string;
  urgency: string;
}

const FindWork = () => {
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'discover' | 'active'>('discover');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        // Show mock data
        const mockTasks: Task[] = [
          {
            id: '1',
            title: 'Tech Support Needed',
            description: 'Help setting up new smartphone and tablet',
            clientName: 'Margaret Thompson',
            client_id: 'client1',
            location: 'Los Angeles',
            payment: 99.98,
            timeEstimate: '1 hour',
            category: 'Technology',
            urgency: 'This week'
          },
          {
            id: '2',
            title: 'Grocery Shopping',
            description: 'Need help with grocery shopping and carrying bags',
            clientName: 'Robert Williams',
            client_id: 'client2',
            location: 'Campus Area',
            payment: 30,
            timeEstimate: '1 hour',
            category: 'Shopping',
            urgency: 'Flexible'
          }
        ];
        
        setTasks(mockTasks);
      } catch (error) {
        console.error('Error loading tasks:', error);
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
  }, [toast]);

  const currentTask = tasks[currentTaskIndex];

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
    if (!currentTask) return;

    try {
      toast({
        title: "Match! 💚",
        description: `You've been matched with ${currentTask?.clientName}. They will be notified!`,
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">
              Find Work
            </h1>
            <div className="w-10"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-120px)]">
        {activeView === 'discover' ? (
          <div className="w-full max-w-sm">
            <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-3xl shadow-xl overflow-hidden text-white relative">
              {/* Task Header */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="bg-white/20 backdrop-blur rounded-full px-3 py-1 text-sm font-medium">
                    {currentTask.category}
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-full px-3 py-1 text-sm font-medium">
                    {currentTask.urgency}
                  </div>
                </div>
                
                <h2 className="text-3xl font-bold mb-2 uppercase tracking-wide">{currentTask.title}</h2>
                <p className="text-lg font-medium uppercase tracking-wide opacity-90">{currentTask.clientName}</p>
                <p className="text-sm opacity-75 mt-6">{currentTask.description}</p>
              </div>

              {/* Task Details */}
              <div className="px-6 pb-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 opacity-80" />
                    <span className="text-sm">{currentTask.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 opacity-80" />
                    <span className="text-sm">{currentTask.timeEstimate}</span>
                  </div>
                </div>

                {/* Payment Badge */}
                <div className="bg-white/20 backdrop-blur rounded-2xl p-4 text-center mb-8">
                  <span className="text-2xl font-bold">${currentTask.payment}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center items-center space-x-8 mt-12">
              <Button
                size="lg"
                variant="outline"
                className="w-16 h-16 rounded-full border-2 border-gray-300 bg-white hover:bg-gray-50 shadow-lg"
                onClick={() => handleSwipe('left')}
              >
                <X className="h-8 w-8 text-red-500" />
              </Button>
              <Button
                size="lg"
                className="w-16 h-16 rounded-full bg-white border-2 border-orange-300 hover:bg-orange-50 shadow-lg"
                onClick={() => handleSwipe('right')}
              >
                <Heart className="h-8 w-8 text-orange-500" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <EarningsDashboard />
            <ActiveTasksList userType="worker" />
          </div>
        )}
      </main>
    </div>
  );
};

export default FindWork;
