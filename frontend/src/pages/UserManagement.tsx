import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Edit, Delete, PersonAdd, Download } from '@mui/icons-material';
import { adminAPI, exportAPI } from '../services/api';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export const UserManagement: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState('');

  const queryClient = useQueryClient();

  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminAPI.getAllUsers(),
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminAPI.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setEditDialogOpen(false);
      setSelectedUser(null);
    },
  });

  // Export users mutation
  const exportMutation = useMutation({
    mutationFn: (format: 'csv' | 'xlsx') => exportAPI.exportUsers(format),
    onSuccess: (response, format) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
  });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setEditDialogOpen(true);
  };

  const handleUpdateRole = () => {
    if (selectedUser && newRole) {
      updateRoleMutation.mutate({ userId: selectedUser.id, role: newRole });
    }
  };

  const handleExport = (format: 'csv' | 'xlsx') => {
    exportMutation.mutate(format);
  };

  const getUserList = users?.data || [];
  const paginatedUsers = getUserList.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getRoleColor = (role: string): 'error' | 'warning' | 'info' | 'default' => {
    switch (role) {
      case 'super_admin':
        return 'error';
      case 'admin':
        return 'warning';
      case 'reviewer':
        return 'info';
      default:
        return 'default';
    }
  };

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
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={600} gutterBottom>
            User Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage user accounts, roles, and permissions
          </Typography>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          gap: { xs: 1, sm: 2 },
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
        }}>
          <Button 
            variant="outlined" 
            startIcon={<Download />} 
            onClick={() => handleExport('csv')}
            sx={{
              minHeight: 44,
              fontSize: { xs: '0.875rem', sm: '0.875rem' },
              px: { xs: 2, sm: 3 },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Export 
            </Box>
            CSV
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<Download />} 
            onClick={() => handleExport('xlsx')}
            sx={{
              minHeight: 44,
              fontSize: { xs: '0.875rem', sm: '0.875rem' },
              px: { xs: 2, sm: 3 },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Export 
            </Box>
            Excel
          </Button>
          <Button 
            variant="contained" 
            startIcon={<PersonAdd />}
            sx={{
              minHeight: 44,
              fontSize: { xs: '0.875rem', sm: '0.875rem' },
              px: { xs: 2, sm: 3 },
              fontWeight: 'medium',
            }}
          >
            Add User
          </Button>
        </Box>
      </Box>

      <Card elevation={2}>
        <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
          <TableContainer sx={{ 
            overflowX: 'auto',
            maxWidth: '100%',
            '&::-webkit-scrollbar': {
              height: 8,
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'grey.200',
              borderRadius: 4,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'grey.400',
              borderRadius: 4,
              '&:hover': {
                backgroundColor: 'grey.600',
              },
            },
          }}>
            <Table sx={{ minWidth: { xs: 650, sm: 750 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ 
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    minWidth: 120,
                  }}>
                    Name
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    minWidth: 200,
                    display: { xs: 'none', sm: 'table-cell' },
                  }}>
                    Email
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    minWidth: 100,
                  }}>
                    Role
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    minWidth: 80,
                    display: { xs: 'none', md: 'table-cell' },
                  }}>
                    Status
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    minWidth: 120,
                    display: { xs: 'none', lg: 'table-cell' },
                  }}>
                    Last Login
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    minWidth: 120,
                    textAlign: 'center',
                  }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedUsers.map((user: User) => (
                  <TableRow key={user.id} hover sx={{ 
                    '&:hover': { 
                      backgroundColor: 'action.hover',
                    },
                  }}>
                    <TableCell sx={{ 
                      maxWidth: { xs: 120, sm: 200 },
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {user.full_name}
                        </Typography>
                        {/* Show email on mobile when hidden column */}
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ display: { xs: 'block', sm: 'none' } }}
                        >
                          {user.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ 
                      display: { xs: 'none', sm: 'table-cell' },
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role.replace('_', ' ').toUpperCase()}
                        color={getRoleColor(user.role)}
                        size="small"
                        sx={{ 
                          fontSize: { xs: '0.65rem', sm: '0.75rem' },
                          height: { xs: 24, sm: 'auto' },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Chip
                        label={user.is_active ? 'Active' : 'Inactive'}
                        color={user.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditUser(user)} 
                          color="primary"
                          sx={{ 
                            minWidth: 44,
                            minHeight: 44,
                            '&:hover': {
                              transform: 'scale(1.1)',
                              backgroundColor: 'primary.light',
                            },
                            transition: 'all 0.2s ease-in-out',
                          }}
                          aria-label={`Edit ${user.full_name}`}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          sx={{ 
                            minWidth: 44,
                            minHeight: 44,
                            '&:hover': {
                              transform: 'scale(1.1)',
                              backgroundColor: 'error.light',
                            },
                            transition: 'all 0.2s ease-in-out',
                          }}
                          aria-label={`Delete ${user.full_name}`}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
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
            count={getUserList.length}
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

      {/* Edit Role Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit User Role</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ pt: 2 }}>
              <TextField
                label="User Name"
                value={selectedUser.full_name}
                disabled
                fullWidth
                sx={{ mb: 3 }}
              />
              <TextField
                label="Email"
                value={selectedUser.email}
                disabled
                fullWidth
                sx={{ mb: 3 }}
              />
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select value={newRole} label="Role" onChange={e => setNewRole(e.target.value)}>
                  <MenuItem value="auditor">Auditor</MenuItem>
                  <MenuItem value="reviewer">Reviewer</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="super_admin">Super Admin</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpdateRole}
            variant="contained"
            disabled={updateRoleMutation.isPending}
          >
            {updateRoleMutation.isPending ? 'Updating...' : 'Update Role'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error/Success Messages */}
      {updateRoleMutation.isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to update user role. Please try again.
        </Alert>
      )}
      {updateRoleMutation.isSuccess && (
        <Alert severity="success" sx={{ mt: 2 }}>
          User role updated successfully!
        </Alert>
      )}
    </Container>
  );
};
