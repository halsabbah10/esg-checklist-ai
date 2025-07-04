import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Assessment,
  People,
  Assignment,
  EmojiEvents,
  Download,
} from '@mui/icons-material';
import { analyticsAPI, exportAPI } from '../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const AdvancedAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30');
  const [selectedChecklist] = useState('all');
  const [tabValue, setTabValue] = useState(0);

  // Fetch various analytics data
  const { data: overallAnalytics, isLoading: loadingOverall } = useQuery({
    queryKey: ['analytics', 'overall'],
    queryFn: () => analyticsAPI.getSummary(),
  });

  const { data: scoreTrends, isLoading: loadingTrends } = useQuery({
    queryKey: ['analytics', 'score-trends', timeRange],
    queryFn: () => analyticsAPI.getScoreTrends(selectedChecklist !== 'all' ? selectedChecklist : undefined),
  });

  const { data: scoreByChecklist, isLoading: loadingByChecklist } = useQuery({
    queryKey: ['analytics', 'score-by-checklist'],
    queryFn: () => analyticsAPI.getCategoryBreakdown(),
  });

  const { data: scoreDistribution } = useQuery({
    queryKey: ['analytics', 'score-distribution'],
    queryFn: () => analyticsAPI.getScoreDistribution(),
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['analytics', 'leaderboard'],
    queryFn: () => analyticsAPI.getLeaderboard(),
  });

  const handleExport = async (type: 'checklists' | 'ai-results' | 'users' | 'submissions') => {
    try {
      let response;
      switch (type) {
        case 'checklists':
          response = await exportAPI.exportChecklists('xlsx');
          break;
        case 'ai-results':
          response = await exportAPI.exportAIResults('xlsx');
          break;
        case 'users':
          response = await exportAPI.exportUsers('xlsx');
          break;
        case 'submissions':
          response = await exportAPI.exportSubmissions('xlsx');
          break;
        default:
          response = await exportAPI.exportChecklists('xlsx');
      }
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${type}-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const MetricCard = ({ title, value, icon, trend, color = 'primary' }: any) => (
    <Card elevation={2}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight={600} color={`${color}.main`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            {trend && (
              <Box display="flex" alignItems="center" mt={0.5}>
                {trend > 0 ? (
                  <TrendingUp fontSize="small" color="success" />
                ) : (
                  <TrendingDown fontSize="small" color="error" />
                )}
                <Typography 
                  variant="caption" 
                  color={trend > 0 ? 'success.main' : 'error.main'}
                  sx={{ ml: 0.5 }}
                >
                  {trend > 0 ? '+' : ''}{trend}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box color={`${color}.main`}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const OverviewTab = () => {
    const data = overallAnalytics?.data || {};
    
    return (
      <Box>
        {/* Key Metrics */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 3, mb: 4 }}>
          <MetricCard
            title="Total Submissions"
            value={data.totalSubmissions || 0}
            icon={<Assignment fontSize="large" />}
            trend={5}
            color="primary"
          />
          <MetricCard
            title="Average Score"
            value={data.averageScore ? `${Math.round(data.averageScore * 100)}%` : '0%'}
            icon={<Assessment fontSize="large" />}
            trend={2}
            color="success"
          />
          <MetricCard
            title="Active Users"
            value={data.activeUsers || 0}
            icon={<People fontSize="large" />}
            trend={-1}
            color="info"
          />
          <MetricCard
            title="Compliance Rate"
            value={data.complianceRate ? `${Math.round(data.complianceRate * 100)}%` : '0%'}
            icon={<TrendingUp fontSize="large" />}
            trend={3}
            color="warning"
          />
        </Box>

        {/* Charts */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
          {/* Score Trends */}
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Score Trends Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={scoreTrends?.data || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="averageScore" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Score Distribution */}
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Score Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={scoreDistribution?.data || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(scoreDistribution?.data || []).map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  };

  const TrendsTab = () => (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Line Chart */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Performance Trends
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={scoreTrends?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="averageScore" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="submissions" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart by Category */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Scores by Category
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={scoreByChecklist?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="averageScore" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );

  const LeaderboardTab = () => (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        {/* Top Performers */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Performers
            </Typography>
            <List>
              {(leaderboard?.data || []).slice(0, 10).map((user: any, index: number) => (
                <ListItem key={user.id}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: index < 3 ? 'gold' : 'primary.main' }}>
                      {index < 3 ? <EmojiEvents /> : index + 1}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.name || user.email}
                    secondary={`Score: ${Math.round((user.averageScore || 0) * 100)}%`}
                  />
                  <Chip
                    label={`#${index + 1}`}
                    color={index < 3 ? 'warning' : 'default'}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>

        {/* Performance Radar */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Category Performance
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={scoreByChecklist?.data || []}>
                <PolarGrid />
                <PolarAngleAxis dataKey="category" />
                <PolarRadiusAxis />
                <Radar
                  name="Average Score"
                  dataKey="averageScore"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );

  if (loadingOverall || loadingTrends || loadingByChecklist) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
            Advanced Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive insights into ESG compliance performance
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="7">Last 7 days</MenuItem>
              <MenuItem value="30">Last 30 days</MenuItem>
              <MenuItem value="90">Last 90 days</MenuItem>
              <MenuItem value="365">Last year</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => handleExport('checklists')}
          >
            Export
          </Button>
        </Box>
      </Box>

      <Paper elevation={1}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Overview" />
          <Tab label="Trends" />
          <Tab label="Leaderboard" />
          <Tab label="Detailed Analysis" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tabValue === 0 && <OverviewTab />}
          {tabValue === 1 && <TrendsTab />}
          {tabValue === 2 && <LeaderboardTab />}
          {tabValue === 3 && (
            <Alert severity="info">
              Detailed analysis with AI insights coming soon
            </Alert>
          )}
        </Box>
      </Paper>
    </Container>
  );
};
