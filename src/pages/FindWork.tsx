import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, X, Heart, MapPin, Clock, DollarSign, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import ActiveTasksList from "@/components/ActiveTasksList";
import { EarningsDashboard } from "@/components/EarningsDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { loadProfile, ProfileData } from "@/firebase";
import { getOpenJobs } from "@/utils/jobs";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/firebase";

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

function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 3958.7613; // miles
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const FindWork = () => {
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'discover' | 'active'>('discover');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const uid = user?.uid;
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  // Check if profile is complete
  const isProfileComplete = () => {
    if (!profileData) return false;
    
    const mandatoryFields = [
      profileData.full_name,
      profileData.phone,
      profileData.age,
      profileData.address
    ];
    
    return mandatoryFields.every(field => field && field.trim() !== '');
  };

  // Check profile completion on component mount
  useEffect(() => {
    const checkProfile = async () => {
      if (!uid) {
        navigate('/login');
        return;
      }

      try {
        const savedProfile = await loadProfile(uid);
        setProfileData(savedProfile);
        
        // Check if profile is complete after loading
        const mandatoryFields = [
          savedProfile?.full_name,
          savedProfile?.phone,
          savedProfile?.age,
          savedProfile?.address
        ];
        
        const isComplete = mandatoryFields.every(field => field && field.trim() !== '');
        
        if (!isComplete) {
          toast({
            title: "Profile Incomplete",
            description: "Please complete your profile before finding work",
            variant: "destructive",
          });
          navigate('/profile');
          return;
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        navigate('/profile');
      }
    };

    checkProfile();
  }, [uid, navigate, toast]);

useEffect(() => {
  const load = async () => {
    try {
      // 1) get worker location from their profile
      let workerLoc: { lat: number; lng: number } | null = null;
      if (uid) {
        const prof = await getDoc(doc(db, "profiles", uid));
        const p = prof.exists() ? (prof.data() as any) : null;
        if (p?.location?.lat != null && p?.location?.lng != null) {
          workerLoc = { lat: p.location.lat, lng: p.location.lng };
        }
      }

      // 2) fetch jobs
      const rows = await getOpenJobs(25);

      // 3) map → Task and compute distance text when possible
      const mapped: Task[] = rows.map((j) => {
        let locationText = "Nearby";
        if (workerLoc && j.posterLocation?.lat != null && j.posterLocation?.lng != null) {
          const miles = distanceMiles(workerLoc, j.posterLocation);
          locationText = `${miles.toFixed(1)} miles away`;
        }
        return {
          id: j.id,
          title: j.title,
          description: j.description,
          clientName: "Client",
          clientAge: undefined,
          client_id: j.userId,
          location: locationText,           
          payment: j.pay,
          timeEstimate: j.estimatedTime,
          category: j.category,
          urgency: j.urgency || "Flexible",
        };
      });

      setTasks(mapped);
    } catch (err) {
      console.error("Error loading jobs:", err);
      toast({
        title: "Error loading jobs",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  load();
}, [uid, toast]);

  

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
