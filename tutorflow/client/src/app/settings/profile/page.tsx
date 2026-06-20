"use client";
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const SUBJECTS = ['Math', 'Physics', 'English', 'History', 'CS', 'French', 'Spanish', 'Biology', 'Chemistry', 'Economics'];

const ProfileSettings = () => {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [bio, setBio] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState<string>('0');
  const [subscriptionMonthlyPrice, setSubscriptionMonthlyPrice] = useState<string>('0');
  const [subscriptionYearlyPrice, setSubscriptionYearlyPrice] = useState<string>('0');

  useEffect(() => {
    if (user && user.role !== 'TUTOR') {
      router.replace('/settings/notifications');
    }
  }, [user, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['tutor-profile'],
    queryFn: async () => {
      const res = await api.get('/api/auth/me');
      return res.data.user.tutorProfile;
    },
    enabled: !!user && user.role === 'TUTOR'
  });

  useEffect(() => {
    if (data) {
      setBio(data.bio || '');
      setSubjects(data.subjects || []);
      setHourlyRate(data.hourlyRate?.toString() || '0');
      setSubscriptionMonthlyPrice(data.subscriptionMonthlyPrice?.toString() || '0');
      setSubscriptionYearlyPrice(data.subscriptionYearlyPrice?.toString() || '0');
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/api/tutors/me/profile', {
        bio,
        subjects,
        hourlyRate: Number(hourlyRate),
        subscriptionMonthlyPrice: Number(subscriptionMonthlyPrice),
        subscriptionYearlyPrice: Number(subscriptionYearlyPrice),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor-profile'] });
      toast.success('Profile saved successfully');
    }
  });

  const toggleSubject = (subject: string) => {
    setSubjects(prev => 
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };

  if (!user || user.role !== 'TUTOR') return null;
  if (isLoading) return <div className="p-8 text-center">Loading profile...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6">Profile Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Tutor Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea 
              id="bio" 
              placeholder="Tell students about yourself..." 
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              rows={5}
            />
            <div className="text-xs text-right text-muted-foreground">
              {bio.length} / 500
            </div>
          </div>

          <div className="space-y-2">
            <Label>Subjects</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SUBJECTS.map((subject) => (
                <div key={subject} className="flex items-center space-x-2 border p-2 rounded-md">
                  <Checkbox 
                    id={subject} 
                    checked={subjects.includes(subject)}
                    onCheckedChange={() => toggleSubject(subject)}
                  />
                  <Label htmlFor={subject} className="flex-1 cursor-pointer text-sm">{subject}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rate">Hourly Rate ($)</Label>
              <Input 
                id="rate" 
                type="number" 
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="monthlyPrice">1-Month Subscription ($)</Label>
              <Input 
                id="monthlyPrice" 
                type="number" 
                min="0"
                value={subscriptionMonthlyPrice}
                onChange={(e) => setSubscriptionMonthlyPrice(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Set to 0 to disable</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearlyPrice">1-Year Subscription ($)</Label>
              <Input 
                id="yearlyPrice" 
                type="number" 
                min="0"
                value={subscriptionYearlyPrice}
                onChange={(e) => setSubscriptionYearlyPrice(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Set to 0 to disable</p>
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSettings;
