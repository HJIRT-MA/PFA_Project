import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/authStore';

let socket: Socket | null = null;

export const initSocket = () => {
  if (socket) return socket;

  const user = useAuthStore.getState().user;
  if (!user) return null;

  socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
    withCredentials: true
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connect error', err);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
