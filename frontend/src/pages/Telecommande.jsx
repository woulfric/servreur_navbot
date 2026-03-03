import Card from '../components/common/Card';
import './telecommande.css';

export default function Telecommande() {
  return (
    <div className="teleop-page">
      {/* Zone contrôle manuelle */}
      <Card title="Manual Control" span={2}>
        <div className="teleop-main">
          <div className="teleop-pad">
            <button className="teleop-btn up">↑</button>
            <div className="teleop-middle-row">
              <button className="teleop-btn left">←</button>
              <button className="teleop-btn stop">■</button>
              <button className="teleop-btn right">→</button>
            </div>
            <button className="teleop-btn down">↓</button>
          </div>

          <div className="teleop-speed">
            <p>Speed</p>
            <div className="speed-buttons">
              <button className="chip active">Slow</button>
              <button className="chip">Normal</button>
              <button className="chip">Fast</button>
            </div>
          </div>
        </div>
      </Card>

      {/* Statut robot */}
      <Card title="Robot Status">
        <ul className="teleop-list">
          <li><span>Mode</span><strong>MANUAL</strong></li>
          <li><span>Battery</span><strong>82%</strong></li>
          <li><span>Connection</span><strong>Connected</strong></li>
          <li><span>Current speed</span><strong>0.35 m/s</strong></li>
        </ul>
      </Card>

      {/* Sécurité */}
      <Card title="Safety" span={3}>
        <div className="teleop-safety">
          <button className="btn-emergency">EMERGENCY STOP</button>
          <p>Use manual control only in safe, supervised environments.</p>
        </div>
      </Card>
    </div>
  );
}
