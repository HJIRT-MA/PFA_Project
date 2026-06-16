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
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const callFrameRef = useRef<HTMLDivElement>(null);
  const dailyRef = useRef<DailyCall | null>(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const res = await api.get(`/api/sessions/${id}`);
      return res.data.session;
    }
  });

  // 1. Timer Logic
  useEffect(() => {
    if (!session) return;
    
    const checkTime = () => {
      const now = new Date();
      const start = new Date(session.datetime);
      const diffSecs = differenceInSeconds(start, now);
      
      if (diffSecs > 30 * 60) {
        setTimeLeft(diffSecs - 30 * 60);
      } else {
        setTimeLeft(0);
      }
    };
    
    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const handleLeave = useCallback(() => {
    router.push(`/dashboard`);
  }, [router]);

  const joinSession = async () => {
    try {
      const res = await api.post(`/api/sessions/${id}/room`);
      setRoomUrl(res.data.roomUrl);
      setToken(res.data.token);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to initialize video room');
    }
  };

  // 2. Daily.co Initialization Logic (Only ONE useEffect for this)
  useEffect(() => {
    if (!roomUrl || !callFrameRef.current) return;
    
    // Do not initialize Daily SDK if it's a mock room
    if (roomUrl.includes('mock.daily.co')) return;

    // --- FIX: Clean up any dangling global instances from React Strict Mode / Fast Refresh ---
    const existingInstance = DailyIframe.getCallInstance();
    if (existingInstance) {
      existingInstance.destroy();
    }
    // -----------------------------------------------------------------------------------------

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

    let isMounted = true;

    const joinOptions: any = { url: roomUrl };
    if (token) joinOptions.token = token;

    dailyRef.current.join(joinOptions).catch(err => {
      // 1. If component unmounted, exit silently
      if (!isMounted) return;

      // 2. THE NUCLEAR FIX: 
      // A real Daily error ALWAYS has an 'errorMsg', 'message', or is a string.
      // If none of these exist (like the weird {} abort object), kill the process and do not crash the UI.
      const hasRealErrorData = err && (err.errorMsg || err.message || typeof err === 'string');
      
      if (!hasRealErrorData) {
        console.log('Daily.co silent abort caught and ignored.');
        return; 
      }

      // 3. Only show the red error screen if we have actual readable error data
      console.error('Daily.co actual join error:', err);
      setErrorMsg('Failed to join room: ' + (err.errorMsg || err.message || 'Unknown error'));
    });

    return () => {
      isMounted = false;
      if (dailyRef.current) {
        // Safe leave and destroy
        dailyRef.current.leave().catch(() => {}); 
        dailyRef.current.destroy();
        dailyRef.current = null;
      }
    };
  }, [roomUrl, token, handleLeave]);

  // 3. Render logic
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

  if (roomUrl.includes('mock.daily.co')) {
    return (
      <div className="h-[calc(100vh-4rem)] w-full p-8 bg-zinc-950 flex flex-col items-center justify-center space-y-6 text-center">
        <div className="w-24 h-24 bg-primary/20 text-primary rounded-3xl flex items-center justify-center text-4xl mb-4">🎥</div>
        <h2 className="text-3xl font-bold text-white">Simulated Mock Session Room</h2>
        <p className="text-zinc-400 max-w-lg mb-8">
          You are seeing this mock room because there is no valid <strong>Daily.co API Key</strong> configured in your server's <code>.env</code> file. To use real video sessions, please add your Daily API key.
        </p>
        <Button size="lg" variant="destructive" onClick={handleLeave} className="rounded-xl px-8 font-bold h-12">
          End Mock Session
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full p-4 bg-black flex flex-col">
      <div className="flex-1 w-full relative rounded-xl overflow-hidden shadow-2xl bg-zinc-900" ref={callFrameRef}>
        {/* Daily Iframe injected here */}
      </div>
    </div>
  );
};

export default VideoRoom;