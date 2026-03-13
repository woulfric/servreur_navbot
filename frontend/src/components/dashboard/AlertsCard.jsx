import Card from '../common/Card';

const alerts = [
  { label: 'Low Battery', time: '10:45 AM', color: '#F2C94C' },
  { label: 'Obstacle Detected', time: '9:27 AM', color: '#EB5757' },
  { label: 'Mission Completed', time: '9:05 AM', color: '#27AE60' },
];

export default function AlertsCard() {
  return (
    <Card title="Alerts">
      {alerts.map((a, i) => (
        <div key={i} style={styles.alert}>
          <span style={{ ...styles.dot, background: a.color }} />
          <span>{a.label}</span>
          <small>{a.time}</small>
        </div>
      ))}
    </Card>
  );
}

const styles = {
  alert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
    opacity: 0.9
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  }
};
