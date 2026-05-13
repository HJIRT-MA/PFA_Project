import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type User = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  tutorProfile?: {
    id: string;
    isVerified: boolean;
  } | null;
};

export const AdminUsers = () => {
  const [roleFilter, setRoleFilter] = useState('ALL');

  const { data, isLoading, error } = useQuery<{ users: User[] }>({
    queryKey: ['adminUsers', roleFilter],
    queryFn: async () => {
      const res = await api.get(`/api/admin/users?role=${roleFilter}`);
      return res.data;
    }
  });

  if (isLoading) return <div className="p-8 text-center">Loading users...</div>;
  if (error) return <div className="p-8 text-center text-destructive">Failed to load users</div>;

  const users = data?.users || [];

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Users Directory</h1>
        
        <div className="flex items-center gap-4">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Users</SelectItem>
              <SelectItem value="STUDENT">Students</SelectItem>
              <SelectItem value="TUTOR">Tutors</SelectItem>
              <SelectItem value="ADMIN">Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'ADMIN' ? 'destructive' : user.role === 'TUTOR' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(user.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {user.role === 'TUTOR' && user.tutorProfile && (
                        <Badge variant={user.tutorProfile.isVerified ? 'outline' : 'secondary'}>
                          {user.tutorProfile.isVerified ? 'Verified' : 'Pending'}
                        </Badge>
                      )}
                      {user.role === 'STUDENT' && <span className="text-muted-foreground text-sm">Active</span>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
