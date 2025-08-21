import React, { useState, useEffect, useCallback } from 'react'; // 1. Import useCallback
import axios from 'axios';
import AddCoffeeLogForm from '../components/AddCoffeeLogForm';
import CoffeeLogHistory from '../components/CoffeeLogHistory';

function CoffeeLogPage({ user }) {
  const [logs, setLogs] = useState([]);
  const [beans, setBeans] = useState([]);
  const [loading, setLoading] = useState(true);

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
  };

  const handleBeanAdded = (newBean) => {
    setBeans([...beans, newBean]);
  };


  if (loading) {
    return <p>Loading coffee logs...</p>;
  }

  return (
    <div>
      <AddCoffeeLogForm
        user={user}
        token={user.token}
        beans={beans}
        onLogAdded={handleLogAdded}
        onBeanAdded={handleBeanAdded}
      />
      <hr />
      <CoffeeLogHistory logs={logs} />
    </div>
  );
}

export default CoffeeLogPage;