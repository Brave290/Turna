export type SettingsNavItem = {
  href: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
};

export type SettingsSection = {
  id: string;
  title: string;
  items: SettingsNavItem[];
};

export type UserPreferences = {
  user_id: string;
  theme: string;
  reduce_motion: boolean;
  language: string;
  currency: string;
  push_notifications: boolean;
  email_notifications: boolean;
  contribution_reminders: boolean;
  payout_reminders: boolean;
  circle_activity: boolean;
  security_alerts: boolean;
  marketing: boolean;
  default_frequency: string;
  default_reminder_time: string;
  reminder_lead_hours: number;
  show_completed_circles: boolean;
  reminder_time: string;
  contribution_due: boolean;
  day_before: boolean;
  due_today: boolean;
  overdue: boolean;
  payout_approaching: boolean;
  profile_visibility: string;
  activity_visibility: string;
  data_sharing: boolean;
};
