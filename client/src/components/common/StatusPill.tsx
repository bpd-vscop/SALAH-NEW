interface StatusPillProps {
  label: string;
  tone?: 'default' | 'positive' | 'warning' | 'critical';
}

export const StatusPill: React.FC<StatusPillProps> = ({ label, tone = 'default' }) => (
  <span className={`status-pill status-pill-${tone}`}>{label}</span>
);
