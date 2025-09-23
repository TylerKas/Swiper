import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EarningsDashboard } from "@/components/EarningsDashboard";
import { Home, User } from "lucide-react";
import { loadProfile, ProfileData } from "@/firebase";
import ActiveTasksList from "@/components/ActiveTasksList";
import LogoOrange from "@/assets/LogoOrange.png";

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

    const loadUserProfile = async () => {
      try {
        const profile = await loadProfile(user.uid);
        if (profile) {
          setProfileData(profile);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    loadUserProfile();
  }, [user, navigate]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoProfile = () => {
    navigate('/profile');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img 
                src={LogoOrange} 
                alt="Giggle" 
                className="h-10 w-auto"
              />
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
                onClick={handleGoProfile}
                variant="ghost"
                className="text-gray-600 hover:text-gray-900"
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Earnings Dashboard */}
        <div className="mb-8">
          <EarningsDashboard />
        </div>

        {/* Tasks Section */}
        <Card>
          <CardHeader>
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <Button
                onClick={() => setActiveTab('worker')}
                variant={activeTab === 'worker' ? 'default' : 'ghost'}
                className={`flex-1 ${activeTab === 'worker' ? 'bg-white shadow-sm' : ''}`}
              >
                As Tasker
              </Button>
              <Button
                onClick={() => setActiveTab('client')}
                variant={activeTab === 'client' ? 'default' : 'ghost'}
                className={`flex-1 ${activeTab === 'client' ? 'bg-white shadow-sm' : ''}`}
              >
                As Lister
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeTab === 'worker' ? (
              <div className="space-y-6">
                {/* Active Tasks - As Worker */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Active Tasks</h3>
                  <ActiveTasksList key="worker-active" userType="worker" statusFilter="active" />
                </div>

                {/* Pending Tasks - As Worker */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Pending Tasks</h3>
                  <ActiveTasksList key="worker-pending" userType="worker" statusFilter="pending" />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Active Tasks - As Client */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Active Tasks</h3>
                  <ActiveTasksList key="client-active" userType="client" statusFilter="active" />
                </div>

                {/* Pending Tasks - As Client */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Pending Tasks</h3>
                  <ActiveTasksList key="client-pending" userType="client" statusFilter="pending" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
