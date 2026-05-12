import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  role: z.enum(['STUDENT', 'TUTOR']),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export const Register = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'STUDENT'
    }
  });

  const mutation = useMutation({
    mutationFn: (data: Omit<RegisterForm, 'confirmPassword'>) => api.post('/api/auth/register', data),
    onSuccess: (response, variables) => {
      setUser(response.data.user, response.data.token);
      if (variables.role === 'TUTOR') {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    },
    onError: (error: any) => {
      console.error(error.response?.data?.error || 'Registration failed');
    }
  });

  const onSubmit = (data: RegisterForm) => {
    mutation.mutate({
      email: data.email,
      password: data.password,
      role: data.role,
    });
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] my-8">
      <div className="w-full max-w-md p-8 space-y-6 bg-card border rounded-lg shadow-sm">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Create an Account</h2>
          <p className="mt-2 text-sm text-muted-foreground">Join TutorFlow today</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>I want to sign up as a</Label>
            <RadioGroup 
              defaultValue="STUDENT" 
              onValueChange={(val) => setValue('role', val as any)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="STUDENT" id="r1" />
                <Label htmlFor="r1">Student</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="TUTOR" id="r2" />
                <Label htmlFor="r2">Tutor</Label>
              </div>
            </RadioGroup>
            {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="john@example.com" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating account...' : 'Create Account'}
          </Button>

          {mutation.isError && (
            <p className="text-sm text-center text-destructive">
              {(mutation.error as any).response?.data?.error || 'Failed to register'}
            </p>
          )}
        </form>

        <p className="text-sm text-center text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
