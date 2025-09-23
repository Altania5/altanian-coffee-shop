import React from 'react';
import './Footer.css';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          {/* Brand Section */}
          <div className="footer-brand">
            <h3 className="footer-logo">Altania Coffee</h3>
            <p className="footer-tagline">
              Crafting exceptional coffee experiences with passion and precision.
            </p>
            <div className="footer-social">
              <button className="social-link" aria-label="Facebook">
                <span className="social-icon">📘</span>
              </button>
              <button className="social-link" aria-label="Instagram">
                <span className="social-icon">📷</span>
              </button>
              <button className="social-link" aria-label="Twitter">
                <span className="social-icon">🐦</span>
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-section">
            <h4 className="footer-title">Quick Links</h4>
            <ul className="footer-links">
              <li><button className="footer-link">Home</button></li>
              <li><button className="footer-link">Order</button></li>
              <li><button className="footer-link">Loyalty Program</button></li>
              <li><button className="footer-link">Coffee Log</button></li>
            </ul>
          </div>

          {/* Services */}
          <div className="footer-section">
            <h4 className="footer-title">Services</h4>
            <ul className="footer-links">
              <li><button className="footer-link">Espresso</button></li>
              <li><button className="footer-link">Cappuccino</button></li>
              <li><button className="footer-link">Latte</button></li>
              <li><button className="footer-link">Cold Brew</button></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="footer-section">
            <h4 className="footer-title">Contact</h4>
            <div className="footer-contact">
              <p className="contact-item">
                <span className="contact-icon">📍</span>
                123 Coffee Street, Bean City
              </p>
              <p className="contact-item">
                <span className="contact-icon">📞</span>
                (555) 123-BREW
              </p>
              <p className="contact-item">
                <span className="contact-icon">✉️</span>
                hello@altaniacoffee.com
              </p>
              <p className="contact-item">
                <span className="contact-icon">🕒</span>
                Mon-Fri: 6AM-8PM, Sat-Sun: 7AM-9PM
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p className="footer-copyright">
              © {currentYear} Altania Coffee. All rights reserved.
            </p>
            <div className="footer-legal">
              <button className="legal-link">Privacy Policy</button>
              <button className="legal-link">Terms of Service</button>
              <button className="legal-link">Accessibility</button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
