import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// TODO: Replace with Firebase Firestore
// import { db } from '@/firebase/config';
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, Clock, Star, CalendarDays, Award } from "lucide-react";

interface CompletedTask {
  id: string;
  task_id: string;
  amount_earned: number;
  rating_given: number | null;
  completed_at: string;
  tasks: {
    title: string;
    category: string;
    time_estimate: string;
  };
}

interface EarningsStats {
  totalEarnings: number;
  totalTasks: number;
  averageRating: number;
  thisWeekEarnings: number;
}

export const EarningsDashboard = () => {
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [earnings, setEarnings] = useState<EarningsStats>({
    totalEarnings: 0,
    totalTasks: 0,
    averageRating: 0,
    thisWeekEarnings: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchEarningsData = async () => {
      if (!user) return;

      try {
        // TODO: Replace with Firebase Firestore queries
        // const completedTasksRef = collection(db, 'completed_tasks');
        // const q = query(completedTasksRef, 
        //   where('student_id', '==', user.uid),
        //   orderBy('completed_at', 'desc')
        // );
        // const querySnapshot = await getDocs(q);
        
        // For now, show empty state with zero earnings
        setCompletedTasks([]);
        setEarnings({
          totalEarnings: 0,
          totalTasks: 0,
          averageRating: 0,
          thisWeekEarnings: 0
        });

      } catch (error) {
        console.error('Unexpected error fetching earnings:', error);
        toast({
          title: "Error loading earnings",
          description: "Something went wrong. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEarningsData();
  }, [user, toast]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-primary text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Total Earnings</p>
                <p className="text-2xl font-bold">${earnings.totalEarnings.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-white/80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-secondary text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">This Week</p>
                <p className="text-2xl font-bold">${earnings.thisWeekEarnings.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-white/80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-warm text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">Tasks Completed</p>
                <p className="text-2xl font-bold">{earnings.totalTasks}</p>
              </div>
              <Award className="h-8 w-8 text-white/80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-subtle text-foreground border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Average Rating</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  {earnings.averageRating.toFixed(1)}
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </p>
              </div>
              <Star className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Recent Completed Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No completed tasks yet.</p>
              <p className="text-sm text-muted-foreground mt-2">Start completing tasks to see your earnings here!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedTasks.slice(0, 10).map(task => (
                <div key={task.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{task.tasks.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{task.tasks.category}</Badge>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {task.tasks.time_estimate}
                        </div>
                        <span>{new Date(task.completed_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        +${task.amount_earned.toFixed(2)}
                      </p>
                      {task.rating_given && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{task.rating_given}/5</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};