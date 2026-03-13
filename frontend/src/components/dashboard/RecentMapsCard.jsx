import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';

export default function RecentMapsCard() {
  const navigate = useNavigate();

  return (
    <Card title="Recent Maps" span={2}>
      <div style={styles.map}>
        <span>🗺️ Map Preview</span>
        <button
          style={styles.button}
          onClick={() => navigate('/MapView')}
        >
          Export
        </button>
      </div>
    </Card>
  );
}

const styles = {
  map: {
    height: '180px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.04)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: '12px',
  },
  button: {
    background: '#2F80ED',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '8px 14px',
    cursor: 'pointer',
  },
};
