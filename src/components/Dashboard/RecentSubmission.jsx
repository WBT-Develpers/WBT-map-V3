import { useState, useEffect } from "react";
import "./RecentSubmissions.css";

const RecentSubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecentSubmissions = async () => {
      try {
        setIsLoading(true);
        const { supabase } = await import("../../utils/supabaseClient");
        
        // Assuming you have a view or table for submissions
        // Adjust the query according to your data structure
        const { data, error } = await supabase
          .from("location_slots")
          .select(`
            id,
            status,
            created_at,
            clients(business_name),
            location(city),
            services(name)
          `)
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) throw error;
        
        setSubmissions(data || []);
      } catch (error) {
        console.error("Error fetching recent submissions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentSubmissions();
  }, []);

  if (isLoading) {
    return <div className="loading-submissions">Loading recent activity...</div>;
  }

  return (
    <div className="recent-submissions">
      <div className="section-header">
        <h2>Recent Location Assignments</h2>
        <a href="#view-all" className="view-all">View all</a>
      </div>
      
      <table className="submissions-table">
        <thead>
          <tr>
            <th>Business</th>
            <th>Location</th>
            <th>Service</th>
            <th>Status</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {submissions.length > 0 ? (
            submissions.map((item) => (
              <tr key={item.id}>
                <td>{item.clients?.business_name || "N/A"}</td>
                <td>{item.location?.city || "N/A"}</td>
                <td>{item.services?.name || "N/A"}</td>
                <td>
                  <span className={`status-badge ${item.status.toLowerCase()}`}>
                    {item.status}
                  </span>
                </td>
                <td>
                  {new Date(item.created_at).toLocaleDateString()} 
                  {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </td>
                <td>
                  <button className="action-btn">View</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="no-data">No recent assignments</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default RecentSubmissions;