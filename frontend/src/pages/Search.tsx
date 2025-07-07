import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { Assignment, Description, Analytics, People } from '@mui/icons-material';
import { GlobalSearch } from '../components/GlobalSearch';

export const Search: React.FC = () => {
  const [searchType, setSearchType] = useState<string>('all');

  const handleSearchTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newSearchType: string | null
  ) => {
    if (newSearchType !== null) {
      setSearchType(newSearchType);
    }
  };

  const searchCategories = [
    {
      id: 'checklists',
      title: 'Checklists',
      description: 'Search ESG compliance checklists and templates',
      icon: <Assignment />,
      count: 45,
    },
    {
      id: 'uploads',
      title: 'Documents',
      description: 'Find uploaded documents and attachments',
      icon: <Description />,
      count: 123,
    },
    {
      id: 'submissions',
      title: 'Submissions',
      description: 'Search completed submissions and assessments',
      icon: <Analytics />,
      count: 78,
    },
    {
      id: 'users',
      title: 'Users',
      description: 'Find team members and user profiles',
      icon: <People />,
      count: 12,
    },
  ];

  const recentSearches = [
    'ESG compliance framework',
    'Carbon emissions report',
    'Sustainability metrics',
    'Environmental audit',
    'Social impact assessment',
  ];

  const searchTips = [
    {
      icon: '🎯',
      title: 'Advanced Search',
      description: 'Use quotes for exact phrases: "carbon footprint"',
    },
    {
      icon: '🔍',
      title: 'Wildcards',
      description: 'Use * for partial matches: sustain* finds sustainability',
    },
    {
      icon: '📊',
      title: 'Filters',
      description: 'Use filters to narrow down results by type or date',
    },
    {
      icon: '🏷️',
      title: 'Tags',
      description: 'Search by tags: #environment #social #governance',
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          🔍 Global Search
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Search across all your ESG data, documents, and team members
        </Typography>

        {/* Enhanced Search Bar */}
        <Box sx={{ maxWidth: 600, mx: 'auto', mb: 3 }}>
          <GlobalSearch />
        </Box>

        {/* Search Type Toggle */}
        <ToggleButtonGroup
          value={searchType}
          exclusive
          onChange={handleSearchTypeChange}
          aria-label="search type"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="all" aria-label="all content">
            All Content
          </ToggleButton>
          <ToggleButton value="checklists" aria-label="checklists">
            Checklists
          </ToggleButton>
          <ToggleButton value="documents" aria-label="documents">
            Documents
          </ToggleButton>
          <ToggleButton value="analytics" aria-label="analytics">
            Analytics
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Search Categories */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight="semibold" sx={{ mb: 3 }}>
          Search Categories
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 3,
            justifyContent: 'center',
          }}
        >
          {searchCategories.map(category => (
            <Card
              key={category.id}
              sx={{
                minWidth: 250,
                maxWidth: 300,
                flex: '1 1 calc(25% - 24px)',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                  '& .category-icon': {
                    color: 'primary.main',
                    transform: 'scale(1.1)',
                  },
                },
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Box
                  className="category-icon"
                  sx={{
                    color: 'text.secondary',
                    transition: 'all 0.2s ease-in-out',
                    mb: 2,
                  }}
                >
                  {React.cloneElement(category.icon, { fontSize: 'large' })}
                </Box>
                <Typography variant="h6" gutterBottom fontWeight="semibold">
                  {category.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {category.description}
                </Typography>
                <Chip
                  label={`${category.count} items`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* Recent Searches */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight="semibold" sx={{ mb: 2 }}>
          Recent Searches
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {recentSearches.map((search, index) => (
              <Chip
                key={index}
                label={search}
                variant="outlined"
                clickable
                sx={{
                  '&:hover': {
                    backgroundColor: 'primary.light',
                    color: 'primary.contrastText',
                  },
                }}
              />
            ))}
          </Box>
        </Paper>
      </Box>

      {/* Search Tips */}
      <Box>
        <Typography variant="h5" gutterBottom fontWeight="semibold" sx={{ mb: 2 }}>
          Search Tips
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 3,
            }}
          >
            {searchTips.map((tip, index) => (
              <Box
                key={index}
                sx={{
                  flex: '1 1 calc(50% - 12px)',
                  minWidth: 250,
                }}
              >
                <Typography variant="subtitle2" gutterBottom color="primary">
                  {tip.icon} {tip.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tip.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Search;
