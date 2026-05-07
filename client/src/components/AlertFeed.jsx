import dayjs from 'dayjs';

const AlertFeed = ({ alerts = [] }) => (
  <div className="alert-feed">
    <h2>Emergency Alerts</h2>
    <ul>
      {alerts.map((alert) => (
        <li key={alert._id} className={alert.status === 'active' ? 'active' : 'ack'}>
          <div>
            <h4>{alert.message}</h4>
            <p>{dayjs(alert.timestamp).format('MMM D, YYYY h:mm A')}</p>
          </div>
          <span>{alert.status === 'active' ? 'Awaiting Ack' : 'Acknowledged'}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default AlertFeed;
