export let io = null;

export function registerSocketHandlers(serverInstance) {
  io = serverInstance;

  io.on('connection', (socket) => {
    console.log('🟢 Client connected:', socket.id);

    socket.on('ack-alert', (payload) => {
      console.log('📨 Alert acknowledged:', payload);
      io.emit('alert-acknowledged', payload);
    });

    socket.on('disconnect', () => {
      console.log('🔴 Client disconnected:', socket.id);
    });
  });
}

