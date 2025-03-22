import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { getServices } from "../../api/servicesApi";
import ClientForm from "../Forms/ClientForm";
import ServiceForm from "../Forms/ServiceForm";
import CountryForm from "../Forms/CountryForm";
import LocationSlotForm from "../Forms/LocationSlotForm";
import StatsCards from "./StatsCards";
import RecentSubmissions from "./RecentSubmissions";
import "./Dashboard.css";

const Dashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    clients: 0,
    services: 0,
    locations: 0,
    slots: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        // Fetch counts from Supabase
        const { supabase } = await import("../../utils/supabaseClient");
        
        const [clientsResult, servicesResult, locationsResult, slotsResult] = await Promise.all([
          supabase.from("clients").select("id", { count: "exact" }),
          supabase.from("services").select("id", { count: "exact" }),
          supabase.from("location").select("id", { count: "exact" }),
          supabase.from("location_slots").select("id", { count: "exact" })
        ]);

        setStats({
          clients: clientsResult.count || 0,
          services: servicesResult.count || 0,
          locations: locationsResult.count || 0,
          slots: slotsResult.count || 0
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchStats();
    }
  }, [user]);

  if (!user) {
    return <div className="loading">Please log in to view the dashboard</div>;
  }

  if (isLoading) {
    return <div className="loading">Loading dashboard data...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <div className="user-info">
          <span>{user.email}</span>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={activeTab === "overview" ? "active" : ""} 
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button 
          className={activeTab === "clients" ? "active" : ""} 
          onClick={() => setActiveTab("clients")}
        >
          Add Client
        </button>
        <button 
          className={activeTab === "services" ? "active" : ""} 
          onClick={() => setActiveTab("services")}
        >
          Add Service
        </button>
        <button 
          className={activeTab === "countries" ? "active" : ""} 
          onClick={() => setActiveTab("countries")}
        >
          Add Country
        </button>
        <button 
          className={activeTab === "slots" ? "active" : ""} 
          onClick={() => setActiveTab("slots")}
        >
          Assign Location Slot
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === "overview" && (
          <>
            <StatsCards stats={stats} />
            <RecentSubmissions />
          </>
        )}
        {activeTab === "clients" && <ClientForm />}
        {activeTab === "services" && <ServiceForm />}
        {activeTab === "countries" && <CountryForm />}
        {activeTab === "slots" && <LocationSlotForm />}
      </div>
    </div>
  );
};

export default Dashboard;