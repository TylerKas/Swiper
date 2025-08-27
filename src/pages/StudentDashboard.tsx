import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, DollarSign, CheckCircle, Clock, TrendingUp, MapPin, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardStats {
  totalEarnings: number;
  tasksCompleted: number;
  pendingMatches: number;
  averageRating: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  payment: number;
  location: string;
  created_at: string;
  status: string;
}

interface CompletedTask {
  id: string;
  task_id: string;
  amount_earned: number;
  rating_given: number;
  completed_at: string;
  tasks: {
    title: string;
    description: string;
  };
}

const StudentDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalEarnings: 0,
    tasksCompleted: 0,
    pendingMatches: 0,
    averageRating: 5.0
  });
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (!profile) return;

      // Fetch completed tasks and calculate stats
      const { data: completedTasksData } = await supabase
        .from('completed_tasks')
        .select(`
          *,
          tasks (title, description)
        `)
        .eq('student_id', profile.id)
        .order('completed_at', { ascending: false })
        .limit(5);

      // Calculate total earnings and tasks completed
      const totalEarnings = completedTasksData?.reduce((sum, task) => sum + Number(task.amount_earned), 0) || 0;
      const tasksCompleted = completedTasksData?.length || 0;
      
      // Calculate average rating
      const ratingsGiven = completedTasksData?.filter(task => task.rating_given) || [];
      const averageRating = ratingsGiven.length > 0 
        ? ratingsGiven.reduce((sum, task) => sum + task.rating_given, 0) / ratingsGiven.length
        : 5.0;

      // Fetch active/available tasks
      const { data: activeTasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'available')
        .order('created_at', { ascending: false })
        .limit(5);

      const pendingMatches = activeTasksData?.length || 0;

      setStats({
        totalEarnings,
        tasksCompleted,
        pendingMatches,
        averageRating: Math.round(averageRating * 10) / 10
      });

      setActiveTasks(activeTasksData || []);
      setCompletedTasks(completedTasksData || []);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <h1 className="text-3xl font-bold">Your Dashboard</h1>
              <p className="text-muted-foreground mt-1">Track your tasks and earnings</p>
            </div>
            <div className="w-10" /> {/* Spacer */}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Earnings */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                  <p className="text-2xl font-bold text-green-600">${stats.totalEarnings.toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Completed */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tasks Completed</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.tasksCompleted}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Matches */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Matches</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pendingMatches}</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Rating */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.averageRating}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Active Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeTasks.length > 0 ? (
                activeTasks.map((task) => (
                  <div key={task.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <h4 className="font-medium">{task.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-3 w-3" />
                            <span>${task.payment}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{task.location}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(task.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-0">
                        pending
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active tasks yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recently Completed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Recently Completed</CardTitle>
            </CardHeader>
            <CardContent>
              {completedTasks.length > 0 ? (
                <div className="space-y-4">
                  {completedTasks.map((task) => (
                    <div key={task.id} className="p-4 border rounded-lg">
                      <div className="space-y-2">
                        <h4 className="font-medium">{task.tasks?.title}</h4>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-3 w-3" />
                            <span>Earned ${task.amount_earned}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(task.completed_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {task.rating_given && (
                          <div className="flex items-center space-x-1 text-sm">
                            <span className="text-yellow-600">★</span>
                            <span>{task.rating_given}/5 rating</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No completed tasks yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;