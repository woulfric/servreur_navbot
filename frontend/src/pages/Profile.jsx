import Card from '../components/common/Card';
import './profile.css';

export default function Profile() {
  const user = {
    name: 'Operator NavBot',
    role: 'Robotics Supervisor',
    email: 'operator@navbot.io',
    organisation: 'NavBot Robotics Lab',
    location: 'Paris, France',
    phone: '+33 6 12 34 56 78',
    avatarInitials: 'ON',
    lastLogin: 'Today • 15:42',
  };

  return (
    <div className="profile-page">
      {/* header gauche : avatar + infos principales */}
      <Card span={2}>
        <div className="profile-header">
          <div className="profile-avatar">
            {user.avatarInitials}
          </div>

          <div className="profile-main-info">
            <h2>{user.name}</h2>
            <p className="profile-role">{user.role}</p>
            <p className="profile-meta">
              {user.organisation} • {user.location}
            </p>

            <div className="profile-tags">
              <span className="tag">Admin</span>
              <span className="tag">Robots: 4</span>
              <span className="tag">Missions / day: 12</span>
            </div>
          </div>

          <div className="profile-actions">
            <button className="btn primary">Edit Profile</button>
            <button className="btn ghost">Log Out</button>
            <p className="last-login">Last login: {user.lastLogin}</p>
          </div>
        </div>
      </Card>

      {/* carte droite : résumé système */}
      <Card title="Account Overview">
        <ul className="profile-list">
          <li><span>Status</span><strong>Active</strong></li>
          <li><span>Role</span><strong>{user.role}</strong></li>
          <li><span>Access Level</span><strong>Full control</strong></li>
          <li><span>Member since</span><strong>Feb 2025</strong></li>
        </ul>
      </Card>

      {/* infos de contact */}
      <Card title="Contact information" span={2}>
        <ul className="profile-list">
          <li><span>Email</span><strong>{user.email}</strong></li>
          <li><span>Phone</span><strong>{user.phone}</strong></li>
          <li><span>Location</span><strong>{user.location}</strong></li>
          <li><span>Organisation</span><strong>{user.organisation}</strong></li>
        </ul>
      </Card>

      {/* préférences / sécurité */}
      <Card title="Preferences & Security">
        <ul className="profile-list">
          <li><span>Theme</span><strong>Dark • NavBot</strong></li>
          <li><span>Notifications</span><strong>Critical only</strong></li>
          <li><span>Two-factor auth</span><strong>Enabled</strong></li>
          <li><span>Sessions</span><strong>2 active devices</strong></li>
        </ul>
      </Card>

      {/* activités récentes */}
      <Card title="Recent activity" span={3}>
        <ul className="activity-list">
          <li>
            <span className="dot success" />
            <div>
              <p>Mission <strong>#M-204</strong> completed</p>
              <small>Today • 15:21 • Robot TurtleBot4</small>
            </div>
          </li>
          <li>
            <span className="dot warning" />
            <div>
              <p>Battery low warning acknowledged</p>
              <small>Today • 14:03 • Robot NavBot-02</small>
            </div>
          </li>
          <li>
            <span className="dot info" />
            <div>
              <p>Profile settings updated</p>
              <small>Yesterday • 19:44 • Web dashboard</small>
            </div>
          </li>
        </ul>
      </Card>
    </div>
  );
}

