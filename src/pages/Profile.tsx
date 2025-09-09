import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, MapPin, Mail, Phone, Upload, Heart, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import React, { useEffect, useRef, useState } from 'react';
import { loadProfile, watchProfile, saveProfile, ProfileData, storage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut, user } = useAuth();
  const uid = user?.uid;
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: '',
    email: user?.email || '',
    phone: '',
    bio: '',
    age: '',
    address: '',
    miles_radius: 10,
    avatar_url: '',
  });
  const [addressDraft, setAddressDraft] = useState(profileData.address || "");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Function to save profile data immediately

  // Check if profile is complete
  const isProfileComplete = () => {
    const requiredFields = [
      profileData.full_name,
      profileData.phone,
      profileData.age,
      profileData.address
    ];
    
    return requiredFields.every(field => field && field.trim() !== '');
  };

  // Helper function to delete photo from Firebase Storage
  const deletePhotoFromStorage = async (photoUrl: string) => {
    if (!photoUrl) return;
    
    try {
      let imageRef;
      
      if (photoUrl.startsWith('http')) {
        // Extract the file path from the download URL
        // Firebase Storage URLs have the format: https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile?alt=media&token=...
        const url = new URL(photoUrl);
        const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
        if (pathMatch) {
          const filePath = decodeURIComponent(pathMatch[1]);
          imageRef = ref(storage, filePath);
        }
      } else {
        // Direct path reference
        imageRef = ref(storage, photoUrl);
      }
      
      if (imageRef) {
        await deleteObject(imageRef);
        console.log('Photo deleted from Firebase Storage');
        return true;
      }
    } catch (error) {
      console.log('Error deleting photo from storage:', error.message);
      return false;
    }
    
    return false;
  };

  // Function to save profile data immediately with retry logic
  const saveProfileImmediately = async (retryCount = 0) => {
    if (!uid) {
      console.log('No user UID, cannot save profile');
      return;
    }

    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
    
    try {
      await saveProfile(profileData, uid);
      console.log('Profile saved successfully');
    } catch (error) {
      console.error('Error saving profile immediately:', error);
      
      // Retry logic for cross-device issues
      if (retryCount < 3) {
        console.log(`Retrying save profile (attempt ${retryCount + 1})`);
        setTimeout(() => {
          saveProfileImmediately(retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
      } else {
        toast({
          title: "Save Failed",
          description: "Unable to save profile. Please check your connection and try again.",
          variant: "destructive",
        });
      }
    }
  };


  // 1) Keep email in sync with Firebase auth
  useEffect(() => {
    if (user?.email) {
      setProfileData(prev => ({ ...prev, email: user.email! }));
    }
  }, [user?.email]);

  // 2) Load once + watch live profile when the user id is ready
  useEffect(() => {
    if (!uid) return;


    // initial one-shot load
    (async () => {
      try {
        const p = await loadProfile(uid);
        if (p) {
          setProfileData(prev => ({ ...prev, ...p }));
          if (typeof p.address === 'string') setAddressDraft(p.address);
        }
        setIsInitialLoad(false);
      } catch (e) {
        console.error("loadProfile error:", e);
        setIsInitialLoad(false);
      }
    })();

    // No real-time updates to prevent interference with user edits
    // cleanup: clear pending autosave
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [uid, isInitialLoad, isRemovingPhoto, isUploading]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => {
      const next = { ...prev, [field]: value };

      // Debounced autosave (600ms after user stops typing)
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        if (uid) {
          saveProfile(next, uid).catch((err) => {
            console.error('autosave failed', err);
            // Show user-friendly error message
            toast({
              title: "Auto-save Failed",
              description: "Your changes may not be saved. Please try again.",
              variant: "destructive",
            });
          });
        }
      }, 600);

      return next;
    });
  };

  const handleRadiusChange = (value: number[]) => {
    const miles = value[0];
    setProfileData(prev => {
      const next = { ...prev, miles_radius: miles };

      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        if (uid) {
          saveProfile(next, uid).catch((err) => {
            console.error('autosave failed', err);
            toast({
              title: "Auto-save Failed",
              description: "Your changes may not be saved. Please try again.",
              variant: "destructive",
            });
          });
        }
      }, 600);

      return next;
    });
  };

  const handleSignOut = async () => {
    try {
      // Save profile data before signing out
      await saveProfileImmediately();
      
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

  const handleBackToHome = async () => {
    try {
      // Save profile data before navigating away
      await saveProfileImmediately();
      navigate('/');
    } catch (error) {
      console.error('Error saving profile:', error);
      // Still navigate even if save fails
      navigate('/');
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uid) return;

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

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Create preview URL immediately
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    setIsUploading(true);

    try {
      // Delete old image if it exists
      if (profileData.avatar_url) {
        await deletePhotoFromStorage(profileData.avatar_url);
      }

      // Upload new image
      const imageRef = ref(storage, `profile-photos/${uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Update profile with new image URL
      const updatedProfile = { ...profileData, avatar_url: downloadURL };
      setProfileData(updatedProfile);
      
      // Clear preview URL and set actual URL
      setPreviewUrl(null);
      
      // Save to Firestore
      await saveProfile(updatedProfile, uid);

      toast({
        title: "Success",
        description: "Profile photo uploaded successfully!",
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      // Clear preview on error
      setPreviewUrl(null);
      toast({
        title: "Upload Failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!uid || !profileData.avatar_url) return;

    setIsRemovingPhoto(true);
    // Clear any preview URL
    setPreviewUrl(null);

    try {
      // Delete from Firebase Storage
      await deletePhotoFromStorage(profileData.avatar_url);

      // Update profile immediately in local state
      const updatedProfile = { ...profileData, avatar_url: '' };
      setProfileData(updatedProfile);
      
      // Save to Firestore
      await saveProfile(updatedProfile, uid);

      toast({
        title: "Success",
        description: "Profile photo removed successfully!",
      });
    } catch (error) {
      console.error('Error removing photo:', error);
      toast({
        title: "Error",
        description: "Failed to remove photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Re-enable real-time listener after a short delay
      setTimeout(() => {
        setIsRemovingPhoto(false);
      }, 1000);
    }
  };

  // Helper function to get first and last name from full_name
  const getFirstName = () => {
    return profileData.full_name?.split(' ')[0] || '';
  };

  const getLastName = () => {
    return profileData.full_name?.split(' ').slice(1).join(' ') || '';
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
              onClick={handleBackToHome}
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
                  value={getFirstName()}
                  onChange={(e) => {
                    const firstName = e.target.value.slice(0, 10); // 10 character limit
                    const lastName = getLastName();
                    const fullName = lastName ? `${firstName} ${lastName}` : firstName;
                    handleInputChange('full_name', fullName);
                  }}
                  placeholder="John"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={getLastName()}
                  onChange={(e) => {
                    const firstName = getFirstName();
                    const lastName = e.target.value.slice(0, 15); // 15 character limit
                    const fullName = firstName ? `${firstName} ${lastName}` : lastName;
                    handleInputChange('full_name', fullName);
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
                {(profileData.avatar_url || previewUrl) ? (
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <img
                        src={previewUrl || profileData.avatar_url}
                        alt="Profile"
                        className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                        onError={(e) => {
                          // If image fails to load, show a placeholder
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-400" />
                      </div>
                      {profileData.avatar_url && (
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full shadow-sm hover:scale-110 transition-transform"
                          onClick={handleRemovePhoto}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="flex items-center justify-center w-full h-12 border-2 border-dashed border-orange-300 rounded-md cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          disabled={isUploading}
                        />
                        <Upload className="h-4 w-4 mr-2 text-orange-500" />
                        <span className="text-orange-600 font-medium">
                          {isUploading ? 'Uploading...' : 'Change Photo'}
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1">Max 2MB • JPG, PNG, GIF</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <label className="flex items-center justify-center w-full h-12 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          disabled={isUploading}
                        />
                        <Upload className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-gray-600">
                          {isUploading ? 'Uploading...' : 'Upload Photo'}
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1">Max 2MB • JPG, PNG, GIF</p>
                    </div>
                  </div>
                )}
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
              
                  // Check if Google Maps is loaded
                  console.log('Google Maps check:', {
                    google: typeof google !== 'undefined',
                    maps: typeof google !== 'undefined' && !!google.maps,
                    places: typeof google !== 'undefined' && !!google.maps?.places
                  });
                  
                  if (typeof google !== 'undefined' && google.maps && google.maps.places) {
                    console.log('Creating Google Maps Autocomplete...');
                    const ac = new google.maps.places.Autocomplete(el, {
                      types: ["geocode"], // addresses only
                      // componentRestrictions: { country: "us" },
                    });
                    console.log('Autocomplete created successfully');
                    
                    // Test if autocomplete is working
                    console.log('Autocomplete bounds:', ac.getBounds());
                
                    ac.addListener("place_changed", () => {
                      console.log('PLACE_CHANGED EVENT FIRED!');
                      const place = ac.getPlace();
                      console.log('Google Maps place selected:', place);
                      const formatted = place?.formatted_address || "";
                      console.log('Formatted address:', formatted);
                      //creates latitude and longitude
                      const loc = place?.geometry?.location;
                      console.log('Location object:', loc);
                      // set both the draft (what shows in the box) and the persisted profile value
                      setAddressDraft(formatted);
                      handleInputChange("address", formatted);
                      if (loc && uid) {
                        const lat = loc.lat();
                        const lng = loc.lng();
                        console.log('Coordinates to save:', { lat, lng });
                      
                        saveProfile(
                          { address: formatted, location: { lat, lng } }, uid).catch(console.error);
                      } else {
                        console.log('No location or UID available');
                      }
                    });
                  } else {
                    console.log('Google Maps not available - autocomplete will not work');
                    console.log('Available:', {
                      google: typeof google,
                      maps: typeof google !== 'undefined' ? typeof google.maps : 'N/A',
                      places: typeof google !== 'undefined' ? typeof google.maps?.places : 'N/A'
                    });
                  }
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

          <div className="flex justify-center space-x-4">
            <Button 
              onClick={() => {
                const currentAddress = addressDraft.trim();
                if (!currentAddress) {
                  toast({ title: "No address", description: "Please enter an address first", variant: "destructive" });
                  return;
                }
                
                if (!uid) {
                  toast({ title: "Error", description: "Not logged in", variant: "destructive" });
                  return;
                }
                
                // Get REAL coordinates from Google Maps
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ address: currentAddress }, async (results, status) => {
                  if (status === 'OK' && results && results[0]) {
                    const location = results[0].geometry.location;
                    const lat = location.lat();
                    const lng = location.lng();
                    
                    // Save REAL coordinates to Firebase
                    try {
                      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
                      const { db } = await import('@/firebase');
                      
                      const profileRef = doc(db, 'profiles', uid);
                      await setDoc(profileRef, {
                        address: currentAddress,
                        location: { lat, lng },
                        updated_at: serverTimestamp()
                      }, { merge: true });
                      
                      // Update local state to match what was saved
                      setProfileData(prev => ({ ...prev, address: currentAddress, location: { lat, lng } }));
                      setAddressDraft(currentAddress);
                      
                      toast({ title: "Address Updated", description: `Real coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
                    } catch (error) {
                      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
                    }
                  } else {
                    toast({ title: "Geocoding Failed", description: `Could not find coordinates for "${currentAddress}"`, variant: "destructive" });
                  }
                });
              }}
              className="w-full max-w-xs bg-blue-500 hover:bg-blue-600 text-white"
            >
              Update Address
            </Button>
            <Button 
              onClick={handleBackToHome}
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