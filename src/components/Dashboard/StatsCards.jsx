import "./StatsCards.css";

const StatsCards = ({ stats }) => {
  return (
    <div className="stats-container">
      <div className="stat-card">
        <div className="stat-icon client-icon">
          <i className="fas fa-users"></i>
        </div>
        <div className="stat-content">
          <h3>Total Clients</h3>
          <p className="stat-number">{stats.clients}</p>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon service-icon">
          <i className="fas fa-concierge-bell"></i>
        </div>
        <div className="stat-content">
          <h3>Total Services</h3>
          <p className="stat-number">{stats.services}</p>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon location-icon">
          <i className="fas fa-map-marker-alt"></i>
        </div>
        <div className="stat-content">
          <h3>Locations</h3>
          <p className="stat-number">{stats.locations}</p>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon slot-icon">
          <i className="fas fa-layer-group"></i>
        </div>
        <div className="stat-content">
          <h3>Location Slots</h3>
          <p className="stat-number">{stats.slots}</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;