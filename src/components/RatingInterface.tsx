import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, DollarSign, Clock, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RatingInterfaceProps {
  taskId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserType: 'student' | 'elder';
  taskTitle: string;
  taskPayment: number;
  taskLocation: string;
  taskTimeEstimate: string;
  onComplete: () => void;
  onSkip: () => void;
}

const RatingInterface = ({
  taskId,
  otherUserId,
  otherUserName,
  otherUserType,
  taskTitle,
  taskPayment,
  taskLocation,
  taskTimeEstimate,
  onComplete,
  onSkip
}: RatingInterfaceProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmitRating = async () => {
    if (!user || rating === 0) return;

    setSubmitting(true);
    try {
      // Get current user's profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Submit rating
      const { error } = await supabase
        .from('ratings')
        .insert({
          task_id: taskId,
          rater_id: profile.id,
          rated_id: otherUserId,
          rating,
          comment: comment.trim() || null
        });

      if (error) throw error;

      // Mark task as completed
      const { error: taskError } = await supabase
        .from('completed_tasks')
        .insert({
          task_id: taskId,
          student_id: otherUserType === 'student' ? otherUserId : profile.id,
          rating_given: rating,
          amount_earned: taskPayment
        });

      if (taskError) throw taskError;

      toast({
        title: "Rating submitted! ⭐",
        description: `Thank you for rating ${otherUserName}`,
      });

      onComplete();
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        title: "Failed to submit rating",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels = {
    1: "Poor",
    2: "Fair", 
    3: "Good",
    4: "Very Good",
    5: "Excellent"
  };

  return (
    <div className="min-h-screen bg-gradient-secondary flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-white shadow-card-custom border-0">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg font-medium">
                {otherUserName.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-xl">How was your experience?</CardTitle>
          <p className="text-muted-foreground">
            Please rate your experience with {otherUserName}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Task Summary */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <h3 className="font-medium mb-2">{taskTitle}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{taskLocation}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{taskTimeEstimate}</span>
                </div>
              </div>
              <div className="flex justify-center mt-3">
                <Badge variant="secondary" className="bg-gradient-primary text-white border-0">
                  <DollarSign className="h-3 w-3 mr-1" />
                  ${taskPayment}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Star Rating */}
          <div className="text-center">
            <div className="flex justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star 
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {(hoveredRating || rating) > 0 && (
              <p className="text-sm font-medium text-primary">
                {ratingLabels[hoveredRating || rating as keyof typeof ratingLabels]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Additional Comments (Optional)
            </label>
            <Textarea
              placeholder={`Share your experience working with ${otherUserName}...`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onSkip}
              className="flex-1"
              disabled={submitting}
            >
              Skip Rating
            </Button>
            <Button
              onClick={handleSubmitRating}
              disabled={rating === 0 || submitting}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              {submitting ? "Submitting..." : "Submit Rating"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RatingInterface;