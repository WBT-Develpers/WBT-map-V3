import { useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import "./Forms.css";

const CountryForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    code: ""
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
      // Note: You might need to create a countries table or adjust this
      // to match your actual database structure
      const { data, error } = await supabase
        .from("countries")
        .insert([{
          name: formData.name,
          code: formData.code.toUpperCase()
        }]);

      if (error) throw error;

      setMessage({ 
        type: "success", 
        text: "Country added successfully!" 
      });
      
      setFormData({
        name: "",
        code: ""
      });
    } catch (error) {
      console.error("Error adding country:", error);
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
      <h2>Add New Country</h2>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Country Name</label>
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
          <label htmlFor="code">Country Code (ISO)</label>
          <input
            type="text"
            id="code"
            name="code"
            maxLength="2"
            placeholder="US, UK, CA, etc."
            value={formData.code}
            onChange={handleChange}
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="submit-btn" 
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Country"}
        </button>
      </form>
    </div>
  );
};

export default CountryForm;