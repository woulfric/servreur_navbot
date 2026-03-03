import Card from '../common/Card';

export default function RobotOverviewCard() {
  return (
    <Card title="Robot Overview">
      <div style={styles.image} />
      <p style={styles.name}>TurtleBot4</p>
    </Card>
  );
}

const styles = {
  image: {
    height: '160px',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.08)',
    marginBottom: '12px'
  },
  name: {
    opacity: 0.8
  }
};
