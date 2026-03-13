import './card.css';

export default function Card({ title, children, span = 1 }) {
  return (
    <div className="card" style={{ gridColumn: `span ${span}` }}>
      {title && <h4>{title}</h4>}
      {children}
    </div>
  );
}
