import { useState } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const SUBJECTS = ['Math', 'Physics', 'English', 'History', 'CS', 'French', 'Spanish', 'Biology', 'Chemistry', 'Economics'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const Onboarding = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const isNewUser = searchParams.get('isNewUser') === 'true';

  const [step, setStep] = useState(isNewUser ? 0 : 1);
  const [bio, setBio] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState<string>('0');
  
  if (!user || (!isNewUser && user.role !== 'TUTOR')) {
    return <Navigate to="/dashboard" replace />;
  }

  const toggleSubject = (subject: string) => {
    setSubjects(prev => 
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };

  const roleMutation = useMutation({
    mutationFn: (role: 'STUDENT' | 'TUTOR') => api.patch('/api/auth/me/role', { role }),
    onSuccess: (res, role) => {
      setUser(res.data.user, useAuthStore.getState().token!);
      searchParams.delete('isNewUser');
      setSearchParams(searchParams);
      if (role === 'STUDENT') {
        navigate('/dashboard');
      } else {
        setStep(1);
      }
    }
  });

  const profileMutation = useMutation({
    mutationFn: () => api.patch('/api/tutors/me/profile', {
      bio,
      subjects,
      hourlyRate: Number(hourlyRate),
    }),
    onSuccess: () => {
      navigate('/dashboard');
    },
    onError: (error) => {
      console.error(error);
    }
  });

  const nextStep = () => setStep(s => Math.min(3, s + 1));
  const prevStep = () => setStep(s => Math.max(1, s - 1));
  const submit = () => profileMutation.mutate();

  const progress = (step / 3) * 100;

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-card border rounded-lg shadow-sm">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">
          {step === 0 ? 'Welcome to TutorFlow' : 'Tutor Profile Setup'}
        </h2>
        {step > 0 && <Progress value={progress} className="h-2" />}
      </div>

      {step === 0 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 text-center">
          <p className="text-muted-foreground mb-6">How would you like to use TutorFlow?</p>
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-32 text-lg" 
              onClick={() => roleMutation.mutate('STUDENT')}
              disabled={roleMutation.isPending}
            >
              I'm a Student
            </Button>
            <Button 
              variant="default" 
              className="h-32 text-lg" 
              onClick={() => roleMutation.mutate('TUTOR')}
              disabled={roleMutation.isPending}
            >
              I'm a Tutor
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="space-y-2">
            <Label htmlFor="bio">Tell us about yourself</Label>
            <Textarea 
              id="bio" 
              placeholder="I am an experienced tutor..." 
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              rows={6}
            />
            <div className="text-xs text-right text-muted-foreground">
              {bio.length} / 500
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={nextStep} disabled={bio.trim().length === 0}>Next</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <Label>Select your subjects</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {SUBJECTS.map((subject) => (
              <div key={subject} className="flex items-center space-x-2 border p-3 rounded-md">
                <Checkbox 
                  id={subject} 
                  checked={subjects.includes(subject)}
                  onCheckedChange={() => toggleSubject(subject)}
                />
                <Label htmlFor={subject} className="flex-1 cursor-pointer">{subject}</Label>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={prevStep}>Back</Button>
            <Button onClick={nextStep} disabled={subjects.length === 0}>Next</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
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
            <Label>Availability (UI Only)</Label>
            <div className="space-y-2">
              {DAYS.map(day => (
                <div key={day} className="flex items-center space-x-4">
                  <span className="w-10 font-medium text-sm">{day}</span>
                  <div className="flex space-x-2">
                    <div className="flex items-center space-x-1"><Checkbox id={`${day}-m`} /><Label htmlFor={`${day}-m`} className="text-xs">Morn</Label></div>
                    <div className="flex items-center space-x-1"><Checkbox id={`${day}-a`} /><Label htmlFor={`${day}-a`} className="text-xs">Aft</Label></div>
                    <div className="flex items-center space-x-1"><Checkbox id={`${day}-e`} /><Label htmlFor={`${day}-e`} className="text-xs">Eve</Label></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={prevStep}>Back</Button>
            <Button onClick={submit} disabled={profileMutation.isPending}>
              {profileMutation.isPending ? 'Saving...' : 'Complete Profile'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
