import Card from '../common/Card';

export default function MissionHistoryCard() {
  return (
    <Card title="Mission History" span={3}>
      <div style={styles.chart}>
        📈 Chart placeholder
      </div>
    </Card>
  );
}

const styles = {
  chart: {
    height: '120px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7
  }
};
