import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">P</div>
        <div>
          <div className="navbar-title">Plum Claims</div>
          <div className="navbar-subtitle">OPD Adjudication Engine</div>
        </div>
      </div>
      <div className="navbar-links">
        <NavLink
          to="/"
          className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
        >
          ⚡ Submit Claim
        </NavLink>
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
        >
          📊 Dashboard
        </NavLink>
        <NavLink
          to="/policy"
          className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
        >
          📋 Policy
        </NavLink>
      </div>
    </nav>
  );
}
