import { io } from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on('connect', () => console.log('✅ Connected to SafeSpot socket server'));
socket.on('connect_error', (err) => console.error('❌ Socket connection error:', err.message));

export default socket;

