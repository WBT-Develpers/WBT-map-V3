import { useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import "./Forms.css";

const ClientForm = () => {
  const [formData, setFormData] = useState({
    business_name: "",
    country: "",
    max_slots_per_service: 1
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "max_slots_per_service" ? parseInt(value) : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const { data, error } = await supabase
        .from("clients")
        .insert([{
          business_name: formData.business_name,
          country: formData.country,
          max_slots_per_service: formData.max_slots_per_service
        }]);

      if (error) throw error;

      setMessage({ 
        type: "success", 
        text: "Client added successfully!" 
      });
      
      setFormData({
        business_name: "",
        country: "",
        max_slots_per_service: 1
      });
    } catch (error) {
      console.error("Error adding client:", error);
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
      <h2>Add New Client</h2>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="business_name">Business Name</label>
          <input
            type="text"
            id="business_name"
            name="business_name"
            value={formData.business_name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="country">Country</label>
          <input
            type="text"
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="max_slots_per_service">Maximum Slots Per Service</label>
          <input
            type="number"
            id="max_slots_per_service"
            name="max_slots_per_service"
            min="1"
            value={formData.max_slots_per_service}
            onChange={handleChange}
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="submit-btn" 
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Client"}
        </button>
      </form>
    </div>
  );
};

export default ClientForm;