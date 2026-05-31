"use client";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';

const AdminDashboard = () => {
  const router = useRouter();
  const [period, setPeriod] = useState('30d');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminStats', period],
    queryFn: async () => {
      const res = await api.get(`/api/admin/stats?period=${period}`);
      return res.data;
    }
  });

  const exportCSV = () => {
    if (!stats) return;
    const csv = Papa.unparse(stats.newUsersPerDay);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_export_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="p-8 text-center">Loading dashboard...</div>;
  if (!stats) return <div className="p-8 text-center text-destructive">Failed to load stats</div>;

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        
        <div className="flex gap-4 items-center">
          <Select value={period} onValueChange={(val) => val && setPeriod(val)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={exportCSV}>Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => router.push('/admin/users')}>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">Total Users</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.totalUsers.students + stats.totalUsers.tutors}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.totalUsers.students} students · {stats.totalUsers.tutors} tutors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">Total Revenue</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">€{stats.totalRevenueEuros.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">Sessions Completed</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.completedSessions} / {stats.totalSessions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">Avg Rating</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.avgPlatformRating.toFixed(1)} ★</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/20 cursor-pointer hover:bg-yellow-500/20 transition-colors" onClick={() => router.push('/admin/tutors')}>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">Pending Tutors</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingTutorValidations}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-colors" onClick={() => router.push('/admin/disputes')}>
          <CardHeader className="p-4 pb-2"><CardTitle className="text-xs text-muted-foreground">Open Disputes</CardTitle></CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.openDisputes}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader><CardTitle>New Users</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.newUsersPerDay}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Platform Growth Trend</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.newUsersPerDay}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
