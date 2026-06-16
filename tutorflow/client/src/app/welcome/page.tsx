"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { GraduationCap, Users, Star, BookOpen, Clock, Shield, ArrowRight, Sparkles, TrendingUp, Globe } from 'lucide-react';

export default function Welcome() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch real platform stats
  const { data: stats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const res = await api.get('/api/tutors', { params: { limit: 1 } });
      return res.data;
    }
  });

  const platformStats = [
    { icon: Users, label: 'Active Tutors', value: stats?.total || 12, suffix: '+', color: 'from-blue-500 to-cyan-400' },
    { icon: GraduationCap, label: 'Students Helped', value: 1200, suffix: '+', color: 'from-purple-500 to-pink-400' },
    { icon: BookOpen, label: 'Sessions Completed', value: 4800, suffix: '+', color: 'from-amber-500 to-orange-400' },
    { icon: Star, label: 'Average Rating', value: 4.9, suffix: '/5', color: 'from-emerald-500 to-teal-400' },
  ];

  const features = [
    {
      icon: Shield,
      title: 'Verified Experts',
      description: 'Every tutor goes through a rigorous verification process to ensure top-quality instruction for every session.',
    },
    {
      icon: Clock,
      title: 'Flexible Scheduling',
      description: 'Book sessions that fit your lifestyle. Morning, afternoon, or evening — your tutor adapts to you.',
    },
    {
      icon: Sparkles,
      title: '1-on-1 Personalized',
      description: 'Tailored lessons designed around your learning goals. No generic content, just focused growth.',
    },
    {
      icon: TrendingUp,
      title: 'Track Your Progress',
      description: 'Comprehensive dashboards to monitor hours learned, subjects covered, and session history.',
    },
    {
      icon: Globe,
      title: 'Any Subject, Anywhere',
      description: 'From Math to Music, our tutors cover every discipline. Learn from anywhere with live video sessions.',
    },
    {
      icon: Users,
      title: 'Community Driven',
      description: 'Transparent reviews and ratings from real students. Choose your tutor with confidence.',
    },
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <section className="relative" style={{ background: 'linear-gradient(135deg, #0f1f3d 0%, #1a2f5a 40%, #3b1c3a 100%)' }}>
        {/* Decorative orbs */}
        <div className="absolute top-8 left-[10%] w-80 h-80 rounded-full bg-blue-500/15 blur-3xl animate-float pointer-events-none" />
        <div className="absolute -bottom-20 right-[5%] w-96 h-96 rounded-full bg-rose-500/10 blur-3xl animate-float-delayed pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />

        <div className="relative container mx-auto px-6 py-24 md:py-32 text-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-5 py-2 mb-8 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="text-sm font-semibold text-blue-200/90">
                Welcome{user ? `, ${user.email.split('@')[0]}` : ''}! 👋
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6 leading-[1.08] text-white">
              Your learning,{' '}
              <span className="bg-gradient-to-r from-blue-300 via-purple-300 to-rose-300 bg-clip-text text-transparent">
                supercharged
              </span>
            </h1>
            <p className="text-lg md:text-xl text-blue-200/60 max-w-2xl mx-auto leading-relaxed mb-10">
              TutorFlow connects students with world-class tutors for personalized 1-on-1 sessions. 
              We believe everyone deserves access to expert guidance — in any subject, at any time.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="h-14 px-10 rounded-2xl font-black text-lg shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all duration-300 bg-white text-[#0f1f3d] hover:bg-white/90"
                onClick={() => router.push('/')}
              >
                Browse Tutors
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14 px-10 rounded-2xl font-bold text-lg border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300 bg-transparent"
                onClick={() => router.push('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="relative -mb-1">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block">
            <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-6 -mt-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {platformStats.map((stat, i) => (
            <div
              key={stat.label}
              className="animate-fade-in-up bg-card border border-border/40 rounded-3xl p-6 md:p-8 text-center shadow-card hover:shadow-elevated transition-all duration-500 hover:-translate-y-1 group"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className="w-7 h-7 text-white" />
              </div>
              <div className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-1">
                {stat.value}{stat.suffix}
              </div>
              <div className="text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-widest">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Who We Are */}
      <section className="container mx-auto px-6 py-20 md:py-28">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-bold text-primary uppercase tracking-widest mb-3">Who we are</p>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-foreground mb-6">
            The smarter way to learn
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            TutorFlow was built by educators who understand that great learning happens through human connection. 
            Our platform removes barriers between students and expert tutors, making quality education accessible, 
            affordable, and personalized for everyone.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="animate-fade-in-up group bg-card border border-border/30 rounded-3xl p-8 shadow-card hover:shadow-elevated hover:border-primary/20 transition-all duration-500 hover:-translate-y-1"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-5 group-hover:from-primary/20 group-hover:to-secondary/20 transition-all duration-300">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-black text-foreground mb-3 tracking-tight">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission CTA */}
      <section className="container mx-auto px-6 pb-20 md:pb-28">
        <div
          className="relative rounded-[2.5rem] overflow-hidden p-10 md:p-16 text-center"
          style={{ background: 'linear-gradient(135deg, #0f1f3d 0%, #1a2f5a 40%, #3b1c3a 100%)' }}
        >
          <div className="absolute top-8 right-[10%] w-60 h-60 rounded-full bg-blue-500/15 blur-3xl animate-float pointer-events-none" />
          <div className="absolute bottom-8 left-[10%] w-60 h-60 rounded-full bg-rose-500/10 blur-3xl animate-float-delayed pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
              Ready to start your journey?
            </h2>
            <p className="text-blue-200/60 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              Whether you&apos;re a student looking for guidance or a tutor ready to share your expertise, 
              TutorFlow is the platform for you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="h-14 px-10 rounded-2xl font-black text-lg shadow-xl bg-white text-[#0f1f3d] hover:bg-white/90 hover:-translate-y-1 transition-all duration-300"
                onClick={() => router.push('/')}
              >
                Find a Tutor Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14 px-10 rounded-2xl font-bold text-lg border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300 bg-transparent"
                onClick={() => router.push('/dashboard')}
              >
                View Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
