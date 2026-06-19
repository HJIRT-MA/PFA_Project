"use client";
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const NotificationSettings = () => {
  const queryClient = useQueryClient();
  const [prefs, setPrefs] = useState<any>({});

  const { data, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const res = await api.get('/api/users/me/notification-preferences');
      return res.data.preferences;
    }
  });

  useEffect(() => {
    if (data) setPrefs(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/api/users/me/notification-preferences', prefs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      alert('Preferences saved successfully');
    }
  });

  if (isLoading) return <div className="p-8 text-center">Loading settings...</div>;

  const handleChange = (field: string, checked: boolean) => {
    setPrefs((p: any) => ({ ...p, [field]: checked }));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6">Notification Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          
          <div className="grid grid-cols-3 gap-4 border-b pb-4">
            <div className="font-semibold text-muted-foreground">Notification Type</div>
            <div className="font-semibold text-center text-muted-foreground">Email</div>
            <div className="font-semibold text-center text-muted-foreground">In-App (Push)</div>
          </div>

          <div className="grid grid-cols-3 gap-4 items-center">
            <Label className="text-base">Booking Updates</Label>
            <div className="flex justify-center">
              <Checkbox checked={prefs.emailOnBooking} onCheckedChange={(c) => handleChange('emailOnBooking', c as boolean)} />
            </div>
            <div className="flex justify-center">
              <Checkbox checked={prefs.pushOnBooking} onCheckedChange={(c) => handleChange('pushOnBooking', c as boolean)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 items-center">
            <Label className="text-base">New Messages</Label>
            <div className="flex justify-center">
              <Checkbox checked={prefs.emailOnMessage} onCheckedChange={(c) => handleChange('emailOnMessage', c as boolean)} />
            </div>
            <div className="flex justify-center">
              <Checkbox checked={prefs.pushOnMessage} onCheckedChange={(c) => handleChange('pushOnMessage', c as boolean)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 items-center">
            <Label className="text-base">Session Reminders</Label>
            <div className="flex justify-center">
              <Checkbox checked={prefs.emailOnReminder} onCheckedChange={(c) => handleChange('emailOnReminder', c as boolean)} />
            </div>
            <div className="flex justify-center">
              <Checkbox checked={prefs.pushOnReminder} onCheckedChange={(c) => handleChange('pushOnReminder', c as boolean)} />
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;
