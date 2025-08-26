import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, DollarSign, CheckCircle, MapPin, Star, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CompletedTask {
  id: string;
  amount_earned: number;
  completed_at: string;
  rating_given: number | null;
  tasks: {
    title: string;
    category: string;
    location: string;
  };
}

interface UserProfile {
  id: string;
  full_name: string;
  miles_radius: number;
  rating: number;
  user_type: string;
}

const Dashboard = () => {
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingRadius, setEditingRadius] = useState(false);
  const [newRadius, setNewRadius] = useState(10);
  const navigate = useNavigate();
  const { toast } = useToast();

  const totalEarnings = completedTasks.reduce((sum, task) => sum + task.amount_earned, 0);
  const totalTasks = completedTasks.length;
  const avgRating = completedTasks
    .filter(task => task.rating_given)
    .reduce((sum, task, _, arr) => sum + (task.rating_given || 0) / arr.length, 0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      fetchUserData(user.id);
    };

    checkAuth();
  }, [navigate]);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        toast({
          title: "Error fetching profile",
          description: profileError.message,
          variant: "destructive"
        });
        return;
      }

      setProfile(profileData);
      setNewRadius(profileData.miles_radius);

      // Fetch completed tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('completed_tasks')
        .select(`
          id,
          amount_earned,
          completed_at,
          rating_given,
          tasks (
            title,
            category,
            location
          )
        `)
        .eq('student_id', profileData.id)
        .order('completed_at', { ascending: false });

      if (tasksError) {
        toast({
          title: "Error fetching tasks",
          description: tasksError.message,
          variant: "destructive"
        });
        return;
      }

      setCompletedTasks(tasksData || []);
    } catch (error) {
      toast({
        title: "An error occurred",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRadius = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ miles_radius: newRadius })
        .eq('id', profile.id);

      if (error) {
        toast({
          title: "Error updating radius",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      setProfile({ ...profile, miles_radius: newRadius });
      setEditingRadius(false);
      toast({
        title: "Updated successfully",
        description: "Your search radius has been updated."
      });
    } catch (error) {
      toast({
        title: "An error occurred",
        description: "Failed to update radius",
        variant: "destructive"
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
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
              onClick={() => navigate('/student-dashboard')}
              className="hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">My Dashboard</h1>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSignOut}
              className="hover:bg-white/20"
            >
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Profile Card */}
        <Card className="bg-white shadow-card-custom border-0">
          <CardHeader className="bg-gradient-warm text-white">
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{profile?.full_name}</h3>
              <p className="text-muted-foreground">Student Helper</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">{profile?.rating.toFixed(1)} Rating</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {profile?.miles_radius} miles radius
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingRadius(true)}
                  className="h-6 px-2"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {editingRadius && (
              <div className="flex items-center space-x-2 pt-2">
                <Label htmlFor="radius" className="text-sm">Miles:</Label>
                <Input
                  id="radius"
                  type="number"
                  min="1"
                  max="50"
                  value={newRadius}
                  onChange={(e) => setNewRadius(parseInt(e.target.value))}
                  className="w-20 h-8"
                />
                <Button size="sm" onClick={updateRadius}>Save</Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setEditingRadius(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white shadow-card-custom border-0">
            <CardContent className="p-6 text-center">
              <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">${totalEarnings.toFixed(0)}</div>
              <p className="text-muted-foreground">Total Earned</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-card-custom border-0">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">{totalTasks}</div>
              <p className="text-muted-foreground">Tasks Completed</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-card-custom border-0">
            <CardContent className="p-6 text-center">
              <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-3xl font-bold text-gray-900">
                {avgRating > 0 ? avgRating.toFixed(1) : profile?.rating.toFixed(1)}
              </div>
              <p className="text-muted-foreground">Average Rating</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Tasks */}
        <Card className="bg-white shadow-card-custom border-0">
          <CardHeader>
            <CardTitle>Recent Completed Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {completedTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground">No completed tasks yet</p>
                <Button 
                  className="mt-4 bg-gradient-primary"
                  onClick={() => navigate('/student-dashboard')}
                >
                  Find Tasks
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {completedTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{task.tasks.title}</h4>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                        <Badge variant="secondary">{task.tasks.category}</Badge>
                        <span>{task.tasks.location}</span>
                        <span>{new Date(task.completed_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">+${task.amount_earned}</div>
                      {task.rating_given && (
                        <div className="flex items-center text-sm">
                          <Star className="h-3 w-3 text-yellow-500 mr-1" />
                          <span>{task.rating_given}/5</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;