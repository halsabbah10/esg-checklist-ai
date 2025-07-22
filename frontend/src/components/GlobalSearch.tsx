import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();

  // Debounce search query for performance optimization
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery, filters],
    queryFn: () =>
      searchAPI.globalSearch({
        q: debouncedQuery,
        types: filters.length > 0 ? filters : undefined,
        limit: 10,
      }),
    enabled: debouncedQuery.length >= 2,
    select: response => response.data,
    staleTime: 5 * 60 * 1000, // Cache results for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in garbage collection for 10 minutes
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
    <Box sx={{ position: 'relative', width: '100%' }}>
      <TextField
        fullWidth
        placeholder="Search checklists, uploads, users..."
        value={query}
        onChange={e => handleSearch(e.target.value)}
        onFocus={() => setShowResults(query.length >= 2)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={handleFilterClick} size="small">
                <FilterList sx={{ color: 'text.secondary' }} />
              </IconButton>
              {query && (
                <IconButton
                  onClick={() => {
                    setQuery('');
                    setShowResults(false);
                  }}
                  size="small"
                >
                  <Clear sx={{ color: 'text.secondary' }} />
                </IconButton>
              )}
            </InputAdornment>
          ),
        }}
        sx={(theme) => ({ 
          mb: 0,
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'background.paper',
            color: theme.palette.text.primary,
            '& fieldset': {
              borderColor: 'divider',
            },
            '&:hover fieldset': {
              borderColor: 'text.secondary',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'primary.main',
            },
          },
          '& .MuiOutlinedInput-input': {
            color: `${theme.palette.text.primary} !important`,
            caretColor: `${theme.palette.text.primary} !important`,
            '&::placeholder': {
              color: `${theme.palette.text.secondary} !important`,
              opacity: '1 !important',
            },
            '&:focus': {
              color: `${theme.palette.text.primary} !important`,
              caretColor: `${theme.palette.text.primary} !important`,
            },
          },
          '& input': {
            color: `${theme.palette.text.primary} !important`,
            caretColor: `${theme.palette.text.primary} !important`,
          },
        })}
      />

      {/* Active Filters */}
      {filters.length > 0 && (
        <Box sx={{ 
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          mt: 0.5,
          mb: 0,
          zIndex: 1000,
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          p: 1,
          boxShadow: 1
        }}>
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
      <Menu 
        anchorEl={anchorEl} 
        open={Boolean(anchorEl)} 
        onClose={handleFilterClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 200,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              boxShadow: (theme) => theme.shadows[8],
            }
          }
        }}
      >
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
          ) : debouncedQuery.length >= 2 ? (
            <Box p={2}>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                No results found for "{debouncedQuery}"
              </Typography>
            </Box>
          ) : query.length >= 2 && query !== debouncedQuery ? (
            <Box p={2}>
              <LoadingSpinner size={24} message="Searching..." />
            </Box>
          ) : null}
        </Paper>
      )}
    </Box>
  );
});

GlobalSearch.displayName = 'GlobalSearch';

export default GlobalSearch;
