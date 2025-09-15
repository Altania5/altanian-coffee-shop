import React from 'react';

// Note: For a real app, you would use an icon library like 'react-icons'
// For now, we'll use simple emojis as placeholders.
const NavLinks = ({ setActiveTab }) => (
  <>
    <button onClick={() => setActiveTab('home')}>
      <span className="nav-icon">🏠</span>
      <span className="nav-text">Home</span>
    </button>
    <button onClick={() => setActiveTab('order')}>
      <span className="nav-icon">☕</span>
      <span className="nav-text">Order</span>
    </button>
    <button onClick={() => setActiveTab('loyalty')}>
      <span className="nav-icon">🎯</span>
      <span className="nav-text">Loyalty</span>
    </button>
    <button onClick={() => setActiveTab('log')}>
      <span className="nav-icon">📖</span>
      <span className="nav-text">Log</span>
    </button>
  </>
);

const AdminLink = ({ setActiveTab, user }) => {
  // Only show admin link for users with 'owner' role
  if (user.role !== 'owner') return null;
  return (
    <button onClick={() => setActiveTab('admin')}>
      <span className="nav-icon">👑</span>
      <span className="nav-text">Admin</span>
    </button>
  );
};


function Navbar({ user, onLogout, setActiveTab, cartItemCount }) {
  return (
    <>
      {/* --- TOP BAR (Always Visible) --- */}
      <header className="app-header">
        <div className="app-title">Altanian Coffee</div>
        <div className="nav-user">
          <span>Cart: {cartItemCount}</span>
          <span>Welcome, {user.firstName}!</span>
          <button onClick={onLogout}>Logout</button>
        </div>
      </header>
      
      {/* --- DESKTOP NAV (Only visible on desktop) --- */}
      <nav className="desktop-nav">
        <NavLinks setActiveTab={setActiveTab} />
        <AdminLink setActiveTab={setActiveTab} user={user} />
      </nav>

      {/* --- BOTTOM NAV (Only visible on mobile) --- */}
      <nav className="bottom-nav">
        <NavLinks setActiveTab={setActiveTab} />
        <AdminLink setActiveTab={setActiveTab} user={user} />
      </nav>
    </>
  );
}

export default Navbar;