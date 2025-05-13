import React from "react";
import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/dashboard" className="navbar-link">
        Dashboard
      </Link>
    </nav>
  );
}

export default Navbar;
