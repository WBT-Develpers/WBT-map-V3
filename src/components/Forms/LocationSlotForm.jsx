import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";
import "./Forms.css";

const LocationSlotForm = () => {
  const [formData, setFormData] = useState({
    client_id: "",
    location_id: "",
    service_id: "",
    slot_number: 1,
    status: "Available"
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [clients, setClients] = useState([]);
  const [locations, setLocations] = useState([]);
  const [services, setServices] = useState([]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [clientsResult, locationsResult, servicesResult] = await Promise.all([
          supabase.from("clients").select("id, business_name"),
          supabase.from("location").select("id, city"),
          supabase.from("services").select("id, name")
        ]);

        if (clientsResult.error) throw clientsResult.error;
        if (locationsResult.error) throw locationsResult.error;
        if (servicesResult.error) throw servicesResult.error;

        setClients(clientsResult.data || []);
        setLocations(locationsResult.data || []);
        setServices(servicesResult.data || []);
      } catch (error) {
        console.error("Error fetching form options:", error);
        setMessage({ 
          type: "error", 
          text: `Error loading form options: ${error.message}` 
        });
      }
    };

    fetchOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: ["client_id", "location_id", "service_id", "slot_number"].includes(name) 
        ? parseInt(value) 
        : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const { data, error } = await supabase
        .from("location_slots")
        .insert([{
          client_id: formData.client_id,
          location_id: formData.location_id,
          service_id: formData.service_id,
          slot_number: formData.slot_number,
          status: formData.status
        }]);

      if (error) throw error;

      setMessage({ 
        type: "success", 
        text: "Location slot assigned successfully!" 
      });
      
      setFormData({
        ...formData,
        slot_number: formData.slot_number + 1
      });
    } catch (error) {
      console.error("Error assigning location slot:", error);
      setMessage({ 
        type: "error", 
        text: `Error: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Assign Location Slot</h2>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="client_id">Client</label>
          <select
            id="client_id"
            name="client_id"
            value={formData.client_id}
            onChange={handleChange}
            required
          >
            <option value="">Select a client</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.business_name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="location_id">Location</label>
          <select
            id="location_id"
            name="location_id"
            value={formData.location_id}
            onChange={handleChange}
            required
          >
            <option value="">Select a location</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.city}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="service_id">Service</label>
          <select
            id="service_id"
            name="service_id"
            value={formData.service_id}
            onChange={handleChange}
            required
          >
            <option value="">Select a service</option>
            {services.map(service => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="slot_number">Slot Number</label>
          <input
            type="number"
            id="slot_number"
            name="slot_number"
            min="1"
            value={formData.slot_number}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
          >
            <option value="Available">Available</option>
            <option value="Occupied">Occupied</option>
            <option value="Reserved">Reserved</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>
        
        <button 
          type="submit" 
          className="submit-btn" 
          disabled={loading}
        >
          {loading ? "Assigning..." : "Assign Slot"}
        </button>
      </form>
    </div>
  );
};

export default LocationSlotForm;