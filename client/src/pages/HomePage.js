import React, { useState, useEffect } from 'react';
import images from '../assets/images';
import TipJar from '../components/TipJar';
import SmartRecommendations from '../components/SmartRecommendations';
import LocationPermission from '../components/LocationPermission';
import WeatherBackground from '../components/WeatherBackground';
import api from '../utils/api';
import OrderTracking from '../components/OrderTracking';

function HomePage({ user }) {
  const [usualOrder, setUsualOrder] = useState(null);
  const [suggestedProduct, setSuggestedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showLocationPermission, setShowLocationPermission] = useState(true);
  const [weatherData, setWeatherData] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [tracking, setTracking] = useState({ open: false, orderId: null, orderNumber: null });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usualResponse, suggestedResponse, summaryResponse] = await Promise.all([
          api.get('/orders/usual'),
          api.get('/settings/suggested-product'),
          api.get('/orders/user/summary?activeLimit=1')
        ]);
        setUsualOrder(usualResponse.data);
        setSuggestedProduct(suggestedResponse.data);
        if (summaryResponse.data?.success && Array.isArray(summaryResponse.data.activeOrders) && summaryResponse.data.activeOrders.length > 0) {
          setActiveOrder(summaryResponse.data.activeOrders[0]);
        } else {
          setActiveOrder(null);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user && user.token) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getTimeBasedRecommendation = () => {
    const hour = currentTime.getHours();
    if (hour < 10) return 'Start your day with a perfect coffee';
    if (hour < 14) return 'Fuel your afternoon with our signature blend';
    if (hour < 18) return 'Perfect time for an afternoon pick-me-up';
    return 'Wind down with our evening specials';
  };

  const handleRecommendationClick = (drinkName) => {
    // Navigate to order page with the recommended drink
    // This would typically trigger navigation to the order page
    console.log('Recommended drink clicked:', drinkName);
    // You could emit an event or use a navigation function here
  };

  const fetchWeatherData = async () => {
    try {
      // Get current date to determine season
      const now = new Date();
      const month = now.getMonth() + 1; // 1-12
      const day = now.getDate();
      
      // Determine season based on date
      let season = 'spring';
      if ((month === 9 && day >= 22) || month === 10 || month === 11 || (month === 12 && day <= 20)) {
        season = 'fall';
      } else if ((month === 12 && day >= 21) || month === 1 || month === 2 || (month === 3 && day <= 19)) {
        season = 'winter';
      } else if ((month === 3 && day >= 20) || month === 4 || month === 5 || (month === 6 && day <= 20)) {
        season = 'spring';
      } else {
        season = 'summer';
      }
      
      // Mock weather data with seasonal variation
      const mockWeather = {
        temperature: season === 'winter' ? 5 : season === 'summer' ? 28 : 22,
        condition: season === 'winter' ? 'snow' : season === 'summer' ? 'sunny' : 'clear',
        humidity: 65,
        windSpeed: 8,
        location: 'Current Location',
        season: season
      };
      setWeatherData(mockWeather);
      console.log('Weather data set:', mockWeather);
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
    }
  };

  useEffect(() => {
    fetchWeatherData();
  }, []);

  return (
    <div className="home-container">
      {/* Hero Section */}
      <WeatherBackground weatherData={weatherData}>
        <div className="hero-section">
          <div className="hero-content">
            <div className="hero-greeting">
              <h1 className="hero-title">{getGreeting()}{user?.firstName ? `, ${user.firstName}` : ''}!</h1>
              <p className="hero-subtitle">{getTimeBasedRecommendation()}</p>
            </div>
            <div className="hero-time">
              <div className="time-display">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="date-display">
                {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>
          <div className="hero-decoration">
            <div className="coffee-steam">☕</div>
            <div className="floating-beans">
              <span className="bean bean-1">☕</span>
              <span className="bean bean-2">🫘</span>
              <span className="bean bean-3">☕</span>
            </div>
          </div>
        </div>
      </WeatherBackground>

      {/* Location Permission */}
      {showLocationPermission && (
        <LocationPermission
          onLocationUpdate={(location) => {
            console.log('Location updated:', location);
            // Trigger weather data refresh when location changes
            fetchWeatherData();
          }}
          onPermissionChange={(permission) => {
            if (permission === 'granted') {
              setShowLocationPermission(false);
            }
          }}
        />
      )}

      {/* Active Order Card */}
      {user && activeOrder && (
        <div className="home-card" style={{ margin: '16px', borderLeft: '4px solid #27ae60' }}>
          <div className="card-header">
            <h3>Active Order</h3>
            <span className="card-icon">☕</span>
          </div>
          <div className="card-content">
            <p><strong>Order #{activeOrder.orderNumber}</strong> • {activeOrder.status}</p>
            {activeOrder.estimatedTime && (
              <p style={{ color: '#555' }}>ETA: {new Date(activeOrder.estimatedTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
            )}
            <div className="card-footer">
              <button 
                className="card-button" 
                onClick={() => setTracking({ open: true, orderId: activeOrder.id, orderNumber: activeOrder.orderNumber })}
              >
                <span>Track Order</span>
                <span className="button-icon">👁️</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {tracking.open && (
        <div className="tracking-modal">
          <div className="tracking-modal-content">
            <div className="tracking-modal-header">
              <h3>Track Order</h3>
              <button className="close-btn" onClick={() => setTracking({ open: false, orderId: null, orderNumber: null })}>✕</button>
            </div>
            <div className="tracking-modal-body">
              <OrderTracking orderId={tracking.orderId} orderNumber={tracking.orderNumber} token={user?.token} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="home-grid">
        <div className="home-card featured-card">
          <div className="card-header">
            <h3>Your Usual</h3>
            <span className="card-icon">⭐</span>
          </div>
          {loading ? (
            <div className="card-content">
              <div className="loading-skeleton">
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
                <div className="skeleton-line"></div>
              </div>
            </div>
          ) : usualOrder ? (
            <div className="card-content">
              <h4>{usualOrder.name}</h4>
              <p className="card-description">{usualOrder.description}</p>
              <div className="card-footer">
                <p className="card-price">${usualOrder.price.toFixed(2)}</p>
                <button className="card-button quick-order-btn">
                  <span>Order Again</span>
                  <span className="button-icon">🚀</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="card-content empty-state">
              <div className="empty-icon">🤔</div>
              <p>You don't have a regular order yet. Place an order to see it here!</p>
            </div>
          )}
        </div>

        {/* Smart Recommendations */}
        {user && (
          <SmartRecommendations 
            user={user} 
            onRecommendationClick={handleRecommendationClick}
          />
        )}

        <div className="home-card suggestion-card">
          <div className="card-header">
            <h3>Try Something New</h3>
            <span className="card-icon">✨</span>
          </div>
          {loading ? (
            <div className="card-content">
              <div className="loading-skeleton">
                <div className="skeleton-image"></div>
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
              </div>
            </div>
          ) : suggestedProduct ? (
            <div className="card-content">
              <div className="suggestion-image-container">
                <img 
                  src={images[suggestedProduct.imageUrl.split('.')[0]] || images.default}
                  alt={suggestedProduct.name} 
                  className="suggestion-img"
                  loading="lazy"
                />
                <div className="image-overlay">
                  <span className="overlay-text">New</span>
                </div>
              </div>
              <h4>{suggestedProduct.name}</h4>
              <p className="card-description">{suggestedProduct.description}</p>
              <button className="card-button explore-btn">
                <span>Explore</span>
                <span className="button-icon">👀</span>
              </button>
            </div>
          ) : (
            <div className="card-content empty-state">
              <div className="empty-icon">💭</div>
              <p>No suggestions at the moment.</p>
            </div>
          )}
        </div>
        
        <div className="tip-jar-wrapper">
          <TipJar user={user} />
        </div>
      </div>

    </div>
  );
}

export default HomePage;