import React, { useState, useCallback } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList,
  Clear,
  Description,
  Analytics,
  Assignment,
  People,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { searchAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from './LoadingSpinner';

interface SearchResult {
  id: string;
  type: 'checklist' | 'upload' | 'submission' | 'user';
  title: string;
  description?: string;
  score?: number;
  category?: string;
  created_at?: string;
}

export const GlobalSearch: React.FC = React.memo(() => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', query, filters],
    queryFn: () =>
      searchAPI.globalSearch({
        q: query,
        types: filters.length > 0 ? filters : undefined,
        limit: 10,
      }),
    enabled: query.length >= 2,
    select: response => response.data,
  });

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setShowResults(value.length >= 2);
  }, []);

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const toggleFilter = (filter: string) => {
    setFilters(prev =>
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
    handleFilterClose();
  };

  const clearFilters = () => {
    setFilters([]);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'checklist':
        return <Assignment />;
      case 'upload':
        return <Description />;
      case 'submission':
        return <Analytics />;
      case 'user':
        return <People />;
      default:
        return <Description />;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'checklist':
        navigate(`/checklists/${result.id}`);
        break;
      case 'upload':
        navigate(`/uploads/${result.id}`);
        break;
      case 'submission':
        navigate(`/submissions/${result.id}`);
        break;
      case 'user':
        navigate(`/users/${result.id}`);
        break;
    }
    setShowResults(false);
    setQuery('');
  };

  const filterOptions = [
    { value: 'checklist', label: 'Checklists' },
    { value: 'upload', label: 'Uploads' },
    { value: 'submission', label: 'Submissions' },
    { value: 'user', label: 'Users' },
  ];

  return (
    <Box sx={{ position: 'relative', maxWidth: 400 }}>
      <TextField
        fullWidth
        placeholder="Search checklists, uploads, users..."
        value={query}
        onChange={e => handleSearch(e.target.value)}
        onFocus={() => setShowResults(query.length >= 2)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={handleFilterClick} size="small">
                <FilterList />
              </IconButton>
              {query && (
                <IconButton
                  onClick={() => {
                    setQuery('');
                    setShowResults(false);
                  }}
                  size="small"
                >
                  <Clear />
                </IconButton>
              )}
            </InputAdornment>
          ),
        }}
        sx={{ mb: 1 }}
      />

      {/* Active Filters */}
      {filters.length > 0 && (
        <Box sx={{ mb: 1 }}>
          {filters.map(filter => (
            <Chip
              key={filter}
              label={filterOptions.find(f => f.value === filter)?.label || filter}
              onDelete={() => toggleFilter(filter)}
              size="small"
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          ))}
          <Chip
            label="Clear all"
            onClick={clearFilters}
            size="small"
            variant="outlined"
            sx={{ mr: 0.5, mb: 0.5 }}
          />
        </Box>
      )}

      {/* Filter Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleFilterClose}>
        {filterOptions.map(option => (
          <MenuItem
            key={option.value}
            onClick={() => toggleFilter(option.value)}
            selected={filters.includes(option.value)}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>

      {/* Search Results */}
      {showResults && (
        <Paper
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: 400,
            overflow: 'auto',
            mt: 1,
          }}
        >
          {isLoading ? (
            <Box p={2}>
              <LoadingSpinner size={24} message="Searching..." />
            </Box>
          ) : results && results.length > 0 ? (
            <List>
              {results.map((result: SearchResult) => (
                <React.Fragment key={result.id}>
                  <ListItem
                    onClick={() => handleResultClick(result)}
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }}
                  >
                    <ListItemIcon>{getResultIcon(result.type)}</ListItemIcon>
                    <ListItemText
                      primary={result.title}
                      secondary={
                        <Box>
                          <Typography variant="caption" color="primary">
                            {result.type.toUpperCase()}
                          </Typography>
                          {result.description && (
                            <Typography variant="body2" color="text.secondary">
                              {result.description.length > 100
                                ? `${result.description.substring(0, 100)}...`
                                : result.description}
                            </Typography>
                          )}
                          {result.score && (
                            <Typography variant="caption" color="success.main">
                              Score: {result.score}%
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          ) : query.length >= 2 ? (
            <Box p={2}>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                No results found for "{query}"
              </Typography>
            </Box>
          ) : null}
        </Paper>
      )}
    </Box>
  );
});

GlobalSearch.displayName = 'GlobalSearch';

export default GlobalSearch;
