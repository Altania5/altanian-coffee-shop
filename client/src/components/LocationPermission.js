import React, { useState, useEffect } from 'react';
import locationService from '../services/LocationService';
import './LocationPermission.css';

function LocationPermission({ onLocationUpdate, onPermissionChange }) {
  const [permissionState, setPermissionState] = useState('unknown');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCity, setManualCity] = useState('');

  useEffect(() => {
    checkInitialPermission();
  }, []);

  const checkInitialPermission = async () => {
    try {
      const permission = await locationService.checkLocationPermission();
      setPermissionState(permission);
      
      if (permission === 'granted') {
        await getCurrentLocation();
      }
    } catch (error) {
      console.warn('Could not check location permission:', error);
    }
  };

  const getCurrentLocation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const location = await locationService.requestLocation();
      setCurrentLocation(location);
      setPermissionState('granted');
      
      if (onLocationUpdate) {
        onLocationUpdate(location);
      }
    } catch (error) {
      setError(error.message);
      setPermissionState('denied');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualLocation = async () => {
    if (!manualCity.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const location = await locationService.getLocationByCity(manualCity.trim());
      setCurrentLocation(location);
      setShowManualInput(false);
      
      if (onLocationUpdate) {
        onLocationUpdate(location);
      }
    } catch (error) {
      setError(`Could not find location for "${manualCity}"`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionChange = (newPermission) => {
    setPermissionState(newPermission);
    if (onPermissionChange) {
      onPermissionChange(newPermission);
    }
  };

  const getPermissionIcon = () => {
    switch (permissionState) {
      case 'granted':
        return '📍';
      case 'denied':
        return '🚫';
      case 'prompt':
        return '❓';
      default:
        return '🌍';
    }
  };

  const getPermissionMessage = () => {
    switch (permissionState) {
      case 'granted':
        return 'Location access granted! Weather data will be personalized to your area.';
      case 'denied':
        return 'Location access denied. You can manually enter your city for personalized weather.';
      case 'prompt':
        return 'Allow location access for personalized weather data?';
      default:
        return 'Enable location access for personalized weather data.';
    }
  };

  if (permissionState === 'granted' && currentLocation) {
    return (
      <div className="location-permission granted">
        <div className="location-status">
          <span className="location-icon">📍</span>
          <div className="location-info">
            <span className="location-text">
              Weather for {locationService.formatLocation(currentLocation)}
            </span>
            <button 
              className="change-location-btn"
              onClick={() => setShowManualInput(true)}
            >
              <span className="btn-icon">🔄</span>
              Change
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="location-permission">
      <div className="permission-header">
        <span className="permission-icon">{getPermissionIcon()}</span>
        <h3>Personalized Weather</h3>
        <p className="permission-message">{getPermissionMessage()}</p>
      </div>

      {error && (
        <div className="location-error">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
        </div>
      )}

      <div className="permission-actions">
        {permissionState !== 'granted' && (
          <button
            className="permission-btn primary"
            onClick={getCurrentLocation}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Getting Location...
              </>
            ) : (
              <>
                <span className="btn-icon">📍</span>
                Use My Location
              </>
            )}
          </button>
        )}

        <button
          className="permission-btn secondary"
          onClick={() => setShowManualInput(!showManualInput)}
        >
          <span className="btn-icon">🏙️</span>
          Enter City Manually
        </button>
      </div>

      {showManualInput && (
        <div className="manual-location-input">
          <div className="input-group">
            <input
              type="text"
              placeholder="Enter your city (e.g., New York, London, Tokyo)"
              value={manualCity}
              onChange={(e) => setManualCity(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManualLocation()}
              className="city-input"
            />
            <button
              className="set-location-btn"
              onClick={handleManualLocation}
              disabled={!manualCity.trim() || isLoading}
            >
              {isLoading ? 'Setting...' : 'Set Location'}
            </button>
          </div>
          <p className="input-help">
            Enter your city name for personalized weather data
          </p>
        </div>
      )}

      <div className="privacy-note">
        <span className="privacy-icon">🔒</span>
        <span className="privacy-text">
          Your location is only used to provide accurate weather data and is not stored or shared.
        </span>
      </div>
    </div>
  );
}

export default LocationPermission;
