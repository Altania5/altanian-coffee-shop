import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AddCoffeeLogForm from '../components/AddCoffeeLogForm';
import CoffeeLogHistory from '../components/CoffeeLogHistory';
import AICoach from '../components/AICoach';

function CoffeeLogPage({ user }) {
  const [logs, setLogs] = useState([]);
  const [beans, setBeans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [latestLog, setLatestLog] = useState(null);
  const [showAICoach, setShowAICoach] = useState(false);

  // 2. Wrap the function in useCallback
  const fetchLogsAndBeans = useCallback(async () => {
    try {
      const headers = { 'x-auth-token': user.token };
      const [logsResponse, beansResponse] = await Promise.all([
        axios.get('/coffeelogs', { headers }),
        axios.get('/beans', { headers })
      ]);
      setLogs(logsResponse.data);
      setBeans(beansResponse.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [user.token]); // 3. Add its own dependencies here

  useEffect(() => {
    if (user.token) {
      fetchLogsAndBeans();
    }
    // 4. Add the memoized function to the dependency array
  }, [user.token, fetchLogsAndBeans]);

  const handleLogAdded = (newLog) => {
    // Add the new log to the top of the list
    setLogs([newLog, ...logs]);
    
    // Set the latest log for AI analysis
    setLatestLog(newLog);
    setShowAICoach(true);
  };
  
  const handleRecommendationApplied = (recommendation) => {
    console.log('User applied recommendation:', recommendation);
    // Here you could track which recommendations users follow
    // and use this data to improve the AI model over time
  };

  const handleBeanAdded = (newBean) => {
    setBeans([...beans, newBean]);
  };


  if (loading) {
    return <p>Loading coffee logs...</p>;
  }

  return (
    <div className="coffee-log-page">
      <AddCoffeeLogForm
        user={user}
        token={user.token}
        beans={beans}
        onLogAdded={handleLogAdded}
        onBeanAdded={handleBeanAdded}
      />
      
      {/* AI Coach - Shows after adding a new log */}
      {showAICoach && latestLog && (
        <AICoach 
          shotData={latestLog}
          onRecommendationApplied={handleRecommendationApplied}
        />
      )}
      
      <div className="log-history-section">
        <CoffeeLogHistory logs={logs} />
      </div>
    </div>
  );
}

export default CoffeeLogPage;