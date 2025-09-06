import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Check, MessageSquare, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import ActiveTasksList from "@/components/ActiveTasksList";
import { useAuth } from "@/contexts/AuthContext";
import { loadProfile, ProfileData } from "@/firebase";
import { createJob } from "@/utils/jobs";

const PostJob = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const uid = user?.uid;
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [activeView, setActiveView] = useState<'post' | 'active'>('post');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    payment: "",
    timeEstimate: "",
    urgency: "",
    preferredDate: "",
    preferredTime: "",
    specialRequirements: {
      mustHaveCar: false,
      comfortableWithPets: false,
      hasOwnTools: false,
      experienceWithTech: false,
      ableToLiftHeavy: false,
      previousCleaning: false
    }
  });

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
            description: "Please complete your profile before posting a job",
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

  const categories = [
    "Shopping",
    "Technology", 
    "Cleaning",
    "Yard Work",
    "Moving",
    "Transportation",
    "Cooking",
    "Pet Care",
    "Reading/Writing",
    "Other"
  ];

  const urgencyOptions = [
    "Very urgent - need it done today",
    "Somewhat urgent - within a few days", 
    "Not urgent - within a week or two",
    "No rush - whenever works"
  ];

  const timeOptions = [
    "30 minutes",
    "1 hour",
    "1.5 hours", 
    "2 hours",
    "3 hours",
    "4 hours",
    "Half day",
    "Full day"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!uid) {
      toast({ title: "Not signed in", description: "Please log in first.", variant: "destructive" });
      return;
    }

    const payNumber = Number(formData.payment);
    if (
      !formData.title ||
      !formData.description ||
      !formData.category ||
      Number.isNaN(payNumber) ||
      payNumber <= 0
    ) {
      toast({
        title: "Please fill in all required fields",
        description: "Title, description, category, and payment (greater than $0) are required.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      await createJob({
        title: formData.title,
        category: formData.category,
        description: formData.description,
        pay: payNumber,
        estimatedTime: formData.timeEstimate,
        preferredTime: formData.preferredTime,
        preferredDate: formData.preferredDate,
        urgency: formData.urgency,
        requirements: {
          mustHaveCar: formData.specialRequirements.mustHaveCar,
          comfortableWithPets: formData.specialRequirements.comfortableWithPets,
          hasOwnTools: formData.specialRequirements.hasOwnTools,
          expComputers: formData.specialRequirements.experienceWithTech,
          canLiftHeavy: formData.specialRequirements.ableToLiftHeavy,
          expCleaning: formData.specialRequirements.previousCleaning,
        },
      });

      toast({
        title: "Job posted successfully! 🎉",
        description: "Your job has been added to the marketplace.",
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "",
        payment: "",
        timeEstimate: "",
        urgency: "",
        preferredDate: "",
        preferredTime: "",
        specialRequirements: {
          mustHaveCar: false,
          comfortableWithPets: false,
          hasOwnTools: false,
          experienceWithTech: false,
          ableToLiftHeavy: false,
          previousCleaning: false,
        },
      });
    } catch (error) {
      console.error(error);
      toast({ title: "Error posting job", description: "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    if (field.startsWith('specialRequirements.')) {
      const key = field.split('.')[1] as keyof typeof formData.specialRequirements;
      setFormData(prev => ({
        ...prev,
        specialRequirements: {
          ...prev.specialRequirements,
          [key]: Boolean(value),
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value as string }));
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
                <Plus className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Post a Job</h1>
              <p className="text-gray-600">Tell us what help you need and we'll connect you with a worker</p>
            </div>
            <div className="w-10"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {activeView === 'post' ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* What do you need help with */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">What do you need help with?</h2>
                  
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-lg font-medium text-gray-900">Job Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Help with grocery shopping"
                      value={formData.title}
                      //slice stops the characters from going over 300
                      onChange={(e) => handleInputChange('title', e.target.value.slice(0, 300))}
                      className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-lg font-medium text-gray-900">Category</Label>
                    <Select value={formData.category} onValueChange={(v) => handleInputChange('category', v)}>
                      <SelectTrigger className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500">
                        <SelectValue placeholder="What type of help do you need?" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category} value={category} className="text-base">
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-lg font-medium text-gray-900">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what you need help with in detail..."
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value.slice(0, 1500))}
                      className="min-h-[120px] text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500 resize-none"
                      required
                    />
                  </div>
                </div>

                {/* Payment & Timing */}
                <div className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-6 w-6 text-gray-600" />
                    <h2 className="text-2xl font-bold text-gray-900">Payment & Timing</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="payment" className="text-lg font-medium text-gray-900">How much will you pay?</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="payment"
                          type="text"
                          placeholder="25.00"
                          value={formData.payment}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Only allow numbers and one decimal point
                            const numericValue = value.replace(/[^0-9.]/g, '');
                            // Prevent multiple decimal points
                            const parts = numericValue.split('.');
                            const cleanValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue;
                            // Limit to 7 characters
                            const limitedValue = cleanValue.slice(0, 7);
                            handleInputChange('payment', limitedValue);
                          }}
                          className="h-12 pl-10 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-lg font-medium text-gray-900">How long will it take?</Label>
                      <Select value={formData.timeEstimate} onValueChange={(v) => handleInputChange('timeEstimate', v)}>
                        <SelectTrigger className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500">
                          <SelectValue placeholder="Estimated time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map(time => (
                            <SelectItem key={time} value={time} className="text-base">
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="preferredDate" className="text-lg font-medium text-gray-900">Preferred Date</Label>
                      <Input
                        id="preferredDate"
                        type="date"
                        value={formData.preferredDate}
                        onChange={(e) => handleInputChange('preferredDate', e.target.value)}
                        className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="preferredTime" className="text-lg font-medium text-gray-900">Preferred Time</Label>
                      <Input
                        id="preferredTime"
                        type="time"
                        value={formData.preferredTime}
                        onChange={(e) => handleInputChange('preferredTime', e.target.value)}
                        className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-lg font-medium text-gray-900">How urgent is this?</Label>
                    <Select value={formData.urgency} onValueChange={(v) => handleInputChange('urgency', v)}>
                      <SelectTrigger className="h-12 text-base border-gray-200 focus:border-orange-500 focus:ring-orange-500">
                        <SelectValue placeholder="Somewhat urgent - within a few days" />
                      </SelectTrigger>
                      <SelectContent>
                        {urgencyOptions.map(option => (
                          <SelectItem key={option} value={option} className="text-base">
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Special Requirements */}
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">Special Requirements (Optional)</h2>
                  <p className="text-gray-600">Select any special requirements for this job:</p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <input 
                          type="checkbox" 
                          id="mustHaveCar" 
                          //resets the checkbox on submission 
                          checked = {formData.specialRequirements.mustHaveCar}
                          className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                          onChange={(e) => handleInputChange('specialRequirements.mustHaveCar', e.target.checked)}
                        />
                        <Label htmlFor="mustHaveCar" className="text-base font-medium">Must have a car</Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input 
                          type="checkbox" 
                          id="comfortableWithPets" 
                          checked = {formData.specialRequirements.comfortableWithPets}
                          className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                          onChange={(e) => handleInputChange('specialRequirements.comfortableWithPets', e.target.checked)}
                        />
                        <Label htmlFor="comfortableWithPets" className="text-base font-medium">Comfortable with pets</Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input 
                          type="checkbox" 
                          id="hasOwnTools" 
                          checked = {formData.specialRequirements.hasOwnTools}
                          className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                          onChange={(e) => handleInputChange('specialRequirements.hasOwnTools', e.target.checked)}
                        />
                        <Label htmlFor="hasOwnTools" className="text-base font-medium">Has own tools/equipment</Label>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <input 
                          type="checkbox" 
                          id="experienceWithTech" 
                          checked = {formData.specialRequirements.experienceWithTech}
                          className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                          onChange={(e) => handleInputChange('specialRequirements.experienceWithTech', e.target.checked)}
                        />
                        <Label htmlFor="experienceWithTech" className="text-base font-medium">Experience with computers/tech</Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input 
                          type="checkbox" 
                          id="ableToLiftHeavy" 
                          checked = {formData.specialRequirements.ableToLiftHeavy}
                          className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                          onChange={(e) => handleInputChange('specialRequirements.ableToLiftHeavy', e.target.checked)}
                        />
                        <Label htmlFor="ableToLiftHeavy" className="text-base font-medium">Able to lift heavy items</Label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input 
                          type="checkbox" 
                          id="previousCleaning" 
                          checked = {formData.specialRequirements.previousCleaning}
                          className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                          onChange={(e) => handleInputChange('specialRequirements.previousCleaning', e.target.checked)}
                        />
                        <Label htmlFor="previousCleaning" className="text-base font-medium">Previous cleaning experience</Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <Button 
                    type="submit" 
                    size="lg"
                    disabled={submitting}
                    className="w-full h-14 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-xl"
                  >
                    {submitting ? "Posting…" : "Post Job"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <ActiveTasksList userType="client" />
        )}
      </main>
    </div>
  );
};

export default PostJob;
