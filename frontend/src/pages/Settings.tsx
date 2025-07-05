import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tab,
  Tabs,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Alert,
  Card,
  CardContent,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { Person, Security, Notifications, Palette, Save, Restore } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Profile settings
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || '',
    department: '',
    phone: '',
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    reportAlerts: true,
    reviewReminders: true,
    systemUpdates: false,
  });

  // Appearance settings
  const [appearance, setAppearance] = useState({
    theme: 'light',
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timezone: 'UTC',
  });

  // Security settings
  const [security, setSecurity] = useState({
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSaveSettings = async () => {
    setSaveStatus('saving');
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleResetSettings = () => {
    // Reset to defaults
    setNotifications({
      emailNotifications: true,
      pushNotifications: true,
      reportAlerts: true,
      reviewReminders: true,
      systemUpdates: false,
    });
    setAppearance({
      theme: 'light',
      language: 'en',
      dateFormat: 'MM/DD/YYYY',
      timezone: 'UTC',
    });
    setSecurity({
      twoFactorAuth: false,
      sessionTimeout: 30,
      passwordExpiry: 90,
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account preferences and system configuration
        </Typography>
      </Box>

      {saveStatus === 'saved' && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      {saveStatus === 'error' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to save settings. Please try again.
        </Alert>
      )}

      <Paper elevation={1} sx={{ borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="settings tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<Person />} label="Profile" />
            <Tab icon={<Security />} label="Security" />
            <Tab icon={<Notifications />} label="Notifications" />
            <Tab icon={<Palette />} label="Appearance" />
          </Tabs>
        </Box>

        {/* Profile Tab */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Profile Information
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                label="Full Name"
                value={profile.name}
                onChange={e => setProfile({ ...profile, name: e.target.value })}
                sx={{ mb: 2 }}
              />
            </Box>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                label="Email"
                value={profile.email}
                disabled
                sx={{ mb: 2 }}
                helperText="Email cannot be changed"
              />
            </Box>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                label="Department"
                value={profile.department}
                onChange={e => setProfile({ ...profile, department: e.target.value })}
                sx={{ mb: 2 }}
              />
            </Box>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                label="Phone Number"
                value={profile.phone}
                onChange={e => setProfile({ ...profile, phone: e.target.value })}
                sx={{ mb: 2 }}
              />
            </Box>
            <Box sx={{ width: '100%' }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Account Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Role: {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Account ID: {user?.id}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </TabPanel>

        {/* Security Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Security Settings
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ width: '100%' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={security.twoFactorAuth}
                    onChange={e => setSecurity({ ...security, twoFactorAuth: e.target.checked })}
                  />
                }
                label="Enable Two-Factor Authentication"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                Add an extra layer of security to your account
              </Typography>
            </Box>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                label="Session Timeout (minutes)"
                type="number"
                value={security.sessionTimeout}
                onChange={e =>
                  setSecurity({ ...security, sessionTimeout: parseInt(e.target.value) })
                }
                inputProps={{ min: 15, max: 480 }}
              />
            </Box>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                label="Password Expiry (days)"
                type="number"
                value={security.passwordExpiry}
                onChange={e =>
                  setSecurity({ ...security, passwordExpiry: parseInt(e.target.value) })
                }
                inputProps={{ min: 30, max: 365 }}
              />
            </Box>
            <Box sx={{ width: '100%' }}>
              <Divider sx={{ my: 2 }} />
              <Button variant="outlined" color="primary">
                Change Password
              </Button>
            </Box>
          </Box>
        </TabPanel>

        {/* Notifications Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Notification Preferences
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.emailNotifications}
                    onChange={e =>
                      setNotifications({ ...notifications, emailNotifications: e.target.checked })
                    }
                  />
                }
                label="Email Notifications"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                Receive notifications via email
              </Typography>
            </Box>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.pushNotifications}
                    onChange={e =>
                      setNotifications({ ...notifications, pushNotifications: e.target.checked })
                    }
                  />
                }
                label="Push Notifications"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                Receive browser push notifications
              </Typography>
            </Box>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.reportAlerts}
                    onChange={e =>
                      setNotifications({ ...notifications, reportAlerts: e.target.checked })
                    }
                  />
                }
                label="Report Alerts"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                Get notified when reports are ready
              </Typography>
            </Box>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.reviewReminders}
                    onChange={e =>
                      setNotifications({ ...notifications, reviewReminders: e.target.checked })
                    }
                  />
                }
                label="Review Reminders"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                Reminders for pending reviews
              </Typography>
            </Box>
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.systemUpdates}
                    onChange={e =>
                      setNotifications({ ...notifications, systemUpdates: e.target.checked })
                    }
                  />
                }
                label="System Updates"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                Notifications about system maintenance and updates
              </Typography>
            </Box>
          </Box>
        </TabPanel>

        {/* Appearance Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Appearance & Language
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: '1 1 300px' }}>
              <FormControl fullWidth>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={appearance.theme}
                  label="Theme"
                  onChange={e => setAppearance({ ...appearance, theme: e.target.value })}
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="auto">Auto</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: '1 1 300px' }}>
              <FormControl fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                  value={appearance.language}
                  label="Language"
                  onChange={e => setAppearance({ ...appearance, language: e.target.value })}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="ar">العربية (Arabic)</MenuItem>
                  <MenuItem value="fr">Français</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: '1 1 300px' }}>
              <FormControl fullWidth>
                <InputLabel>Date Format</InputLabel>
                <Select
                  value={appearance.dateFormat}
                  label="Date Format"
                  onChange={e => setAppearance({ ...appearance, dateFormat: e.target.value })}
                >
                  <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                  <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                  <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ flex: '1 1 300px' }}>
              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select
                  value={appearance.timezone}
                  label="Timezone"
                  onChange={e => setAppearance({ ...appearance, timezone: e.target.value })}
                >
                  <MenuItem value="UTC">UTC</MenuItem>
                  <MenuItem value="Asia/Dubai">Asia/Dubai (GST)</MenuItem>
                  <MenuItem value="America/New_York">America/New_York (EST)</MenuItem>
                  <MenuItem value="Europe/London">Europe/London (GMT)</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </TabPanel>

        {/* Action Buttons */}
        <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<Restore />}
              onClick={handleResetSettings}
              color="secondary"
            >
              Reset to Defaults
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSaveSettings}
              disabled={saveStatus === 'saving'}
              sx={{ minWidth: 120 }}
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default Settings;
