import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
  Drawer,
  Divider,
  Stack,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Add,
  PlayArrow,
  Visibility,
  Edit,
  Upload,
  MoreVert,
  FilterList,
  Clear,
  Close,
} from '@mui/icons-material';
import { checklistsAPI } from '../services/api';

interface Checklist {
  id: number;
  title: string;
  description: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  items?: Array<{
    id: number;
    question_text: string;
    weight?: number;
    category?: string;
    is_required?: boolean;
  }>;
  status?: 'active' | 'inactive' | 'draft';
  category?: string;
  last_run?: string;
  completion_rate?: number;
}

interface ProcessedChecklist extends Checklist {
  status: 'active' | 'inactive' | 'draft';
  category: string;
  completion_rate: number;
  last_run?: string;
}

type SortDirection = 'asc' | 'desc';
type SortKey = 'title' | 'updated_at' | 'status' | 'category' | 'completion_rate';

interface FilterState {
  status: string;
  category: string;
}

export const Checklists = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState<FilterState>({ status: 'all', category: 'all' });
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);

  const {
    data: checklists = [] as Checklist[],
    isLoading,
    error,
    refetch,
  } = useQuery<Checklist[]>({
    queryKey: ['checklists'],
    queryFn: () => checklistsAPI.getAll().then((res: { data: Checklist[] }) => res.data),
  });

  // Transform and filter data
  const processedChecklists = useMemo(() => {
    let filtered: ProcessedChecklist[] = checklists.map(
      (checklist: Checklist): ProcessedChecklist => ({
        ...checklist,
        status: checklist.is_active ? 'active' : 'inactive',
        category: checklist.category || 'General',
        completion_rate: Math.floor(Math.random() * 100), // Mock data
        last_run: checklist.updated_at,
      })
    );

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (checklist: ProcessedChecklist) =>
          checklist.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          checklist.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          checklist.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(
        (checklist: ProcessedChecklist) => checklist.status === filters.status
      );
    }

    // Apply category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(
        (checklist: ProcessedChecklist) => checklist.category === filters.category
      );
    }

    // Apply sorting
    filtered.sort((a: ProcessedChecklist, b: ProcessedChecklist) => {
      let aValue, bValue;

      switch (sortKey) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at || 0).getTime();
          bValue = new Date(b.updated_at || 0).getTime();
          break;
        case 'status':
          aValue = a.status || 'inactive';
          bValue = b.status || 'inactive';
          break;
        case 'category':
          aValue = a.category || 'General';
          bValue = b.category || 'General';
          break;
        case 'completion_rate':
          aValue = a.completion_rate || 0;
          bValue = b.completion_rate || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [checklists, searchTerm, filters, sortKey, sortDirection]);

  const categories = useMemo(() => {
    const cats = new Set(checklists.map((c: Checklist) => c.category || 'General'));
    return Array.from(cats) as string[];
  }, [checklists]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.category !== 'all') count++;
    return count;
  }, [filters]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (filterType: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const clearFilters = () => {
    setFilters({ status: 'all', category: 'all' });
    setSearchTerm('');
  };

  const handleRowClick = (checklist: Checklist) => {
    setSelectedChecklist(checklist);
    setDetailDrawerOpen(true);
  };

  const handleActionClick = (event: React.MouseEvent<HTMLButtonElement>, checklistId: number) => {
    event.stopPropagation();
    setActionMenuAnchor(event.currentTarget);
    setSelectedRow(checklistId);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          Failed to load checklists. Please try again later.
        </Alert>
      </Box>
    );
  }

  const getStatusBadge = (status: string) => {
    const color: 'success' | 'warning' | 'default' =
      status === 'active' ? 'success' : status === 'draft' ? 'warning' : 'default';
    return (
      <Chip
        label={status.charAt(0).toUpperCase() + status.slice(1)}
        size="small"
        color={color}
        sx={{
          minWidth: 72,
          '& .MuiChip-label': { px: 1, fontWeight: 500 },
        }}
      />
    );
  };

  const getCategoryBadge = (category: string) => (
    <Chip
      label={category}
      size="small"
      variant="outlined"
      sx={{
        bgcolor: 'background.paper',
        color: 'primary.main',
        borderColor: 'primary.main',
        '& .MuiChip-label': { px: 1.5, fontSize: 12 },
      }}
    />
  );

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
          ESG Checklists
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/checklists/new')}
          sx={{
            bgcolor: 'primary.main',
            '&:hover': { bgcolor: 'primary.dark' },
            borderRadius: '0.25rem',
            px: 2,
            py: 1,
          }}
        >
          New Checklist
        </Button>
      </Box>

      {/* Filter Bar */}
      <Box
        display="flex"
        flexWrap="wrap"
        gap={2}
        mb={3}
        p={2}
        sx={{
          bgcolor: 'background.paper',
          borderRadius: '0.25rem',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* Search Input */}
        <TextField
          placeholder="Search by title or ID"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          size="small"
          sx={{
            width: { xs: '100%', sm: 300 },
            '& .MuiOutlinedInput-root': {
              borderRadius: '0.25rem',
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'text.secondary', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />

        {/* Status Filter */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filters.status}
            label="Status"
            onChange={e => handleFilterChange('status', e.target.value)}
            sx={{ borderRadius: '0.25rem' }}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="draft">Draft</MenuItem>
          </Select>
        </FormControl>

        {/* Category Filter */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={filters.category}
            label="Category"
            onChange={e => handleFilterChange('category', e.target.value)}
            sx={{ borderRadius: '0.25rem' }}
          >
            <MenuItem value="all">All Categories</MenuItem>
            {categories.map((cat: string) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Filter Actions */}
        <Box display="flex" alignItems="center" gap={1} ml="auto">
          {activeFilterCount > 0 && (
            <Badge badgeContent={activeFilterCount} color="primary">
              <Tooltip title="Active filters">
                <IconButton size="small">
                  <FilterList />
                </IconButton>
              </Tooltip>
            </Badge>
          )}
          {(searchTerm || activeFilterCount > 0) && (
            <Button
              size="small"
              onClick={clearFilters}
              startIcon={<Clear />}
              sx={{ color: 'text.secondary' }}
            >
              Clear
            </Button>
          )}
        </Box>
      </Box>

      {/* Data Table */}
      <Paper sx={{ borderRadius: '0.25rem', border: '1px solid', borderColor: 'divider' }}>
        <TableContainer>
          <Table sx={{ '& .MuiTableCell-root': { fontSize: 14 } }}>
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                  <TableSortLabel
                    active={sortKey === 'title'}
                    direction={sortKey === 'title' ? sortDirection : 'asc'}
                    onClick={() => handleSort('title')}
                  >
                    ID / Title
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                  <TableSortLabel
                    active={sortKey === 'category'}
                    direction={sortKey === 'category' ? sortDirection : 'asc'}
                    onClick={() => handleSort('category')}
                  >
                    Category
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                  <TableSortLabel
                    active={sortKey === 'status'}
                    direction={sortKey === 'status' ? sortDirection : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>
                  <TableSortLabel
                    active={sortKey === 'updated_at'}
                    direction={sortKey === 'updated_at' ? sortDirection : 'asc'}
                    onClick={() => handleSort('updated_at')}
                  >
                    Last Updated
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.primary', width: 80 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {processedChecklists.map((checklist: ProcessedChecklist, index: number) => (
                <TableRow
                  key={checklist.id}
                  hover
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'grey.50',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    },
                    bgcolor: index % 2 === 0 ? 'background.paper' : 'grey.50',
                  }}
                  onClick={() => handleRowClick(checklist)}
                >
                  <TableCell>
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          color: 'primary.main',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        #{checklist.id} {checklist.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.5 }}
                      >
                        {checklist.items?.length || 0} questions
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{getCategoryBadge(checklist.category || 'General')}</TableCell>
                  <TableCell>{getStatusBadge(checklist.status || 'inactive')}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {checklist.updated_at
                        ? new Date(checklist.updated_at).toLocaleDateString()
                        : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={e => handleActionClick(e, checklist.id)}
                      sx={{
                        color: 'text.secondary',
                        '&:hover': {
                          color: 'primary.main',
                          bgcolor: 'primary.50',
                        },
                      }}
                    >
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {processedChecklists.length === 0 && (
          <Box py={8} textAlign="center">
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No checklists found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {searchTerm || activeFilterCount > 0
                ? 'Try adjusting your search criteria'
                : 'Create your first checklist to get started'}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/checklists/new')}
            >
              Create Checklist
            </Button>
          </Box>
        )}
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem
          onClick={() => {
            if (selectedRow) navigate(`/checklists/${selectedRow}`);
            setActionMenuAnchor(null);
          }}
        >
          <Visibility sx={{ mr: 1, fontSize: 18 }} />
          View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedRow) navigate(`/checklists/${selectedRow}/edit`);
            setActionMenuAnchor(null);
          }}
        >
          <Edit sx={{ mr: 1, fontSize: 18 }} />
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedRow) navigate(`/checklists/${selectedRow}/submit`);
            setActionMenuAnchor(null);
          }}
        >
          <PlayArrow sx={{ mr: 1, fontSize: 18 }} />
          Start Assessment
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedRow) navigate(`/checklists/${selectedRow}/upload`);
            setActionMenuAnchor(null);
          }}
        >
          <Upload sx={{ mr: 1, fontSize: 18 }} />
          Upload File
        </MenuItem>
      </Menu>

      {/* Detail Drawer */}
      <Drawer
        anchor="right"
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 400 },
            bgcolor: 'background.paper',
          },
        }}
        ModalProps={{
          keepMounted: false,
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Checklist Details
            </Typography>
            <IconButton onClick={() => setDetailDrawerOpen(false)}>
              <Close />
            </IconButton>
          </Box>

          {selectedChecklist && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Title
                </Typography>
                <Typography variant="body1">{selectedChecklist.title}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body2">{selectedChecklist.description}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Category
                </Typography>
                {getCategoryBadge(selectedChecklist.category || 'General')}
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Status
                </Typography>
                {getStatusBadge(selectedChecklist.status || 'inactive')}
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Questions
                </Typography>
                <Typography variant="body2">
                  {selectedChecklist.items?.length || 0} total questions
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Last Updated
                </Typography>
                <Typography variant="body2">
                  {selectedChecklist.updated_at
                    ? new Date(selectedChecklist.updated_at).toLocaleDateString()
                    : '-'}
                </Typography>
              </Box>

              <Divider />

              <Stack spacing={2}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<PlayArrow />}
                  onClick={() => {
                    navigate(`/checklists/${selectedChecklist.id}/submit`);
                    setDetailDrawerOpen(false);
                  }}
                >
                  Start Assessment
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Edit />}
                  onClick={() => {
                    navigate(`/checklists/${selectedChecklist.id}/edit`);
                    setDetailDrawerOpen(false);
                  }}
                >
                  Edit Checklist
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Upload />}
                  onClick={() => {
                    navigate(`/checklists/${selectedChecklist.id}/upload`);
                    setDetailDrawerOpen(false);
                  }}
                >
                  Upload File
                </Button>
              </Stack>
            </Stack>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};
