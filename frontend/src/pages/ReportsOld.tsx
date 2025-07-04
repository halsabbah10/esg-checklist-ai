import { Box, Typography, Card, CardContent, Alert } from '@mui/material';

export const Reports = () => {
  return (
    <Box p={3}>
      <Typography variant="h4" component="h1" gutterBottom>
        ESG Reports
      </Typography>
      
      <Card>
        <CardContent>
          <Alert severity="info">
            The Reports page is under development. This will show and allow generation of ESG compliance reports.
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};
