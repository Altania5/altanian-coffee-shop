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
              <a href="#" className="social-link" aria-label="Facebook">
                <span className="social-icon">📘</span>
              </a>
              <a href="#" className="social-link" aria-label="Instagram">
                <span className="social-icon">📷</span>
              </a>
              <a href="#" className="social-link" aria-label="Twitter">
                <span className="social-icon">🐦</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-section">
            <h4 className="footer-title">Quick Links</h4>
            <ul className="footer-links">
              <li><a href="#home" className="footer-link">Home</a></li>
              <li><a href="#order" className="footer-link">Order</a></li>
              <li><a href="#loyalty" className="footer-link">Loyalty Program</a></li>
              <li><a href="#log" className="footer-link">Coffee Log</a></li>
            </ul>
          </div>

          {/* Services */}
          <div className="footer-section">
            <h4 className="footer-title">Services</h4>
            <ul className="footer-links">
              <li><a href="#" className="footer-link">Espresso</a></li>
              <li><a href="#" className="footer-link">Cappuccino</a></li>
              <li><a href="#" className="footer-link">Latte</a></li>
              <li><a href="#" className="footer-link">Cold Brew</a></li>
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
              <a href="#" className="legal-link">Privacy Policy</a>
              <a href="#" className="legal-link">Terms of Service</a>
              <a href="#" className="legal-link">Accessibility</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
