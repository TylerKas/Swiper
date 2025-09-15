import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, CheckCircle, Clock, DollarSign, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/firebase";
import MessageInterface from "./MessageInterface";
import RatingInterface from "./RatingInterface";

interface ActiveTask {
  id: string;
  task_id: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  task: {
    id: string;
    title: string;
    payment: number;
    location: string;
    time_estimate: string;
  };
  other_user: {
    id: string;
    full_name: string;
    user_type: 'worker' | 'client';
  };
}

interface ActiveTasksListProps {
  userType: 'worker' | 'client';
  statusFilter?: 'pending' | 'active' | 'all';
}

const ActiveTasksList = ({ userType, statusFilter = 'all' }: ActiveTasksListProps) => {
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ActiveTask | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load matches from Firestore
  useEffect(() => {
    if (!user?.uid) {
      console.log('ActiveTasksList: No user UID available');
      return;
    }

    console.log(`ActiveTasksList: Loading matches for userType: ${userType}, uid: ${user.uid}`);
    setLoading(true);
    
    // Query matches based on user type
    const fieldName = userType === 'worker' ? 'workerId' : 'clientId';
    const matchesQuery = query(
      collection(db, "matches"),
      where(fieldName, "==", user.uid),
      orderBy("createdAt", "desc")
    );

    console.log(`ActiveTasksList: Querying matches where ${fieldName} == ${user.uid}`);

    const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
      console.log(`ActiveTasksList: Received ${snapshot.docs.length} matches`);
      let matches: ActiveTask[] = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('ActiveTasksList: Match data:', { id: doc.id, ...data });
        return {
          id: doc.id,
          ...data
        };
      }) as ActiveTask[];
      
      // Filter by status if specified
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          matches = matches.filter(match => match.status === 'pending');
        } else if (statusFilter === 'active') {
          matches = matches.filter(match => ['accepted', 'in_progress'].includes(match.status));
        }
      }
      
      console.log(`ActiveTasksList: Filtered to ${matches.length} matches (statusFilter: ${statusFilter})`);
      setActiveTasks(matches);
      setLoading(false);
    }, (error) => {
      console.error('ActiveTasksList: Error loading matches:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, userType, statusFilter]);

  const handleTaskStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      // Update local state
      setActiveTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus as any } : task
      ));

      toast({
        title: "Task updated",
        description: `Task marked as ${newStatus.replace('_', ' ')}`
      });

      // If completing task, show rating interface
      if (newStatus === 'completed') {
        const task = activeTasks.find(t => t.id === taskId);
        if (task) {
          setSelectedTask(task);
          setShowRating(true);
        }
      }
    } catch (error) {
      toast({
        title: "Error updating task",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleMessageClick = (task: ActiveTask) => {
    setSelectedTask(task);
    setShowMessages(true);
  };

  const handleBackToList = () => {
    setShowMessages(false);
    setShowRating(false);
    setSelectedTask(null);
  };

  const handleRatingComplete = () => {
    setShowRating(false);
    setSelectedTask(null);
  };

  if (showMessages && selectedTask) {
    return (
      <MessageInterface
        taskId={selectedTask.task_id}
        otherUserId={selectedTask.other_user.id}
        otherUserName={selectedTask.other_user.full_name}
        taskTitle={selectedTask.task.title}
        taskPayment={selectedTask.task.payment}
        taskLocation={selectedTask.task.location}
        taskTimeEstimate={selectedTask.task.time_estimate}
        onBack={handleBackToList}
      />
    );
  }

  if (showRating && selectedTask) {
    return (
      <RatingInterface
        taskId={selectedTask.task_id}
        otherUserId={selectedTask.other_user.id}
        otherUserName={selectedTask.other_user.full_name}
        otherUserType={selectedTask.other_user.user_type}
        taskTitle={selectedTask.task.title}
        taskPayment={selectedTask.task.payment}
        taskLocation={selectedTask.task.location}
        taskTimeEstimate={selectedTask.task.time_estimate}
        onComplete={async () => {
          setShowRating(false);
          setSelectedTask(null);
        }}
        onSkip={async () => {
          setShowRating(false);
          setSelectedTask(null);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (activeTasks.length === 0) {
    return (
      <Card className="text-center py-8">
        <CardContent>
          <p className="text-muted-foreground">No active tasks yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            {userType === 'worker' 
              ? "Start swiping on tasks to find your first match!" 
              : "Post a job to get started!"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <CardHeader className="px-0">
        <CardTitle>Active Tasks</CardTitle>
      </CardHeader>
      
      {activeTasks.map((task) => (
        <Card key={task.id} className="bg-white shadow-sm border-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-medium">{task.task.title}</h3>
                <p className="text-sm text-muted-foreground">
                  with {task.other_user.full_name}
                </p>
              </div>
              <Badge 
                variant={task.status === 'in_progress' ? 'default' : 'secondary'}
                className={task.status === 'in_progress' ? 'bg-gradient-primary text-white border-0' : ''}
              >
                {task.status.replace('_', ' ')}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{task.task.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{task.task.time_estimate}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span>${task.task.payment}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMessageClick(task)}
                className="flex-1"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
              
              {task.status === 'accepted' && (
                <Button
                  size="sm"
                  onClick={() => handleTaskStatusUpdate(task.id, 'in_progress')}
                  className="flex-1 bg-gradient-primary hover:opacity-90"
                >
                  Start Task
                </Button>
              )}
              
              {task.status === 'in_progress' && (
                <Button
                  size="sm"
                  onClick={() => handleTaskStatusUpdate(task.id, 'completed')}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ActiveTasksList;