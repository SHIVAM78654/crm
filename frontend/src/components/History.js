import React, { useEffect, useState } from "react";
import "./History.css";
import AddBooking from "./EditBooking"; // Assuming you have the AddBooking component
import EditBooking from "./EditBooking"; // Import the EditBooking component
import Popup from "./Popup"; // Importing the Popup component
import DeleteConfirmationModal from "./DeleteConfirmationModal"; // Import the modal
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Checkbox,
  FormControlLabel,
  Button,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import servicesList from "../Data/ServicesData";
import Loader from "./Loader";
import { apiUrl } from "./LoginSignup";
import { jsonToCSV, downloadCSV } from "./exelData";

const History = () => {
  const [bookings, setBookings] = useState([]); // Initialize bookings as an empty array
  const [loading, setLoading] = useState(true);
  const [openDialogInfo, setOpenDialogInfo] = useState({ bookingIndex: null, updateIndex: null });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 100;

  // Handle view details click
  const handleViewDetailsClick = (bookingIndex, updateIndex) => {
    setOpenDialogInfo({ bookingIndex, updateIndex });
  };


  // Close modal
  const handleCloseModal = () => {
    setOpenDialogInfo({ bookingIndex: null, updateIndex: null });

  };

  //New Changes by Jitendra
  const [selectedFields, setSelectedFields] = useState({
    companyName: true,
    contactPersonName:true,
    bdmName: true,
    contactNo: true,
    email: true,
    bookingDate: true,
    paymentDate: true,
    totalPayment: true,
    receivedPayment: true,
    afterDisbursement: true,
    remark: true,
    services: true,
    gst: true, // Added GST checkbox
    state: true, // Added State checkbox
    pan: true, // Added PAN checkbox
    termType: true,
  });

  const [openPopupD, setOpenPopupD] = useState(false);

  //changes end
  const [searchInput, setSearchInput] = useState(""); // Single input field for both company name and booking ID
  const [debouncedSearchInput, setDebouncedSearchInput] = useState(searchInput);
  const [bdmSearch, setBdmSearch] = useState("");
  const [startDate, setStartDate] = useState(""); // Add startDate state
  const [endDate, setEndDate] = useState(""); // Add endDate state
  const [status, setStatus] = useState(""); // State for the status filter
  const [userRole, setUserRole] = useState("");
  const [userId, setUserId] = useState(""); // Store the logged-in user's ID
  const [isPopupOpen, setIsPopupOpen] = useState(false); // State to control popup visibility
  const [editBooking, setEditBooking] = useState(null); // State to hold the booking to be edited
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); // State for delete confirmation modal
  const [bookingToDelete, setBookingToDelete] = useState(null); // Track which booking to delete
  const [services, setService] = useState(""); //state for sevrvice filter
  const [paymentmode, setPaymentmode] = useState("");
  const [exelData, setexelData] = useState("");
  const userSession = JSON.parse(localStorage.getItem("userSession"));

  const [activeFilters, setActiveFilters] = useState({});
  const [downloadAll, setDownloadAll] = useState(false); // ✅ checkbox state
  const [dateType, setDateType] = useState("booking");
  useEffect(() => {
    if (userSession && userSession.user_id) {
      setUserRole(userSession.user_role); // Set user role
      setUserId(userSession.user_id); // Set user ID
      fetchAllBookings(userSession, {}, 1, limit);
      // Pass userSession to the function
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userSession && userSession.user_id) {
      fetchAllBookings(userSession, activeFilters, page, limit); // ✅ Use stored filters
    }
  }, [page]);


  // Debounce effect for searchInput
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchInput(searchInput);
    }, 900);

    return () => clearTimeout(handler);
  }, [searchInput]);

  // Effect to fetch when debouncedSearchInput changes
  useEffect(() => {
    setPage(1); // reset page to 1 on new search term
    if (debouncedSearchInput) {
      fetchAllBookings(userSession, { searchInput: debouncedSearchInput }, 1, limit);
    } else {
      fetchAllBookings(userSession, {}, 1, limit);
    }
  }, [debouncedSearchInput]);


  const handleDeleteClick = (bookingId) => {
    setBookingToDelete(bookingId); // Set the booking ID to delete
    setIsDeleteModalOpen(true); // Open the delete confirmation modal
  };

  const isBookingId = (input) => {
    return /^[0-9a-fA-F]{24}$/.test(input); // Assuming MongoDB ObjectID format (24-character hex string)
  };

  const fetchAllBookings = (userSession, filters = {}, pageNumber = page, limitNumber = limit) => {
    setLoading(true);
    const { startDate, endDate, searchInput, status, services, bdmName, paymentmode, paymentStartDate, paymentEndDate } =
      filters;
    const userRole = userSession.user_role;
    const userId = userSession.user_id;

    const params = new URLSearchParams();

    // Dynamic query building
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (status) params.append("status", status);
    if (services) params.append("service", services);
    if (bdmName) params.append("bdmName", bdmName);
    if (paymentmode) params.append("paymentmode", paymentmode);
    if (paymentStartDate) params.append("paymentStartDate", paymentStartDate);
if (paymentEndDate) params.append("paymentEndDate", paymentEndDate);


    params.append("page", pageNumber);
    params.append("limit", limitNumber);

    params.append("userId", userId);
    params.append("userRole", userRole);

    let url;

    if (searchInput) {
      url = isBookingId(searchInput)
        ? `${apiUrl}/user/${searchInput}?userRole=${userRole}&userId=${userId}`
        : `${apiUrl}/user/?pattern=${searchInput}&userRole=${userRole}&userId=${userId}`;
    } else {
      url = `${apiUrl}/booking/bookings/filter?${params.toString()}`;
    }

    fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: `${userSession.token}`,
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
      })
      .then((data) => {
        let bookingsData = [];

        // Handle paginated response format
        if (data.bookings && Array.isArray(data.bookings)) {
          bookingsData = data.bookings;
          setTotalPages(data.totalPages || 1);  // Add this state in your component
          setPage(data.currentPage || 1);       // Add this state in your component
        } else if (Array.isArray(data)) {
          bookingsData = data;
        } else if (data && Array.isArray(data.Allbookings)) {
          bookingsData = data.Allbookings;
        }

        if (bookingsData.length === 0) {
          setBookings([]);
        } else {
          const sortedBookings = bookingsData.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
          setBookings(sortedBookings);
          console.log(sortedBookings);
          
          try {
            setexelData(jsonToCSV(sortedBookings, selectedFields));
          } catch (error) {
            console.error("Error while converting to CSV:", error);
            enqueueSnackbar("Failed to generate CSV data", { variant: "error" });
          }
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
      });
  };

  const handleDownload = () => {
  if (userRole !== "srdev") {
    enqueueSnackbar("You do not have permission to download bookings.", { variant: "error" });
    return;
  }
  setOpenPopupD(true);
};


  const handleFieldSelectionChange = (field) => {
    setSelectedFields((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };

  const handleDownloadCSV = async () => {
    if (!downloadAll) {
      if (!bookings || bookings.length === 0) {
        enqueueSnackbar("No data available to download!", { variant: "warning" });
        return;
      }

      const csvData = jsonToCSV(bookings, selectedFields);
      downloadCSV(csvData, "bookings_data.csv");
      setOpenPopupD(false);
      return;
    }

    try {
      setLoading(true);
      const userSession = JSON.parse(localStorage.getItem("userSession"));
      const url = `${apiUrl}/booking/all`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          authorization: userSession.token,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch all bookings");

      const data = await response.json();

      const allBookings = data.Allbookings || []; // ✅ Access correctly

      if (allBookings.length === 0) {
        enqueueSnackbar("No bookings found for download", { variant: "warning" });
      } else {
        const csvData = jsonToCSV(allBookings, selectedFields);
        downloadCSV(csvData, "all_bookings_data.csv");
        enqueueSnackbar("All bookings downloaded successfully!", { variant: "success" });
      }

    } catch (error) {
      console.error("Download error:", error);
      enqueueSnackbar("Download failed!", { variant: "error" });
    } finally {
      setLoading(false);
      setOpenPopupD(false);
    }
  };


  const handleClosePopup = () => {
    setOpenPopupD(false); // Close the popup without downloading
  };

  const handleResetFilters = () => {
    // Reset the selectedFields to their default values (all true, for example)
    setSelectedFields({
      companyName: true,
      bdmName: true,
      contactNo: true,
      email: true,
      bookingDate: true,
      paymentDate: true,
      totalPayment: true,
      receivedPayment: true,
      afterDisbursement: true,
      remark: true,
      services: true,
      gst: true,
      state: true,
      pan: true,
    });

    // Reset other filter values like search input, date filters, status
    setSearchInput("");
    setStartDate("");
    setEndDate("");
    setStatus("");
    setBdmSearch("");
    setService("");
    setPaymentmode(""); // ✅ Fix added

    setActiveFilters({}); // ✅ Also clear active filters
    setPage(1); // reset to page 1

    // Refetch data without any filters applied
    // Ensure that userSession is available
    const userSession = JSON.parse(localStorage.getItem("userSession"));

    if (userSession && userSession.user_id) {
      // Refetch data without any filters applied
      fetchAllBookings(userSession);
    } else {
      // If userSession is missing, handle it gracefully (maybe show a message or redirect)
      console.log("User session is missing or invalid.");
    }
  };

  // chnages End

  const handleEditClick = (booking) => {
    setEditBooking(booking);
    setIsPopupOpen(true);
  };

  const closePopup = () => {
    setIsPopupOpen(false);
    setEditBooking(null); // Clear the current booking on popup close
    fetchAllBookings(JSON.parse(localStorage.getItem("userSession"))); // Fetch updated bookings
  };

  const confirmDelete = () => {
    if (!bookingToDelete) return;

    fetch(`${apiUrl}/booking/trash/${bookingToDelete}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "user-role": userSession.user_role,
        "user-name": userSession?.name,
        authorization: `${userSession.token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error moving the booking to trash");
        }
        setBookings((prev) =>
          prev.filter((booking) => booking._id !== bookingToDelete)
        );
        enqueueSnackbar("Booking moved to trash successfully!", {
          variant: "success",
        });
      })
      .catch((error) => {
        enqueueSnackbar("Failed to move booking to trash!", { variant: "error" });
      })
      .finally(() => {
        setIsDeleteModalOpen(false);
        setBookingToDelete(null);
      });
  };


  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setBookingToDelete(null);
  };
  // Function to handle search functionality (by booking ID, company name, date range, and status)

  //After change
  const handleSearch = () => {
    const userSession = JSON.parse(localStorage.getItem("userSession"));
    const filters = {};
    // Date filter logic based on selection
  
    if (searchInput) {
      filters.searchInput = searchInput;
      setActiveFilters(filters); // ✅ Store filters
      setPage(1);
      fetchAllBookings(userSession, filters, 1, limit);
      return;
    }

    if (startDate && endDate) {
    if (dateType === "booking") {
      filters.startDate = startDate;
      filters.endDate = endDate;
    } else if (dateType === "payment") {
      filters.paymentStartDate = startDate;
      filters.paymentEndDate = endDate;
    }
  }

    if (bdmSearch) filters.bdmName = bdmSearch;
    if (status) filters.status = status;
    if (paymentmode) filters.paymentmode = paymentmode;
    if (services) filters.services = services;

    setActiveFilters(filters); // ✅ Store filters
    setPage(1);
    fetchAllBookings(userSession, filters, 1, limit);
  };


  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      handleSearch(); // Trigger search when Enter key is pressed
    }
  };

  const handleCopy = (booking) => {
    const bookingDetails = `
      Booking ID: ${booking._id}
      Booking Date: ${new Date(booking.date).toLocaleDateString()}
      Payment Date: ${new Date(booking.payment_date).toLocaleDateString()}

      Company Name: ${booking.company_name || "N/A"}
      Contact Person: ${booking.contact_person}
      Email: ${booking.email}
      Contact Number: ${booking.contact_no}
      Service: ${booking.services}
      Total Amount: ${booking.total_amount}₹
      Received Amount: ${booking.term_1 + booking.term_2 + booking.term_3}₹
      Pending Amount: ${booking.total_amount -
      (booking.term_1 + booking.term_2 + booking.term_3)
      }₹
      Term ${booking.term_1 ? "1" : booking.term_2 ? "2" : booking.term_3 ? "3" : ""
      }:  ${booking.term_1 || booking.term_2 || booking.term_3}
      Bdm name : ${booking.bdm}
      Lead Closed By: ${booking.closed_by || "N/A"}
      GST No: ${booking.gst || "N/A"}
      PAN No: ${booking.pan}
      Bank Name: ${booking.bank}
      Notes: ${booking.remark}
      After Disbursement:${booking.after_disbursement}
      State:${booking.state}
      Status: ${booking.status}
    `;
    navigator.clipboard.writeText(bookingDetails).then(() => {
      enqueueSnackbar("Booking details copied to clipboard!", {
        variant: "success",
      });
    });
  };

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh", // Ensures the container takes the full height of the viewport
        }}
      >
        <Loader />
      </div>
    );

  return (
    <div className="history-page">
      <h2 className="history-header">All Bookings</h2>

      {/* Filter Container for Date and Status */}
      <div className="filter-container">
        

        {/* Date Filter */}
        <div className="date-filter">
          <select value={dateType} onChange={(e) => setDateType(e.target.value)} className="paymentmode-dropdown">
            <option value="booking">Filter By Booking Date</option>
            <option value="payment">Filter By Payment Date</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)} // Updates startDate state
            placeholder="Start Date"
            onKeyDown={handleKeyPress}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)} // Updates endDate state
            placeholder="End Date"
            onKeyDown={handleKeyPress}
          />
          <button className="search-button" onClick={handleSearch}>
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>
        </div>

        <div className="paymentmode-filter">
          <select
            value={paymentmode}
            onChange={(e) => setPaymentmode(e.target.value)}
            className="paymentmode-dropdown"
          >
            <option value="">Paymentmodes</option>
            <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
            <option value="HDFC Bank">HDFC Bank</option>
            <option value="Razorpay">Razorpay</option>
            <option value="HDFC Gateway">HDFC Gateway</option>
            <option value="CashFree Gateway">CashFree Gateway</option>
            <option value="Phonepe Gateway">Phonepe Gateway</option>
            <option value="Enego Projects">Enego Projects</option>
            <option value="Cash">Cash</option>
          </select>
          <button className="search-button" onClick={handleSearch}>
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>
        </div>


        <div className="service-filter">
          <select
            value={services}
            onChange={(e) => setService(e.target.value)}
            className="service-dropdown"
          >
            <option value="">Select Service</option>
            {servicesList.map((serviceItem) => (
              <option
                key={serviceItem.value}
                value={serviceItem.value}
                disabled={serviceItem.disabled}
              >
                {serviceItem.label}
              </option>
            ))}
          </select>
          <button className="search-button" onClick={handleSearch}>
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>
        </div>


        {/* Status Filter */}
        <div className="status-filter">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="status-dropdown"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
          <button className="search-button" onClick={handleSearch}>
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>
        </div>

        <div className="search-container">
          <input
            type="text"
            className="search-bar"
            placeholder="Search by BDM Name..."
            value={bdmSearch}
            onChange={(e) => setBdmSearch(e.target.value)} // Use `bdmSearch` state for BDM name search
          />
          <button className="search-button" onClick={handleSearch}>
            Search
          </button>
        </div>

        <div>
          <button className="reset-button" onClick={handleResetFilters}>
            Reset Filters
          </button>
        </div>
      </div>
      <div className="search-container">
        <input
          type="text"
          className="search-bar"
          placeholder="Search by company name or booking ID..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button className="search-button" onClick={handleSearch}>
          Search
        </button>
      </div>
      <div className="booking-list">
        {bookings.length > 0 ? (
          bookings.map((booking) => (
            <div className="booking-item" key={booking._id}>
              <div className="booking-header">
                <button
                  className="copy-button"
                  onClick={() => handleCopy(booking)}
                >
                  Copy
                </button>
              </div>
              <table className="booking-table">
                <tbody>
                  <tr>
                    <td>
                      <strong>Booking Date</strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;
                      {new Date(booking.date).toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Payment Date</strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;
                     {new Date(booking.payment_date).toLocaleDateString()}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Booking ID </strong>
                    </td>
                    <td style={{ textTransform: "uppercase" }}>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;
                      {booking._id}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Company Name </strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;
                      <strong>{booking.company_name || "N/A"}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Contact Person </strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;
                      {booking.contact_person}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Email </strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;{" "}
                      {booking.email}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Contact Number</strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;
                      {booking.contact_no}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Service</strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span>
                      &nbsp;&nbsp;
                      <strong>
                        {Array.isArray(booking.services)
                          ? booking.services.join(", ")
                          : booking.services || "N/A"}
                      </strong>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <strong>
                        Term{" "}
                        <span>
                          {booking.term_1
                            ? "1"
                            : booking.term_2
                              ? "2"
                              : booking.term_3
                                ? "3"
                                : ""}
                        </span>{" "}
                      </strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;
                      {booking.term_1 || booking.term_2 || booking.term_3} ₹
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Total Amount </strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;
                      {booking.total_amount}₹
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Received Amount </strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;
                      {booking.term_1 + booking.term_2 + booking.term_3}₹
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Pending Amount </strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;
                      {booking.total_amount -
                        (booking.term_1 + booking.term_2 + booking.term_3)}
                      ₹
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>GST No </strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;
                      {booking.gst || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>PAN No </strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;
                      {booking.pan}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Bank Name </strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;
                      {booking.bank}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Bdm Name </strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;
                      <strong>{booking.bdm || "N/A"}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Closed By </strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;
                      {booking.closed_by || "N/A"}
                    </td>
                  </tr>

                  <tr>
                    <td><strong>Update History</strong></td>
                    <td>
                      <span className="colon-bold">:</span>&nbsp;&nbsp;
                      {booking.updatedhistory && booking.updatedhistory.length > 0 ? (
                        <ul className="pl-4">
                          {booking.updatedhistory.map((update, updateIndex) => (
                            <li key={update._id || updateIndex} className="mb-4">
                              <strong>{update.updatedBy}</strong> on{" "}
                              {new Date(update.updatedAt).toLocaleString()}
                              <br />
                              <button
                                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                onClick={() => handleViewDetailsClick(bookings.indexOf(booking), updateIndex)}

                              >
                                View Details
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "N/A"
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>State </strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;
                      {booking.state}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>After Fund disbursement </strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;
                      {booking.after_disbursement || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Notes</strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;
                      {booking.remark}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Status</strong>
                    </td>
                    <td>
                      <span className="colon-bold">:</span> &nbsp;&nbsp;
                      <span
                        className={
                          booking.status === "Pending"
                            ? "status-pending"
                            : booking.status === "In Progress"
                              ? "status-in-progress"
                              : booking.status === "Completed"
                                ? "status-completed"
                                : ""
                        }
                      >
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="booking-footer">
                {(userRole.includes("dev") ||
                  userRole.includes("senior admin")) && (
                    <button
                      className="edit-link"
                      onClick={() => handleEditClick(booking)}
                    >
                      Edit
                    </button>
                  )}

                {["dev", "srdev"].includes(userRole) && (
                  <button
                    className="delete-link"
                    onClick={() => handleDeleteClick(booking._id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <p>No bookings found for the selected filters.</p>
        )}
      </div>

      {/* Modal for View Details */}
      <Dialog open={openDialogInfo.bookingIndex !== null} onClose={handleCloseModal}>
        <DialogTitle>Update Details</DialogTitle>
        <DialogContent>
          {openDialogInfo.bookingIndex !== null &&
            openDialogInfo.updateIndex !== null &&
            bookings[openDialogInfo.bookingIndex]?.updatedhistory?.[openDialogInfo.updateIndex] && (
              <>
                <h4>{bookings[openDialogInfo.bookingIndex].updatedhistory[openDialogInfo.updateIndex].updatedBy}</h4>
                <p><strong>Approved By:</strong> {bookings[openDialogInfo.bookingIndex].updatedhistory[openDialogInfo.updateIndex].note || "N/A"}</p>
                <div>
                  <strong>Changes:</strong>
                  <ul>
                    {Object.entries(bookings[openDialogInfo.bookingIndex].updatedhistory[openDialogInfo.updateIndex].changes || {}).map(([field, value], idx) => (
                      <li key={idx}>
                        <strong>{field}</strong>: <span style={{ color: "red" }}>{String(value.old)}</span> &rarr; <span style={{ color: "green" }}>{String(value.new)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
      />
      {userRole === "srdev" && (
  <button className="floating-download-button" onClick={handleDownload}>
    <i className="fa-solid fa-download"></i>
  </button>
)}

      {/* Changed Code */}
      {userRole === "srdev" && (<Dialog open={openPopupD} onClose={handleClosePopup}>
        <DialogTitle>Select Fields to Download</DialogTitle>
        <DialogContent>
          {/* List of checkboxes for field selection */}
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFields.companyName}
                onChange={() => handleFieldSelectionChange("companyName")}
                color="primary"
              />
            }
            label="Company Name"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFields.contactPersonName}
                onChange={() => handleFieldSelectionChange("contactPersonName")}
                color="primary"
              />
            }
            label="Contact Person Name"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFields.bdmName}
                onChange={() => handleFieldSelectionChange("bdmName")}
                color="primary"
              />
            }
            label="BDM Name"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFields.contactNo}
                onChange={() => handleFieldSelectionChange("contactNo")}
                color="primary"
              />
            }
            label="Contact No."
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFields.email}
                onChange={() => handleFieldSelectionChange("email")}
                color="primary"
              />
            }
            label="Email"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFields.bookingDate}
                onChange={() => handleFieldSelectionChange("bookingDate")}
                color="primary"
              />
            }
            label="Booking Date"
          />
           <FormControlLabel
            control={
              <Checkbox
                checked={selectedFields.paymentDate}
                onChange={() => handleFieldSelectionChange("paymentDate")}
                color="primary"
              />
            }
            label="Payment Date"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFields.totalPayment}
                onChange={() => handleFieldSelectionChange("totalPayment")}
                color="primary"
              />
            }
            label="Total Payment"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFields.receivedPayment}
                onChange={() => handleFieldSelectionChange("receivedPayment")}
                color="primary"
              />
            }
            label="Received Payment"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFields.afterDisbursement}
                onChange={() => handleFieldSelectionChange("afterDisbursement")}
                color="primary"
              />
            }
            label="After Disbursement:1%"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFields.remark}
                onChange={() => handleFieldSelectionChange("remark")}
                color="primary"
              />
            }
            label="Remark"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFields.services}
                onChange={() => handleFieldSelectionChange("services")}
                color="primary"
              />
            }
            label="Services"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFields.termType}
                onChange={() => handleFieldSelectionChange("termType")}
                color="primary"
              />
            }
            label="Term Type"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFields.gst}
                onChange={() => handleFieldSelectionChange("gst")}
                color="primary"
              />
            }
            label="GST"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFields.state}
                onChange={() => handleFieldSelectionChange("state")}
                color="primary"
              />
            }
            label="State"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFields.pan}
                onChange={() => handleFieldSelectionChange("pan")}
                color="primary"
              />
            }
            label="PAN"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={downloadAll}
                onChange={() => setDownloadAll(!downloadAll)} // Toggle value
                color="primary"
              />
            }
            label="Download all bookings (ignore current filters & pagination)"
          />

        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePopup} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDownloadCSV} color="primary">
            Download
          </Button>
        </DialogActions>
      </Dialog>)}
      {/* changed code End */}
      <div className="total-bookings">Total Bookings: {bookings.length}</div>

      <div className="pagination-controls">
        <button
          disabled={page <= 1 || !!searchInput}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>

        <span>Page {page} of {totalPages}</span>

        <button
          disabled={page >= totalPages || !!searchInput}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>


      {isPopupOpen && (
        <Popup isOpen={isPopupOpen} onClose={closePopup}>
          {editBooking ? (
            <EditBooking
              initialData={editBooking} // Pass the booking data to be edited
              onClose={closePopup} // Callback to close popup after form submission
            />
          ) : (
            <AddBooking onClose={closePopup} /> // Render AddBooking if creating new booking
          )}
        </Popup>
      )}
    </div>
  );
};

export default History;
