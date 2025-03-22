import { useState } from "react";
import { addService } from "../../api/servicesApi";
import "./Forms.css";

const ServiceForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    color: "#3abfbb"
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      await addService(formData.name, formData.color);
      
      setMessage({ 
        type: "success", 
        text: "Service added successfully!" 
      });
      
      setFormData({
        name: "",
        color: "#3abfbb"
      });
    } catch (error) {
      console.error("Error adding service:", error);
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
      <h2>Add New Service</h2>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Service Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="color">Service Color</label>
          <div className="color-picker-container">
            <input
              type="color"
              id="color"
              name="color"
              value={formData.color}
              onChange={handleChange}
              className="color-picker"
            />
            <span className="color-value">{formData.color}</span>
          </div>
        </div>
        
        <button 
          type="submit" 
          className="submit-btn" 
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Service"}
        </button>
      </form>
    </div>
  );
};

export default ServiceForm;