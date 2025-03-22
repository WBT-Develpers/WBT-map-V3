import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip, Popup, useMap } from "react-leaflet";
import { useEffect, useState, useMemo, useRef } from "react";
import * as turf from "@turf/turf";
import "leaflet/dist/leaflet.css";
import USGeojson from "../../assets/gb.json";
import Logo from "../../assets/logo.png";
import "./Map.css";
import L from "leaflet";
import { supabase } from "../../utils/supabaseClient";
import dark_blue from "../../assets/markersImage/dark_blue.png";
import dark_gray from "../../assets/markersImage/dark_gray.png";
import dark_green from "../../assets/markersImage/dark_green.png";
import green from "../../assets/markersImage/green.png";
import light_blue from "../../assets/markersImage/light_blue.png";
import light_green from "../../assets/markersImage/light_green.png";
import mairum_red from "../../assets/markersImage/mairum_red.png";
import multiplecolor from "../../assets/markersImage/multiplecolor.png";
import orange from "../../assets/markersImage/orange.png";
import pink from "../../assets/markersImage/pink.png";
import red from "../../assets/markersImage/red.png";
import yellow from "../../assets/markersImage/yellow.png";

L.Marker.prototype.options.icon = L.divIcon({className: 'hidden-marker'});

const jumpMarkerAnimation = `
  @keyframes markerJump {
    0% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0); }
  }
  .marker-jump {
    animation: markerJump 0.5s ease;
  }
`;

const MarkerRef = ({ position, icon, children, isActive, serviceId }) => {
  const markerRef = useRef(null);
  useEffect(() => {
    if (isActive && markerRef.current) {
      const markerElement = markerRef.current.getElement();
      markerElement.classList.remove('marker-jump');
      void markerElement.offsetWidth; 
      markerElement.classList.add('marker-jump');
      setTimeout(() => {
        markerElement.classList.remove('marker-jump');
      }, 500);
    }
  }, [isActive]);
  return (
    <Marker 
      position={position} 
      icon={icon} 
      ref={markerRef}
      eventHandlers={{
        add: (e) => {
          if (e.target && serviceId) {
            const element = e.target.getElement();
            element.setAttribute('data-service-id', serviceId);
          }
        }
      }}
    >
      {children}
    </Marker>
  );
};

const DynamicLabelSize = ({ setLabelSize }) => {
  const map = useMap();
  useEffect(() => {
    const updateSize = () => {
      const zoom = map.getZoom();
      setLabelSize(`${zoom * 2}px`); 
    };
    map.on("zoomend", updateSize);
    updateSize(); 
    return () => {
      map.off("zoomend", updateSize);
    };
  }, [map, setLabelSize]);
  return null;
};

const REGION_COLORS = {
  'Scotland': '#d81e1e', 
  'North': '#f7db26', 
  'North West': '#65d1f9', 
  'Midlands': '#f18315', 
  'East Midlands': '#c2c0be', 
  'Wales': '#e97ccb', 
  'South West England': '#44f02c', 
  'South East England': '#b68d03', 
  'Northern Ireland': '#7b7a75', 
  'London': '#5671e8', 
  'North East England': '#37423D', 
  'Yorkshire and the Humber': '#C1666B',
  'default': '#114859'  
};

const markerImages = {
  "#114859": dark_blue,
  "#555555": dark_gray,
  "#006400": dark_green,
  "#00FF00": green,
  "#ADD8E6": light_blue,
  "#90EE90": light_green,
  "#8B0000": mairum_red,
  "#FFA500": orange,
  "#FFC0CB": pink,
  "#FF0000": red,
  "#FFFF00": yellow
};
const getClosestMarkerImage = (color) => {
  if (!color) return dark_blue;
  if (markerImages[color]) return markerImages[color];
  if (color.startsWith('#')) {
    if (color.includes('00') && color.includes('FF')) return green;
    if (color.toLowerCase().includes('ff')) return red;
    if (color.toLowerCase().includes('00')) return light_blue;
    if (color.toLowerCase().includes('ee')) return yellow;
    if (color.toLowerCase().includes('cc')) return orange;
    if (color.toLowerCase().includes('aa')) return pink;
    if (color.toLowerCase().includes('88')) return light_blue;
    if (color.toLowerCase().includes('66')) return light_green;
    if (color.toLowerCase().includes('44')) return dark_green;
    if (color.toLowerCase().includes('22')) return dark_blue;
  }
  return dark_blue;
};
const createMarkerIcon = (colors) => {
  let markerImage = colors.length > 1 ? multiplecolor : getClosestMarkerImage(colors[0]);

  return L.divIcon({
    html: `<div style="width: 30px; height: 42px; display: flex; align-items: center; justify-content: center;">
             <img src="${markerImage}" style="width: 100%; height: 100%; object-fit: contain;" />
           </div>`,
    className: "", // Remove default styles
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40],
  });
};

const Map = () => { 
  const [geoData, setGeoData] = useState(null);
  const [cityLabels, setCityLabels] = useState([]);
  const [labelSize, setLabelSize] = useState("12px");
  const [bounds, setBounds] = useState(null);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState({});
  const [servicesList, setServicesList] = useState([]);
  const [clientServices, setClientServices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [regionData, setRegionData] = useState({});
  const [featureRegionMap, setFeatureRegionMap] = useState({});
  const [selectedService, setSelectedService] = useState(null);
  const [activeMarkers, setActiveMarkers] = useState([]);
  const mapRef = useRef(null);
  const [locationSlots, setLocationSlots] = useState({});
  const [cityToLocationMap, setCityToLocationMap] = useState({});

  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = jumpMarkerAnimation;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  useEffect(() => {
    const fetchRegionData = async () => {
      try {
        const { data, error } = await supabase
          .from('location')
          .select('id, city, region');
        if (error) throw error;
        const regionMap = {};
        const cityLocationMap = {};
        data.forEach(location => {
          if (location.city) {
            const normalizedCity = location.city
              .toLowerCase()
              .replace(/ and /g, ' & ')
              .replace(/[-/]/g, ' ')
              .replace(/\s+/g, ' ')
              .replace(/\b(county|district|borough|region|city of|the)\b/g, '')
              .trim();
            console.log("DB City:", normalizedCity, "ID:", location.id); 
            regionMap[normalizedCity] = location.region;
            cityLocationMap[normalizedCity] = location.id;
          }
        });
        console.log("CITY LOCATION MAP", cityLocationMap);
        setRegionData(regionMap);
        setCityToLocationMap(cityLocationMap);
      } catch (err) {
        console.error("Error fetching region data:", err);
        setError(prev => prev || err.message);
      }
    };
    fetchRegionData();
  }, []);
  useEffect(() => {
    const fetchLocationSlots = async () => {
      try {
        const { data, error } = await supabase
          .from('location_slot')
          .select('id, location_id, service_id, number_of_slots, status');
        if (error) throw error;
        const slotMap = {};
        data.forEach(slot => {
          if (!slotMap[slot.location_id]) {
            slotMap[slot.location_id] = {};
          }
          slotMap[slot.location_id][slot.service_id] = {
            id: slot.id,
            slots: slot.number_of_slots,
            status: slot.status
          };
        });
        setLocationSlots(slotMap);
      } catch (err) {
        console.error("Error fetching location slots:", err);
        setError(prev => prev || err.message);
      }
    };

    fetchLocationSlots();
  }, []);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('id, name, color');
        if (error) throw error;
        const serviceMap = {};
        data.forEach(service => {
          serviceMap[service.id] = service;
        });
        setServices(serviceMap);
        setServicesList(data); 
      } catch (err) {
        console.error("Error fetching services:", err);
        setError(prev => prev || err.message);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    const fetchClientServices = async () => {
      try {
        const { data, error } = await supabase
          .from('client_services')
          .select('client_id, service_id');
        if (error) throw error;
        const clientServiceMap = {};
        data.forEach(cs => {
          if (!clientServiceMap[cs.client_id]) {
            clientServiceMap[cs.client_id] = [];
          }
          clientServiceMap[cs.client_id].push(cs.service_id);
        });
        setClientServices(clientServiceMap);
      } catch (err) {
        console.error("Error fetching client services:", err);
        setError(prev => prev || err.message);
      }
    };
    fetchClientServices();
  }, []);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*');
        if (error) throw error;
        const validClients = data.filter(client => 
          client.lat && client.lang && 
          !isNaN(parseFloat(client.lat)) && 
          !isNaN(parseFloat(client.lang))
        );
        setClients(validClients);
      } catch (err) {
        console.error("Error fetching clients:", err);
        setError(prev => prev || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

useEffect(() => {
  if (USGeojson && Object.keys(cityToLocationMap).length > 0) {
    setGeoData(USGeojson);
    const labels = USGeojson.features
      .filter((feature) => feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon")
      .map((feature) => {
        const centroid = turf.centroid(feature);
        return {
          name: feature.properties.name,
          coordinates: centroid.geometry.coordinates.reverse(),
        };
      });
    setCityLabels(labels);
    const geojsonLayer = L.geoJSON(USGeojson);
    setBounds(geojsonLayer.getBounds());
    const featureMap = {};
    USGeojson.features.forEach(feature => {
      if (feature.properties && feature.properties.name) {
        const cityName = feature.properties.name
          .toLowerCase()
          .replace(/ and /g, ' & ')
          .replace(/[-/]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/\b(county|district|borough|region|city of|the)\b/g, '')
          .trim();
        if (cityToLocationMap[cityName]) {
          featureMap[feature.properties.name] = regionData[cityName];
        }
      }
    });
    setFeatureRegionMap(featureMap);
  }
}, [USGeojson, cityToLocationMap, regionData]);

  const getServiceAvailability = (locationId) => {
    if (!locationId || !locationSlots[locationId]) {
      return Object.entries(services).map(([id, service]) => ({
        id,
        name: service.name,
        color: service.color,
        slots: 0,
        available: true
      }));
    }
    return Object.entries(services).map(([id, service]) => {
      const slotInfo = locationSlots[locationId][id];
      const slotsUsed = slotInfo ? slotInfo.slots : 0;
      const isAvailable = !slotInfo || slotInfo.status === 'available' && slotsUsed < 2;
      return {
        id,
        name: service.name,
        color: service.color,
        slots: slotsUsed,
        available: isAvailable
      };
    });
  };

  const getFeatureStyle = (feature) => {
    let region = "default";
    if (feature.properties && feature.properties.name) {
      region = featureRegionMap[feature.properties.name] || "default";
    }
    const color = REGION_COLORS[region] || REGION_COLORS.default;
    return {
      color: "#333",  
      weight: 1,      
      fillColor: color,
      fillOpacity: 2
    };
  };

  const onEachFeature = (feature, layer) => {
    let region = "Unknown";
    if (feature.properties && feature.properties.name) {
      region = featureRegionMap[feature.properties.name] || "Unknown";
    }
    layer.on({
      mouseover: async (e) => {
        if (feature.properties?.name) {
          const cityName = feature.properties.name
          .toLowerCase()
          .replace(/ and | & /g, ' & ')
          .replace(/[-/]/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/\b(county|district|borough|region|city of|the)\b/g, '')
          .trim();
          console.log("GeoJSON City (normalized):", cityName);
          console.log("Available keys in cityToLocationMap:", Object.keys(cityToLocationMap));
          const locationId = cityToLocationMap[cityName];
          console.log("LOCATION ID", locationId);
          if (locationId) {
            const serviceAvailability = getServiceAvailability(locationId);
            let popupContent = `
              <div class="location-popup">
                <h3>${feature.properties.name}</h3>
                <div class="service-availability">
                  <p><strong>Service Availability:</strong></p>
                  <ul>
            `;
            serviceAvailability.forEach(service => {
              console.log("MOUSEOVER", service) 
              popupContent += `
                <li>
                  <span class="service-status ${service.available ? 'available' : 'full'}" 
                        style="background-color: ${service.color}"></span>
                  ${service.name}: ${service.slots}/2 slots used
                  ${service.available ? '(Available)' : '(FULL)'}
                </li>
              `;
            });
            popupContent += `
                </ul>
              </div>
            </div>
            `;
            layer.bindPopup(popupContent);
            layer.openPopup();
          } else {
            layer.bindPopup(`<strong>${feature.properties.name}</strong>`);
            layer.openPopup();
          }
        }
      },
      click: (e) => {
        if (feature.properties && feature.properties.name) {
          // We'll keep the mouseover behavior for click as well
          // The mouseover event will handle showing the availability
        }
      },
    });
  };
  const getClientServiceColors = (clientId) => {
    if (!clientServices[clientId] || !services) return ['#114859']; 
    const serviceIds = clientServices[clientId];
    const colors = serviceIds
      .map(id => services[id]?.color || '#114859')
      .filter(color => color); 
    return colors.length > 0 ? colors : ['#114859'];
  };

  const getClientServiceNames = (clientId) => {
    if (!clientServices[clientId] || !services) return []; 
    
    return clientServices[clientId]
      .map(id => services[id]?.name)
      .filter(name => name); 
  };

  const RegionLegend = () => {
    return (
      <div className="region-legend">
        <h4>Region Colors</h4>
        {Object.entries(REGION_COLORS).filter(([key]) => key !== 'default').map(([region, color]) => (
          <div key={region} className="legend-item">
            <span className="color-box" style={{backgroundColor: color}}></span>
            <span>{region}</span>
          </div>
        ))}
      </div>
    );
  };

  const handleServiceClick = (serviceId) => {
    if (selectedService === serviceId) {
      setSelectedService(null);
      setActiveMarkers([]);
      return;
    }
    setSelectedService(serviceId);
    const clientsWithService = [];
    Object.entries(clientServices).forEach(([clientId, serviceIds]) => {
      if (serviceIds.includes(serviceId)) {
        clientsWithService.push(clientId);
      }
    });
    setActiveMarkers(clientsWithService);
  };

  const filteredClients = useMemo(() => {
    if (!selectedService) return clients; 
    return clients.filter(client => {
      const serviceIds = clientServices[client.id] || [];
      return serviceIds.includes(selectedService);
    });
  }, [clients, clientServices, selectedService]);

  const isClientVisible = (clientId) => {
    if (!selectedService) return true; 
    const serviceIds = clientServices[clientId] || [];
    return serviceIds.includes(selectedService);
  };
  
  const ServiceButtons = () => {
    return (
      <div className="service-buttons">
        {servicesList.map(service => (
          <button 
            key={service.id}
            onClick={() => handleServiceClick(service.id)}
            className={`service-button ${selectedService === service.id ? 'active' : ''}`}
            style={{ 
              backgroundColor: service.color,
              color: '#fff',
              border: selectedService === service.id ? '2px solid white' : 'none',
              padding: '8px 16px',
              margin: '0 8px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {service.name}
          </button>
        ))}
      </div>
    );
  };
  
  const shouldAnimateMarker = (clientId) => {
    return activeMarkers.includes(clientId);
  };
  return (
    <div>
      <div className="header">
        <div>
          <img className="logo" src={Logo} alt="Logo" /> 
           <ServiceButtons />
        </div>
        <button className="logout-button">Logout</button>
      </div>
      {error && <div className="error-message">Error loading data: {error}</div>}
      {loading && <div className="loading-message">Loading map data...</div>}
      <MapContainer
        center={[54.5, -2.5]}
        zoom={6}
        style={{ height: "92vh", width: "100%" }}
        maxBounds={bounds} 
        maxBoundsViscosity={1.0}
        zoomSnap={0.5}
        ref={mapRef}
      >
        <DynamicLabelSize setLabelSize={setLabelSize} />
        {geoData && (
          <GeoJSON
            data={geoData}
            style={getFeatureStyle}
            onEachFeature={onEachFeature}
          />
        )}
        {filteredClients.map((client) => {
          const serviceColors = getClientServiceColors(client.id);
          const serviceNames = getClientServiceNames(client.id);
          const isActive = shouldAnimateMarker(client.id);
          const clientServiceIds = clientServices[client.id] || [];
          const primaryServiceId = clientServiceIds[0] || null;
          return (
            <MarkerRef 
              key={client.id} 
              position={[parseFloat(client.lat), parseFloat(client.lang)]}
              icon={createMarkerIcon(serviceColors)}
              isActive={isActive}
              serviceId={primaryServiceId}
            >
              <Popup>
                <div className="client-popup">
                  <h3>{client.business_name}</h3>
                  <p><strong>Country:</strong> {client.country}</p>
                  <p><strong>Max Slots:</strong> {client.max_slots_per_service}</p>
                  {serviceNames.length > 0 && (
                    <div className="client-services">
                      <p><strong>Services:</strong></p>
                      <ul>
                        {serviceNames.map((name, index) => (
                          <li key={index}>
                            <span className="service-color-dot" style={{backgroundColor: serviceColors[index]}}></span>
                            {name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {client.location_exclusivity_start && (
                    <p><strong>Exclusivity:</strong> {new Date(client.location_exclusivity_start).toLocaleDateString()} - 
                    {client.location_exclusivity_end ? new Date(client.location_exclusivity_end).toLocaleDateString() : 'Ongoing'}</p>
                  )}
                  <p><strong>Created:</strong> {new Date(client.created_at).toLocaleDateString()}</p>
                </div>
              </Popup>
              <Tooltip>
                {client.business_name}
              </Tooltip>
            </MarkerRef>
          );
        })}
        <div className="leaflet-bottom leaflet-right">
          <div className="leaflet-control leaflet-bar region-legend-container">
            <RegionLegend />
          </div>
        </div>
      </MapContainer>
      <style>{`
        .service-status {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 5px;
        }
        .service-status.available {
          opacity: 1;
        }
        .service-status.full {
          opacity: 0.5;
        }
        .location-popup {
          min-width: 220px;
        }
        .service-availability ul {
          list-style: none;
          padding-left: 10px;
        }
        .service-availability li {
          margin-bottom: 5px;
        }
      `}</style>
    </div>
  );
};
export default Map;