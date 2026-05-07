const KPICards = ({ scans = [], alerts = [], profiles = [] }) => {
  const totalScans = scans.length;
  const activeAlerts = alerts.filter((alert) => alert.status === 'active').length;
  const urgentProfiles = profiles.filter((profile) => profile.urgent_flag).length;

  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <h3>Total Scans</h3>
        <p>{totalScans}</p>
      </div>
      <div className="kpi-card">
        <h3>Active Alerts</h3>
        <p>{activeAlerts}</p>
      </div>
      <div className="kpi-card">
        <h3>Urgent Cases</h3>
        <p>{urgentProfiles}</p>
      </div>
    </div>
  );
};

export default KPICards;
