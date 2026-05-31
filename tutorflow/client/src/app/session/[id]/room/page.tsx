"use client";
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import DailyIframe from '@daily-co/daily-js';
import type { DailyCall } from '@daily-co/daily-js';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { differenceInSeconds } from 'date-fns';

const VideoRoom = () => {
  const { id } = useParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // in seconds
  
  const callFrameRef = useRef<HTMLDivElement>(null);
  const dailyRef = useRef<DailyCall | null>(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const res = await api.get(`/api/sessions/${id}`);
      return res.data.session;
    }
  });

  useEffect(() => {
    if (!session) return;
    
    const checkTime = () => {
      const now = new Date();
      const start = new Date(session.datetime);
      const diffSecs = differenceInSeconds(start, now);
      
      if (diffSecs > 30 * 60) {
        setTimeLeft(diffSecs - 30 * 60); // Time until room opens (30 mins before)
      } else {
        setTimeLeft(0);
      }
    };
    
    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const joinSession = async () => {
    try {
      const res = await api.post(`/api/sessions/${id}/room`);
      setRoomUrl(res.data.roomUrl);
      setToken(res.data.token);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to initialize video room');
    }
  };

  const handleLeave = useCallback(() => {
    router.push(`/dashboard`);
    // Optional: navigate to /review/:sessionId if student
  }, [router]);

  useEffect(() => {
    if (!roomUrl || !callFrameRef.current) return;

    if (!dailyRef.current) {
      dailyRef.current = DailyIframe.createFrame(callFrameRef.current, {
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: '0',
          borderRadius: '12px',
        },
        showLeaveButton: true,
      });

      dailyRef.current.on('left-meeting', handleLeave);
    }

    const joinOptions: any = { url: roomUrl };
    if (token) joinOptions.token = token;

    dailyRef.current.join(joinOptions).catch(err => {
      console.error(err);
      setErrorMsg('Failed to join room');
    });

    return () => {
      if (dailyRef.current) {
        dailyRef.current.leave();
        dailyRef.current.destroy();
        dailyRef.current = null;
      }
    };
  }, [roomUrl, token, handleLeave]);

  if (isLoading) return <div className="p-8 text-center">Loading session...</div>;
  if (errorMsg) return <div className="p-8 text-center text-destructive">{errorMsg}</div>;

  if (!roomUrl) {
    return (
      <div className="container mx-auto max-w-lg py-20 text-center space-y-6">
        <h1 className="text-3xl font-bold">Video Session</h1>
        <p className="text-muted-foreground">
          Your session is scheduled for {new Date(session?.datetime).toLocaleString()}
        </p>
        
        {timeLeft !== null && timeLeft > 0 ? (
          <div className="p-6 bg-muted rounded-xl">
            <h3 className="font-semibold mb-2">Room opens in:</h3>
            <div className="text-4xl font-mono">
              {Math.floor(timeLeft / 3600).toString().padStart(2, '0')}:
              {Math.floor((timeLeft % 3600) / 60).toString().padStart(2, '0')}:
              {(timeLeft % 60).toString().padStart(2, '0')}
            </div>
            <p className="text-sm mt-4 text-muted-foreground">You can join 30 minutes before the start time.</p>
          </div>
        ) : (
          <Button size="lg" onClick={joinSession} className="w-full text-lg h-14">
            Join Session Now
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full p-4 bg-black flex flex-col">
      <div className="flex-1 w-full relative rounded-xl overflow-hidden shadow-2xl" ref={callFrameRef}>
        {/* Daily Iframe injected here */}
      </div>
    </div>
  );
};

export default VideoRoom;
