import React, { useState, useEffect } from 'react';
import locationService from '../services/LocationService';
import './WeatherBackground.css';

function WeatherBackground({ weatherData, children }) {
  const [backgroundClass, setBackgroundClass] = useState('weather-clear');
  const [seasonalClass, setSeasonalClass] = useState('');

  useEffect(() => {
    if (weatherData) {
      updateWeatherBackground(weatherData);
    }
  }, [weatherData]);

  useEffect(() => {
    updateSeasonalBackground();
  }, []);

  const updateWeatherBackground = (weather) => {
    const condition = weather.condition?.toLowerCase() || 'clear';
    
    let weatherClass = 'weather-clear';
    
    if (condition.includes('rain') || condition.includes('drizzle')) {
      weatherClass = 'weather-rain';
    } else if (condition.includes('snow')) {
      weatherClass = 'weather-snow';
    } else if (condition.includes('cloud') || condition.includes('overcast')) {
      weatherClass = 'weather-cloudy';
    } else if (condition.includes('storm') || condition.includes('thunder')) {
      weatherClass = 'weather-storm';
    } else if (condition.includes('fog') || condition.includes('mist')) {
      weatherClass = 'weather-fog';
    } else if (condition.includes('sun') || condition.includes('clear')) {
      weatherClass = 'weather-sunny';
    }
    
    console.log('Setting weather background class:', weatherClass, 'for condition:', condition);
    setBackgroundClass(weatherClass);
  };

  const updateSeasonalBackground = () => {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();
    
    let seasonalClass = '';
    
    // Fall (September 22 - December 20)
    if ((month === 9 && day >= 22) || month === 10 || month === 11 || (month === 12 && day <= 20)) {
      seasonalClass = 'seasonal-fall';
    }
    // Winter (December 21 - March 19)
    else if ((month === 12 && day >= 21) || month === 1 || month === 2 || (month === 3 && day <= 19)) {
      seasonalClass = 'seasonal-winter';
    }
    // Spring (March 20 - June 20)
    else if ((month === 3 && day >= 20) || month === 4 || month === 5 || (month === 6 && day <= 20)) {
      seasonalClass = 'seasonal-spring';
    }
    // Summer (June 21 - September 21)
    else {
      seasonalClass = 'seasonal-summer';
    }
    
    // Check for special holidays
    if (month === 10 && day === 31) {
      seasonalClass += ' holiday-halloween';
    } else if (month === 12 && day === 25) {
      seasonalClass += ' holiday-christmas';
    } else if (month === 2 && day === 14) {
      seasonalClass += ' holiday-valentine';
    } else if (month === 7 && day === 4) {
      seasonalClass += ' holiday-independence';
    }
    
    console.log('Setting seasonal background class:', seasonalClass, 'for month:', month, 'day:', day);
    setSeasonalClass(seasonalClass);
  };

  return (
    <div className={`weather-background ${backgroundClass} ${seasonalClass}`}>
      <div className="weather-overlay">
        {children}
      </div>
    </div>
  );
}

export default WeatherBackground;
