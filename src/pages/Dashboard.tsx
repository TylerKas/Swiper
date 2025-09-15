import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EarningsDashboard } from "@/components/EarningsDashboard";
import { Home, User, Heart } from "lucide-react";
import { loadProfile, ProfileData } from "@/firebase";
import ActiveTasksList from "@/components/ActiveTasksList";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<'worker' | 'client'>('worker');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadProfileData = async () => {
      try {
        const savedProfile = await loadProfile(user.uid);
        setProfileData(savedProfile);
      } catch (error) {
        // Handle error silently
      }
    };

    loadProfileData();
  }, [user, navigate]);

  const handleGoHome = () => {
    navigate('/');
  };

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Heart className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-gray-900">Giggle Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleGoHome}
                variant="ghost"
                className="text-gray-600 hover:text-gray-900"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
              <Button 
                onClick={() => navigate('/profile')}
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full"
              >
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="bg-gradient-primary text-white rounded-lg p-6">
            <h2 className="text-3xl font-bold mb-2">
              Welcome back, {profileData?.full_name?.split(' ')[0] || 'User'}!
            </h2>
            <p className="text-white/90 text-lg">
              Here's your activity overview and earnings summary.
            </p>
          </div>

          {/* Earnings Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle>Earnings Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <EarningsDashboard />
            </CardContent>
          </Card>

          {/* Tasks Section with Tabs */}
          <Card>
            <CardHeader>
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                <Button
                  onClick={() => setActiveTab('worker')}
                  variant={activeTab === 'worker' ? 'default' : 'ghost'}
                  className={`flex-1 ${activeTab === 'worker' ? 'bg-white shadow-sm' : ''}`}
                >
                  As Worker
                </Button>
                <Button
                  onClick={() => setActiveTab('client')}
                  variant={activeTab === 'client' ? 'default' : 'ghost'}
                  className={`flex-1 ${activeTab === 'client' ? 'bg-white shadow-sm' : ''}`}
                >
                  As Client
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === 'worker' ? (
                <div className="space-y-6">
                  {/* Active Tasks - As Worker */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Active Tasks</h3>
                    <ActiveTasksList userType="worker" statusFilter="active" />
                  </div>

                  {/* Pending Tasks - As Worker */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Pending Tasks</h3>
                    <ActiveTasksList userType="worker" statusFilter="pending" />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Active Tasks - As Client */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Active Tasks</h3>
                    <ActiveTasksList userType="client" statusFilter="active" />
                  </div>

                  {/* Pending Tasks - As Client */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Pending Tasks</h3>
                    <ActiveTasksList userType="client" statusFilter="pending" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
