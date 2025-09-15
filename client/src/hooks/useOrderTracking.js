import { useState, useEffect, useRef, useCallback } from 'react';

export const useOrderTracking = (orderId, token) => {
  const [orderStatus, setOrderStatus] = useState('pending');
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [orderUpdates, setOrderUpdates] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!orderId || !token) return;

    try {
      // Determine WebSocket URL based on environment
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = process.env.REACT_APP_WS_HOST || window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/ws/orders?token=${token}`;
      
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
        
        // Subscribe to order updates
        ws.send(JSON.stringify({
          type: 'SUBSCRIBE_ORDER',
          orderId: orderId
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', data);
          
          switch (data.type) {
            case 'CONNECTION_ESTABLISHED':
              console.log('🎉 WebSocket connection established');
              break;
              
            case 'ORDER_UPDATE':
              if (data.orderId === orderId) {
                console.log(`📋 Order ${orderId} status update:`, data.status);
                setOrderStatus(data.status);
                setEstimatedTime(data.estimatedTime);
                
                // Add to updates history
                setOrderUpdates(prev => [...prev, {
                  status: data.status,
                  timestamp: data.timestamp,
                  estimatedTime: data.estimatedTime,
                  updatedBy: data.updatedBy,
                  statusDisplay: data.statusDisplay,
                  isNewOrder: data.isNewOrder
                }]);
              }
              break;
              
            case 'SUBSCRIPTION_CONFIRMED':
              console.log(`📋 Subscribed to order ${data.orderId} updates`);
              break;
              
            case 'PONG':
              // Keep-alive response
              break;
              
            case 'ERROR':
              console.error('WebSocket error:', data.message);
              setConnectionError(data.message);
              break;
              
            default:
              console.log('Unknown WebSocket message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setConnectionError('Unable to connect to real-time updates. Please refresh the page.');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection error occurred');
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setConnectionError('Failed to establish connection');
    }
  }, [orderId, token]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const ping = useCallback(() => {
    sendMessage({ type: 'PING' });
  }, [sendMessage]);

  // Connect on mount and when dependencies change
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Keep-alive ping every 30 seconds
  useEffect(() => {
    if (isConnected) {
      const pingInterval = setInterval(ping, 30000);
      return () => clearInterval(pingInterval);
    }
  }, [isConnected, ping]);

  return {
    orderStatus,
    estimatedTime,
    isConnected,
    connectionError,
    orderUpdates,
    reconnect: connect,
    disconnect,
    sendMessage
  };
};

export default useOrderTracking;

