import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children, user }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);
  const userRef = useRef(null);

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10 notifications
  };

  useEffect(() => {
    if (!user) return;

    console.log('🔄 SocketContext useEffect triggered for user:', user.id, user.role);

    // Check if we already have a socket for this user
    if (socketRef.current && userRef.current?.id === user.id) {
      console.log('🔄 Reusing existing socket for user:', user.id);
      return;
    }

    // Clean up existing socket if user changed
    if (socketRef.current) {
      console.log('🧹 Cleaning up old socket for user:', userRef.current?.id);
      socketRef.current.close();
    }

    // Add a small delay to ensure server is ready
    const connectionTimeout = setTimeout(() => {
      console.log('🔄 Creating new socket for user:', user.id, user.role);
      userRef.current = user;

      // Create socket connection
      const socketUrl = process.env.NODE_ENV === 'production' 
        ? 'https://altanian-coffee-shop-b74ac47acbb4.herokuapp.com'
        : 'http://localhost:5003';
      
      const newSocket = io(socketUrl, {
        transports: ['polling'], // Use polling only to avoid WebSocket frame header issues
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        maxReconnectionAttempts: 5,
        upgrade: false, // Disable WebSocket upgrade
        rememberUpgrade: false,
        forceBase64: false
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('🔌 Connected to server');
        setIsConnected(true);
        
        // Join appropriate room based on user role
        newSocket.emit('join-room', user.role, user.id);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from server:', reason);
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('🔌 Connection error:', error.message);
        console.log('⚠️ WebSocket connection failed, but app will continue to work without real-time features');
        setIsConnected(false);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('🔌 Reconnection error:', error.message);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('🔌 Reconnection failed after maximum attempts');
        setIsConnected(false);
      });

      // Order status change notifications
      newSocket.on('order-status-changed', (data) => {
        console.log('📱 Order status changed:', data);
        addNotification({
          type: 'order-status',
          title: 'Order Status Update',
          message: data.message,
          data: data,
          timestamp: new Date()
        });
      });

      // Low stock alerts (for admin users)
      newSocket.on('low-stock-alert', (data) => {
        console.log('🚨 Low stock alert:', data);
        addNotification({
          type: 'low-stock',
          title: 'Low Stock Alert',
          message: data.message,
          data: data,
          timestamp: new Date()
        });
      });

      socketRef.current = newSocket;
      setSocket(newSocket);
    }, 1000);

    // Cleanup on unmount
    return () => {
      console.log('🧹 SocketContext cleanup for user:', user.id);
      clearTimeout(connectionTimeout);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [user?.id, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeNotification = (index) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const value = {
    socket,
    isConnected,
    notifications,
    addNotification,
    removeNotification,
    clearNotifications
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

