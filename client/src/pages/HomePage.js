import React, { useState, useEffect } from 'react';
import images from '../assets/images';
import TipJar from '../components/TipJar';
import SmartRecommendations from '../components/SmartRecommendations';
import SocialFeatures from '../components/SocialFeatures';
import CoffeeArtGallery from '../components/CoffeeArtGallery';
import HealthInsights from '../components/HealthInsights';
import DynamicPricing from '../components/DynamicPricing';
import api from '../utils/api';

function HomePage({ user }) {
  const [usualOrder, setUsualOrder] = useState(null);
  const [suggestedProduct, setSuggestedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usualResponse, suggestedResponse] = await Promise.all([
          api.get('/orders/usual'),
          api.get('/settings/suggested-product')
        ]);
        setUsualOrder(usualResponse.data);
        setSuggestedProduct(suggestedResponse.data);
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

  return (
    <div className="home-container">
      {/* Hero Section */}
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

      {/* Additional Features Section */}
      {user && (
        <div className="features-section">
          <div className="features-grid">
            <div className="feature-card">
              <h3>🎨 Coffee Art Gallery</h3>
              <CoffeeArtGallery />
            </div>
            
            <div className="feature-card">
              <h3>👥 Social Features</h3>
              <SocialFeatures />
            </div>
            
            <div className="feature-card">
              <h3>💚 Health Insights</h3>
              <HealthInsights />
            </div>
            
            <div className="feature-card">
              <h3>💰 Dynamic Pricing</h3>
              <DynamicPricing />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;