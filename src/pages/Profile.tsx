import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, MapPin, Mail, Phone, Upload, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import React, { useEffect, useRef, useState } from 'react';

interface ProfileData {
  full_name?: string;
  email?: string;
  phone?: string;
  bio?: string;
  age?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  miles_radius?: number;
  avatar_url?: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut, user } = useAuth();
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    email: user?.email || '',
    phone: '',
    bio: '',
    age: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    miles_radius: 10,
    avatar_url: '',
  });
  const [addressDraft, setAddressDraft] = useState(profileData.address || "");

  // Update email when user data is available
  useEffect(() => {
    if (user?.email) {
      setProfileData(prev => ({ ...prev, email: user.email }));
    }
  }, [user?.email]);

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleRadiusChange = (value: number[]) => {
    setProfileData(prev => ({ ...prev, miles_radius: value[0] }));
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (2MB limit)
      const maxSize = 2 * 1024 * 1024; // 2MB in bytes
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 2MB",
          variant: "destructive",
        });
        return;
      }
      
      // For now, just show a toast. File upload can be implemented later with storage
      toast({
        title: "Photo Upload",
        description: "Photo upload feature coming soon!",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="text-center flex-1">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Join HelpMate</h1>
              <p className="text-gray-600">Create your profile to get started</p>
            </div>
            <Button 
              variant="outline"
              onClick={handleSignOut}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="p-8">
          {/* Personal Information Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Personal Information
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={profileData.full_name?.split(' ')[0] || ''}
                  onChange={(e) => {
                    const lastName = profileData.full_name?.split(' ').slice(1).join(' ') || '';
                    const firstName = e.target.value.slice(0, 10); // 10 character limit
                    handleInputChange('full_name', `${firstName} ${lastName}`.trim());
                  }}
                  placeholder="John"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profileData.full_name?.split(' ').slice(1).join(' ') || ''}
                  onChange={(e) => {
                    const firstName = profileData.full_name?.split(' ')[0] || '';
                    const lastName = e.target.value.slice(0, 15); // 15 character limit
                    handleInputChange('full_name', `${firstName} ${lastName}`.trim());
                  }}
                  placeholder="Doe"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="mb-6">
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  value={profileData.email || ''}
                  disabled
                  className="pl-10 bg-gray-50"
                />
              </div>
            </div>

            <div className="mb-6">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={profileData.age || ''}
                onChange={(e) => {
                  const age = e.target.value.slice(0, 3); // 3 character limit
                  handleInputChange('age', age);
                }}
                placeholder="25"
                className="mt-1"
              />
            </div>

            <div className="mb-6">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="phone"
                  value={profileData.phone || ''}
                  onChange={(e) => {
                    const phone = e.target.value.slice(0, 15); // 15 character limit
                    handleInputChange('phone', phone);
                  }}
                  placeholder="(555) 123-4567"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="mb-6">
              <Label htmlFor="bio">Bio (Optional)</Label>
              <Textarea
                id="bio"
                value={profileData.bio || ''}
                onChange={(e) => {
                  const bio = e.target.value.slice(0, 500); // 500 character limit
                  handleInputChange('bio', bio);
                }}
                placeholder="Tell us about yourself..."
                className="mt-1 min-h-[80px]"
              />
            </div>

            <div className="mb-6">
              <Label htmlFor="photo">Profile Photo (Optional)</Label>
              <div className="mt-1">
                <label className="flex items-center justify-center w-full h-12 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-orange-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Upload className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-600">Upload Photo (Max 2MB)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Location
            </h3>

            <div className="mb-6">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                ref={(el) => {
                  if (!el) return;
                  (addressInputRef as any).current = el;
              
                  if ((addressInputRef as any)._acAttached) return;
                  (addressInputRef as any)._acAttached = true;
              
                  const ac = new google.maps.places.Autocomplete(el, {
                    types: ["geocode"], // addresses only
                    // componentRestrictions: { country: "us" },
                  });
              
                  ac.addListener("place_changed", () => {
                    const place = ac.getPlace();
                    const formatted = place?.formatted_address || "";
                    // set both the draft (what shows in the box) and the persisted profile value
                    setAddressDraft(formatted);
                    handleInputChange("address", formatted);
                  });
                }}
                value={addressDraft}
                onChange={(e) => setAddressDraft(e.target.value)}  // typing shows live
                placeholder="Start typing address…"
                className="mt-1"
                onBlur={() => {
                  // if they typed but didn't select a valid suggestion, clear the box
                  if (addressDraft !== (profileData.address || "")) {
                    setAddressDraft("");
                  }
                }}
              />              
            </div>

            <div className="mb-8">
              <Label>Miles Away Radius: {profileData.miles_radius} miles</Label>
              <Slider
                value={[profileData.miles_radius || 10]}
                onValueChange={handleRadiusChange}
                max={50}
                min={1}
                step={1}
                className="mt-3"
              />
            </div>
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full max-w-xs"
            >
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Profile;