import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Download,
  Upload,
  Assignment,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { adminAPI, exportAPI } from '../services/api';

interface Checklist {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
  items_count: number;
  submissions_count: number;
}

type ChecklistData = Omit<
  Checklist,
  'id' | 'created_at' | 'updated_at' | 'items_count' | 'submissions_count'
>;

interface ChecklistItem {
  id: string;
  question: string;
  type: 'text' | 'boolean' | 'number' | 'select' | 'file';
  options?: string[];
  required: boolean;
  weight: number;
  category: string;
}

export const ChecklistManagement: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [tabValue, setTabValue] = useState(0);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [itemsDialogOpen, setItemsDialogOpen] = useState(false);
  const [newChecklist, setNewChecklist] = useState<ChecklistData>({
    title: '',
    description: '',
    category: '',
    status: 'draft',
  });

  const queryClient = useQueryClient();

  // Fetch checklists
  const { data: checklists, isLoading } = useQuery({
    queryKey: ['admin', 'checklists'],
    queryFn: () => adminAPI.getAllChecklists(),
  });

  // Fetch checklist items when a checklist is selected
  const { data: checklistItems } = useQuery({
    queryKey: ['admin', 'checklist-items', selectedChecklist?.id],
    queryFn: () => (selectedChecklist ? adminAPI.getChecklistItems(selectedChecklist.id) : null),
    enabled: !!selectedChecklist,
  });

  // Fetch checklist stats
  const { data: stats } = useQuery({
    queryKey: ['admin', 'checklist-stats'],
    queryFn: () => adminAPI.getChecklistStats(),
  });

  // Create checklist mutation
  const createMutation = useMutation({
    mutationFn: (data: ChecklistData) => adminAPI.createChecklist(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'checklists'] });
      setCreateDialogOpen(false);
      setNewChecklist({ title: '', description: '', category: '', status: 'draft' });
    },
  });

  // Update checklist mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ChecklistData> }) =>
      adminAPI.updateChecklist(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'checklists'] });
      setEditDialogOpen(false);
      setSelectedChecklist(null);
    },
  });

  // Delete checklist mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminAPI.deleteChecklist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'checklists'] });
    },
  });

  const handleCreateChecklist = () => {
    createMutation.mutate(newChecklist);
  };

  const handleUpdateChecklist = () => {
    if (selectedChecklist) {
      updateMutation.mutate({
        id: selectedChecklist.id,
        data: selectedChecklist,
      });
    }
  };

  const handleEditChecklist = (checklist: Checklist) => {
    setSelectedChecklist(checklist);
    setEditDialogOpen(true);
  };

  const handleDeleteChecklist = (id: string) => {
    if (window.confirm('Are you sure you want to delete this checklist?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleViewItems = (checklist: Checklist) => {
    setSelectedChecklist(checklist);
    setItemsDialogOpen(true);
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'default' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle color="success" />;
      case 'draft':
        return <Warning color="warning" />;
      case 'archived':
        return <ErrorIcon color="disabled" />;
      default:
        return <ErrorIcon />;
    }
  };

  const checklistData = checklists?.data || [];
  const paginatedChecklists = checklistData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
  const statsData = stats?.data || {};

  const ChecklistsTab = () => (
    <Box>
      {/* Statistics Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr 1fr' },
          gap: 3,
          mb: 4,
        }}
      >
        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight={600} color="primary.main">
                  {statsData.total_checklists || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Checklists
                </Typography>
              </Box>
              <Assignment color="primary" fontSize="large" />
            </Box>
          </CardContent>
        </Card>

        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight={600} color="success.main">
                  {statsData.active_checklists || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Checklists
                </Typography>
              </Box>
              <CheckCircle color="success" fontSize="large" />
            </Box>
          </CardContent>
        </Card>

        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight={600} color="warning.main">
                  {statsData.draft_checklists || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Draft Checklists
                </Typography>
              </Box>
              <Warning color="warning" fontSize="large" />
            </Box>
          </CardContent>
        </Card>

        <Card elevation={2}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight={600} color="info.main">
                  {statsData.total_submissions || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Submissions
                </Typography>
              </Box>
              <Upload color="info" fontSize="large" />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Manage Checklists</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => exportAPI.exportChecklists('xlsx')}
          >
            Export
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
            Create Checklist
          </Button>
        </Box>
      </Box>

      {/* Checklists Table */}
      <Card elevation={2}>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Items</TableCell>
                  <TableCell>Submissions</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedChecklists.map((checklist: Checklist) => (
                  <TableRow key={checklist.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {checklist.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {checklist.description?.substring(0, 60)}
                          {checklist.description?.length > 60 ? '...' : ''}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={checklist.category} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getStatusIcon(checklist.status)}
                        <Chip
                          label={checklist.status.toUpperCase()}
                          color={getStatusColor(checklist.status)}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>{checklist.items_count || 0}</TableCell>
                    <TableCell>{checklist.submissions_count || 0}</TableCell>
                    <TableCell>{new Date(checklist.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="View Items">
                          <IconButton
                            size="small"
                            onClick={() => handleViewItems(checklist)}
                            color="info"
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEditChecklist(checklist)}
                            color="primary"
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteChecklist(checklist.id)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={checklistData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={event => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        </CardContent>
      </Card>
    </Box>
  );

  if (isLoading) {
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
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
          Checklist Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Create, edit, and manage ESG compliance checklists
        </Typography>
      </Box>

      <Paper elevation={1}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Checklists" />
          <Tab label="Templates" />
          <Tab label="Analytics" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tabValue === 0 && <ChecklistsTab />}
          {tabValue === 1 && <Alert severity="info">Template management feature coming soon</Alert>}
          {tabValue === 2 && <Alert severity="info">Checklist analytics feature coming soon</Alert>}
        </Box>
      </Paper>

      {/* Create Checklist Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Checklist</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Title"
              value={newChecklist.title}
              onChange={e => setNewChecklist({ ...newChecklist, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={newChecklist.description}
              onChange={e => setNewChecklist({ ...newChecklist, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              label="Category"
              value={newChecklist.category}
              onChange={e => setNewChecklist({ ...newChecklist, category: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={newChecklist.status}
                label="Status"
                onChange={e =>
                  setNewChecklist({
                    ...newChecklist,
                    status: e.target.value as 'draft' | 'active' | 'archived',
                  })
                }
              >
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateChecklist}
            variant="contained"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Checklist Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Checklist</DialogTitle>
        <DialogContent>
          {selectedChecklist && (
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Title"
                value={selectedChecklist.title}
                onChange={e =>
                  setSelectedChecklist({ ...selectedChecklist, title: e.target.value })
                }
                fullWidth
                required
              />
              <TextField
                label="Description"
                value={selectedChecklist.description}
                onChange={e =>
                  setSelectedChecklist({ ...selectedChecklist, description: e.target.value })
                }
                fullWidth
                multiline
                rows={3}
              />
              <TextField
                label="Category"
                value={selectedChecklist.category}
                onChange={e =>
                  setSelectedChecklist({ ...selectedChecklist, category: e.target.value })
                }
                fullWidth
                required
              />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={selectedChecklist.status}
                  label="Status"
                  onChange={e =>
                    setSelectedChecklist({
                      ...selectedChecklist,
                      status: e.target.value as 'draft' | 'active' | 'archived',
                    })
                  }
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpdateChecklist}
            variant="contained"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Checklist Items Dialog */}
      <Dialog
        open={itemsDialogOpen}
        onClose={() => setItemsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Checklist Items: {selectedChecklist?.title}</DialogTitle>
        <DialogContent>
          {checklistItems?.data && checklistItems.data.length > 0 ? (
            <TableContainer sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Question</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Required</TableCell>
                    <TableCell>Weight</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {checklistItems.data.map((item: ChecklistItem) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.question}</TableCell>
                      <TableCell>
                        <Chip label={item.type} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.required ? 'Yes' : 'No'}
                          color={item.required ? 'error' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{item.weight}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              No items found for this checklist
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
