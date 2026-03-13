import Card from '../components/common/Card';

const notifications = [
  { id: 1, text: 'Robot battery low', type: 'warning' },
  { id: 2, text: 'Mission completed', type: 'success' },
  { id: 3, text: 'Obstacle detected', type: 'error' },
];

export default function Notifications() {
  return (
    <Card title="Notifications">
      {notifications.map(n => (
        <div key={n.id} className={`notif ${n.type}`}>
          {n.text}
        </div>
      ))}
    </Card>
  );
}
