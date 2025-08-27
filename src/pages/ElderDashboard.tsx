import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Check, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import ActiveTasksList from "@/components/ActiveTasksList";

const ElderDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<'post' | 'active'>('post');
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    payment: "",
    timeEstimate: "",
    urgency: "",
    location: "",
    name: "",
    age: ""
  });

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
    "Today",
    "This weekend", 
    "This week",
    "Next week",
    "Flexible"
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.title || !formData.description || !formData.category || !formData.payment) {
      toast({
        title: "Please fill in all required fields",
        description: "Title, description, category, and payment are required.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Task posted successfully! 🎉",
      description: "Your task has been added to the marketplace. Students will start seeing it soon.",
    });

    // Reset form
    setFormData({
      title: "",
      description: "",
      category: "",
      payment: "",
      timeEstimate: "",
      urgency: "",
      location: "",
      name: "",
      age: ""
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-secondary">
      {/* Header */}
      <header className="bg-white/50 backdrop-blur border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-white/20"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl font-semibold">
              {activeView === 'post' ? 'Post a Task' : 'Active Tasks'}
            </h1>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setActiveView(activeView === 'post' ? 'active' : 'post')}
              className="hover:bg-white/20"
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {activeView === 'post' ? (
          <Card className="bg-white shadow-card-custom border-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-2xl">
                <Plus className="h-6 w-6 text-primary" />
                <span>What do you need help with?</span>
              </CardTitle>
              <p className="text-muted-foreground text-lg">
                Fill out the details below and we'll connect you with a helpful student.
              </p>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Info */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-lg">Your Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="text-lg h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age" className="text-lg">Your Age</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="Enter your age"
                      value={formData.age}
                      onChange={(e) => handleInputChange('age', e.target.value)}
                      className="text-lg h-12"
                    />
                  </div>
                </div>

                {/* Task Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-lg">Task Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Help with grocery shopping"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="text-lg h-12"
                    required
                  />
                </div>

                {/* Task Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-lg">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Please describe what help you need in detail..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="text-lg min-h-[120px] resize-none"
                    required
                  />
                </div>

                {/* Category and Location */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-lg">Category *</Label>
                    <Select onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger className="text-lg h-12">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category} value={category} className="text-lg">
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-lg">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Downtown Campus Area"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="text-lg h-12"
                    />
                  </div>
                </div>

                {/* Payment and Time */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="payment" className="text-lg">Payment Amount ($) *</Label>
                    <Input
                      id="payment"
                      type="number"
                      placeholder="e.g., 25"
                      value={formData.payment}
                      onChange={(e) => handleInputChange('payment', e.target.value)}
                      className="text-lg h-12"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-lg">Estimated Time</Label>
                    <Select onValueChange={(value) => handleInputChange('timeEstimate', value)}>
                      <SelectTrigger className="text-lg h-12">
                        <SelectValue placeholder="Select time needed" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeOptions.map(time => (
                          <SelectItem key={time} value={time} className="text-lg">
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Urgency */}
                <div className="space-y-2">
                  <Label className="text-lg">When do you need this done?</Label>
                  <Select onValueChange={(value) => handleInputChange('urgency', value)}>
                    <SelectTrigger className="text-lg h-12">
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      {urgencyOptions.map(option => (
                        <SelectItem key={option} value={option} className="text-lg">
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  size="lg"
                  className="w-full bg-gradient-primary hover:opacity-90 text-lg h-14"
                >
                  <Check className="h-5 w-5 mr-2" />
                  Post Task
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <ActiveTasksList userType="elder" />
        )}
      </main>
    </div>
  );
};

export default ElderDashboard;