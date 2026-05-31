"use client";
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { useMutation } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

const Review = () => {
  const { sessionId } = useParams();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const submitReview = useMutation({
    mutationFn: async () => {
      await api.post('/api/reviews', {
        sessionId,
        rating,
        comment
      });
    },
    onSuccess: () => {
      router.push('/dashboard');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to submit review');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setErrorMsg('Please select a rating');
      return;
    }
    if (comment.length < 20) {
      setErrorMsg('Comment must be at least 20 characters');
      return;
    }
    submitReview.mutate();
  };

  return (
    <div className="container mx-auto max-w-md py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">How was your session?</h1>
        <p className="text-muted-foreground">Your feedback helps tutors improve and other students make better choices.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="focus:outline-none"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
            >
              <Star
                className={`w-12 h-12 transition-colors ${
                  star <= (hoverRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted fill-muted'
                }`}
              />
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Leave a review</label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did you like? What could be improved?"
            className="min-h-[120px]"
            maxLength={500}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Minimum 20 characters</span>
            <span>{comment.length} / 500</span>
          </div>
        </div>

        {errorMsg && <p className="text-destructive text-sm text-center">{errorMsg}</p>}

        <div className="space-y-3">
          <Button type="submit" className="w-full h-12" disabled={submitReview.isPending}>
            {submitReview.isPending ? 'Submitting...' : 'Submit Review'}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => router.push('/dashboard')}>
            Review later
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Review;
