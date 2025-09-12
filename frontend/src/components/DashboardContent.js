import React, { useEffect, useState } from "react";
import { apiUrl } from "./LoginSignup";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  useTheme,
  createTheme,
  ThemeProvider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import LineChart from "../components/LineChart";
import Loader from "./Loader";

const userSession = JSON.parse(localStorage.getItem("userSession"));

const DashboardContent = () => {
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(Array(12).fill(0)); // Array to store revenue of each month
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // Set default to current month
  const [totalUsers, setTotalUsers] = useState(0);
  const [recentBookings, setRecentBookings] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const appTheme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      primary: { main: darkMode ? "#90caf9" : "#1976d2" },
      secondary: { main: darkMode ? "#f48fb1" : "#d32f2f" },
    },
  });

  const getTodayDate = () => new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (userSession?.user_id) {
      fetchDashboardData(userSession);
    } else {
      console.error("User session not found.");
      setLoading(false);
    }
  }, []);

  const fetchDashboardData = async (session) => {
    try {
      const isAdmin = ["admin", "dev", "senior admin", "srdev"].includes(session.user_role);
      const bookingUrl = isAdmin
        ? `${apiUrl}/booking/all`
        : `${apiUrl}/user/bookings/${session.user_id}`;

      const [bookingsRes, usersRes] = await Promise.all([
        fetch(bookingUrl, {
          headers: {
            "Content-Type": "application/json",
            authorization: session.token,
          },
        }),
        fetch(`${apiUrl}/user/all`, {
          headers: {
            "Content-Type": "application/json",
            authorization: session.token,
          },
        }),
      ]);

      if (!bookingsRes.ok || !usersRes.ok) throw new Error("Failed API call");

      const bookingsData = await bookingsRes.json();
      const usersData = await usersRes.json();

      const bookings = bookingsData.Allbookings || bookingsData;
      const today = getTodayDate();
      const currentYear = new Date().getFullYear();

      let bookingCount = 0;
      let currentYearRevenue = 0;
      let monthlyRevenueData = Array(12).fill(0); // Reset the monthly revenue data

      const sortedBookings = [];

      for (const booking of bookings) {
        bookingCount++;

        // Get payment date from a single field 'payment_date'
        const paymentDate = new Date(booking.payment_date);

        // Check if the payment date is in the current year
        if (paymentDate.getFullYear() === currentYear) {
          const month = paymentDate.getMonth(); // Month is 0-based
          const revenue = (booking.term_1 || 0) + (booking.term_2 || 0) + (booking.term_3 || 0);
          monthlyRevenueData[month] += revenue; // Add revenue to the correct month
          currentYearRevenue += revenue;
        }

        sortedBookings.push(booking);
      }

      const recent = sortedBookings
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 7);

      setTotalBookings(bookingCount);
      setTotalRevenue(currentYearRevenue);
      setMonthlyRevenue(monthlyRevenueData); // Set the monthly revenue data
      setRecentBookings(recent);
      setTotalUsers(usersData.Users?.length || 0);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value); // Update selected month
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <Loader />
      </div>
    );
  }

  return (
    <ThemeProvider theme={appTheme}>
      <Box sx={{ p: 2 }}>
        {/* Theme Toggle */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Typography variant="body1" sx={{ mr: 1 }}>
            {darkMode ? "Dark Mode" : "Light Mode"}
          </Typography>
          <Switch
            checked={darkMode}
            onChange={toggleDarkMode}
            inputProps={{ "aria-label": "theme toggle" }}
          />
          <IconButton onClick={toggleDarkMode} color="inherit">
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Box>

        {/* Stats */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Bookings</Typography>
                <Typography variant="h4">{totalBookings}</Typography>
                <Typography>Your Total Bookings</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">Total Users</Typography>
                <Typography variant="h4">{totalUsers}</Typography>
                <Typography>CRM users this month</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6">
                  Revenue {new Date().toLocaleString("default", { month: "long" })}
                </Typography>
                <Typography variant="h4">{totalRevenue.toLocaleString()} INR</Typography>
                <Typography>Total Revenue</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Month Select Dropdown */}
        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <InputLabel>Month</InputLabel>
              <Select
                value={selectedMonth}
                onChange={handleMonthChange}
                label="Month"
              >
                {Array.from({ length: 12 }, (_, index) => (
                  <MenuItem value={index} key={index}>
                    {new Date(0, index).toLocaleString("default", { month: "long" })}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Selected Month Revenue */}
        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6">Revenue for {new Date(0, selectedMonth).toLocaleString("default", { month: "long" })}</Typography>
                <Typography variant="h4">
                  {monthlyRevenue[selectedMonth].toLocaleString()} INR
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Monthly Revenue Chart */}
        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6">Monthly Revenue</Typography>
                <LineChart data={monthlyRevenue} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Recent Bookings */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6">Recent Bookings</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Company Name</TableCell>
                  <TableCell>BDM Name</TableCell>
                  <TableCell>Booking Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentBookings.map((booking) => (
                  <TableRow key={booking._id}>
                    <TableCell>{booking.company_name}</TableCell>
                    <TableCell>{booking.bdm}</TableCell>
                    <TableCell>
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default DashboardContent;
