import { Battery, Thermometer, Navigation, MapPin } from 'lucide-react';
import Card from '../common/Card';

export default function RobotStatusCard() {
  return (
    <Card title="Robot Status">
      <Row icon={<Battery size={16} />} label="Battery" value="87%" />
      <Row icon={<Thermometer size={16} />} label="Temperature" value="45°C" />
      <Row icon={<Navigation size={16} />} label="Mode" value="AUTONOMOUS" />
      <Row icon={<MapPin size={16} />} label="Position" value="32.578 / 15.672" />
    </Card>
  );
}

function Row({ icon, label, value }) {
  return (
    <div className="status-row">
      <div className="status-left">
        {icon}
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
    </div>
  );
}
