  import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip, Popup, useMap } from "react-leaflet";
  import { useEffect, useState, useMemo, useRef, useCallback } from "react";
  import "leaflet/dist/leaflet.css";
  import Logo from "../../assets/logo.png";
  import "./Map.css";
  import L from "leaflet";
  import { point, booleanPointInPolygon } from '@turf/turf';
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
  import purple from "../../assets/markersImage/purple.png";
  import { LiaMapMarkerSolid } from "react-icons/lia";
  
// import { LiaMapMarkerSolid } from 'lucide-react';
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
  const DynamicLabelSize = () => {
    const map = useMap();
    useEffect(() => {
      const updateSize = () => {
        const labels = document.querySelectorAll('.postcode-label div');
        labels.forEach(label => {
          label.style.fontSize = '14px';
          label.style.transform = 'scale(1)';
        });
      };
      map.on("zoomend", updateSize);
      updateSize(); 
      return () => {
        map.off("zoomend", updateSize);
      };
    }, [map]);
    return null;
  };
  const ClientSearch = ({ clients, onSelectClient, mapRef }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    useEffect(() => {
      if (searchTerm.length >= 2) {
        const results = clients.filter(client => 
          client.business_name.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5); 
        setSearchResults(results);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, [searchTerm, clients]);
    const handleSelectClient = (client) => {
      onSelectClient(client);
      setSearchTerm(client.business_name);
      setShowResults(false);
      if (mapRef.current && client.lat && client.lang) {
        const map = mapRef.current;
        map.flyTo(
          [parseFloat(client.lat), parseFloat(client.lang)], 
          10,
          { duration: 1.5 } 
        );
      }
    };
    const getServiceAvailability = (locationId, services, locationSlots) => {
      if (!locationId || !locationSlots[locationId]) {
        return Object.values(services).map(service => ({
          ...service,
          slots: 0,
          available: true,
          businesses: []
        }));
      }
      return Object.values(services).map(service => {
        const slotData = locationSlots[locationId][service.id] || {
          totalSlots: 2,
          usedSlots: 0,
          businesses: []
        };
        return {
          ...service,
          slots: slotData.usedSlots, 
          available: slotData.usedSlots < 2,
          businesses: slotData.businesses
        };
      });
    };
    return (
      <div className="client-search-container">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            className="client-search-input"
          />
          {searchTerm && (
            <button 
              className="clear-search-button"
              onClick={() => {
                setSearchTerm('');
                setShowResults(false);
              }}
            >
              ×
            </button>
          )}
        </div>
        {showResults && searchResults.length > 0 && (
          <ul className="search-results">
            {searchResults.map(client => (
              <li 
                key={client.id} 
                onClick={() => handleSelectClient(client)}
                className="search-result-item"
              >
                {client.business_name}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };
  const REGION_COLORS = {
    'Scotland': '#d81e1e', 
    'North': '#f7db26', 
    'North West': '#65d1f9', 
    'Midlands': '#f18315', 
    'Wales': '#e97ccb', 
    'South West ': '#44f02c', 
    'South East': '#b68d03', 
    'Northern Ireland': '#7b7a75', 
    'East Anglia': '#7b7a75',
    'default': '#cccccc'  
  };
  const markerImages = {
    "#0236ec": dark_blue,    // Electrical
    "#18c6e6": light_green,   // ASHP
    "#FF6000": orange,       // Damp proofing
    "#B407F9": purple,         // Solar
    "#318BFF": light_blue,   // Cooling
    "#d10216": red,          // Heating
    "#006400": dark_green,   // EV Chargers
    "#00E3D8": light_blue    // Pool Cleaning
  };
  const getClosestMarkerImage = (color) => {
    if (!color || typeof color !== 'string') return dark_blue;
    
    // Exact match first
    if (markerImages[color]) return markerImages[color];
    
    // Lowercase for case-insensitive matching
    color = color.toLowerCase();
    
    // Specific color mappings
    const colorMappings = {
      'blue': light_blue,
      'red': red,
      'green': dark_green,
      'orange': orange,
      'pink': pink,
      'yellow': yellow
    };
    
    // Check for color keywords
    for (const [keyword, image] of Object.entries(colorMappings)) {
      if (color.includes(keyword)) return image;
    }
    
    // Fallback
    return dark_blue;
  };
  const createMarkerIcon = (colors) => {
    let markerImage = colors.length > 1 ? multiplecolor : getClosestMarkerImage(colors[0]);
    return L.divIcon({
      html: `<div style="width: 30px; height: 42px; display: flex; align-items: center; justify-content: center;">
              <img src="${markerImage}" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>`,
      className: "", 
      iconSize: [30, 42],
      iconAnchor: [15, 42],
      popupAnchor: [0, -40],
    });
  };
  const importAllGeojsons = () => {
    const modules = import.meta.glob('../../assets/UK_geojsons/*.geojson', { 
      eager: true, 
      query: '?raw',
      import: 'default'
    });
    return Object.entries(modules).map(([path, content]) => {
      const fileName = path.split('/').pop().replace('.geojson', '').toUpperCase();
      try {
        return { ...JSON.parse(content), fileName };
      } catch (error) {
        console.error('Error parsing GeoJSON:', error);
        return null;
      }
    }).filter(Boolean);
  };

  const geojsonFiles = importAllGeojsons();

  // Add these constants at the top level
  const DEFAULT_CENTER = [54.5, -2.5];
  const DEFAULT_ZOOM = 6;
  const CLUSTER_OPTIONS = {
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    disableClusteringAtZoom: 15
  };

  const Map = () => { 
    const [clients, setClients] = useState([]);
    const [services, setServices] = useState({});
    const [clientServices, setClientServices] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [regionData, setRegionData] = useState({});
    const [selectedService, setSelectedService] = useState(null);
    const [activeMarkers, setActiveMarkers] = useState([]);
    const mapRef = useRef(null);
    const [locationSlots, setLocationSlots] = useState({});
    const [cityToLocationMap, setCityToLocationMap] = useState({});
    const [selectedClient, setSelectedClient] = useState(null);
    const [postcodeMap, setPostcodeMap] = useState({});

    const processedGeoData = useMemo(() => {
      if (!geojsonFiles.length || Object.keys(postcodeMap).length === 0) return [];
      
      return geojsonFiles.map(geojsonData => {
        const postcodeInitials = geojsonData.fileName; 
        const locationData = postcodeMap[postcodeInitials]; 
        
        const features = geojsonData.features.map(feature => {
          feature.properties.postcodeInitials = postcodeInitials; 
          if (locationData) {
            feature.properties.region = locationData.region;
            feature.properties.color = REGION_COLORS[locationData.region] || REGION_COLORS.default;
            feature.properties.locationId = locationData.id;
          } else {
            feature.properties.region = 'default';
            feature.properties.color = REGION_COLORS.default;
          }
          return feature;
        });
        
        return { ...geojsonData, features };
      });
    }, [geojsonFiles, postcodeMap]);

    // Memoize the bounds calculation
    const mapBounds = useMemo(() => {
      if (!processedGeoData.length) return null;
      const geojsonLayer = L.geoJSON(processedGeoData);
      return geojsonLayer.getBounds();
    }, [processedGeoData]);

    // Memoize the feature style function
    const getFeatureStyle = useCallback((feature) => {
      const color = feature.properties?.color || REGION_COLORS.default;
      return {
        color: "#ffffff",
        weight: 1,
        fillColor: color,
        fillOpacity: 1
      };
    }, []);

    // Memoize the onEachFeature function
    const getServiceAvailability = useCallback((locationId) => {
      console.log("LOCATION ID------------", locationId);
      if (!locationId || !locationSlots[locationId]) {
        return Object.values(services).map(service => ({
          
          ...service,
          slots: 0,
          available: true,
          businesses: []
        }));
      }
      return Object.values(services).map(service => {
        const slotData = locationSlots[locationId][service.id] || {
          totalSlots: 2,
          usedSlots: 0,
          businesses: []
        };
        return {
          ...service,
          slots: slotData.usedSlots, 
          available: slotData.usedSlots < 2,
          businesses: slotData.businesses
        };
      });
    }, [services, locationSlots]);

    const findLabelPosition = useCallback((feature) => {
      try {
        const bounds = L.geoJSON(feature).getBounds();
        const center = bounds.getCenter();
        
        const centerPoint = point([center.lng, center.lat]);
        
        if (booleanPointInPolygon(centerPoint, feature)) {
          return [center.lat, center.lng];
        }
        
        const points = [
          bounds.getCenter(),
          bounds.getNorthWest(),
          bounds.getNorthEast(),
          bounds.getSouthWest(),
          bounds.getSouthEast()
        ];
        
        for (let pt of points) {
          const pointFeature = point([pt.lng, pt.lat]);
          if (booleanPointInPolygon(pointFeature, feature)) {
            return [pt.lat, pt.lng];
          }
        }
        
        return [center.lat, center.lng];
      } catch (error) {
        console.error('Error finding label position:', error);
        return null;
      }
    }, []);

    const onEachFeature = useCallback((feature, layer) => {
      layer.on({
        add: (e) => {
          if (feature.properties.postcodeInitials) {
            const labelPosition = findLabelPosition(feature);
            
            if (labelPosition) {
              const label = L.marker(labelPosition, {
                icon: L.divIcon({
                  className: 'postcode-label',
                  html: `<div style="
                    padding: 4px 8px;
                    font-size: 14px;
                    font-weight: bold;
                    color: #333;
                    white-space: nowrap;
                    line-height: 1;
                  ">${feature.properties.postcodeInitials}</div>`,
                  iconSize: [60, 30],
                  iconAnchor: [30, 15]
                }),
                interactive: false,
                zIndexOffset: 1000
              });
              label.addTo(e.target._map);
            }
          }
        },
        mouseover: async (e) => {
          try {
            console.log("SELECTED SERVICE------------", selectedService);
            if (selectedService === null) return;
            const locationId = feature.properties.locationId;
            const locationData = postcodeMap[feature.properties.postcodeInitials];
            console.log("LOCATION ID------------", locationId);
            console.log("LOCATION DATA------------", locationData);
            if (!locationId || !locationData) {
              layer.bindPopup(`<strong>${locationData?.city_name || 'Unknown Location'}</strong>`);
              layer.openPopup();
              return;
            }
    
            let popupContent = `
              <div class="location-services-popup">
                <h3 style="text-align: center; margin-bottom: 10px;">${locationData.city_name}</h3>
                <hr style="margin: 10px 0;">
            `;
    
            const servicesByBusiness = {};
            const availableServices = getServiceAvailability(locationId);
            
            // Filter services based on selection
            let servicesToDisplay = availableServices;
            if (selectedService !== 'all') {
              servicesToDisplay = availableServices.filter(service => service.id === selectedService);
            }
    
            servicesToDisplay.forEach(service => {
              const slotData = locationSlots[locationId]?.[service.id] || {
                totalSlots: 2,
                usedSlots: 0,
                businesses: []
              };
              
              slotData.businesses.forEach(business => {
                if (!servicesByBusiness[business.name]) {
                  servicesByBusiness[business.name] = [];
                }
                servicesByBusiness[business.name].push({
                  serviceName: service.name,
                  serviceColor: service.color,
                  slotsUsed: slotData.usedSlots,
                  totalSlots: slotData.totalSlots
                });
              });
            });
    
            // Build popup content
            Object.entries(servicesByBusiness).forEach(([businessName, businessServices]) => {
              popupContent += `
                <div class="business-services">
                  <h4>${businessName}</h4>
                  <ul style="list-style-type: none; padding: 0;">
              `;
              businessServices.forEach(service => {
                const availabilityClass = service.slotsUsed >= service.totalSlots 
                  ? 'service-full' 
                  : 'service-available';
                popupContent += `
                  <li>
                    <span class="service-dot ${availabilityClass}" 
                          style="background-color: ${service.serviceColor}"></span>
                    ${service.serviceName} (${service.slotsUsed}/${service.totalSlots} slots)
                  </li>
                `;
              });
              popupContent += `</ul></div>`;
            });
    
            if (Object.keys(servicesByBusiness).length === 0) {
              popupContent += `
                <div class="no-services">
                  <p>No ${selectedService === 'all' ? 'services' : 'slots'} allocated for this location</p>
                </div>
              `;
            }
    
            popupContent += `</div>`;
            layer.bindPopup(popupContent, { maxWidth: 300, className: 'location-services-tooltip' });
            layer.openPopup(e.latlng);
          } catch (err) {
            console.error('Error updating popup:', err);
            layer.bindPopup(`<strong>Error loading data</strong>`);
            layer.openPopup(e.latlng);
          }
        },
        mouseout: () => {
          if (layer._popup && !layer._popup._isOpen) {
            layer.closePopup();
          }
        },
        click: (e) => {
          if ((selectedService === 'all' || selectedService) && layer._popup) {
            layer.openPopup(e.latlng);
          }
        }
      });
    }, [selectedService, postcodeMap, locationSlots, services, findLabelPosition]);

    // Memoize the GeoJSON layers rendering
    const renderGeoJSONLayers = useCallback(() => {
      return processedGeoData.map((data, index) => (
        <GeoJSON
          key={`geojson-${index}-${selectedService}`} // Add selectedService to the key
          data={data}
          style={getFeatureStyle}
          onEachFeature={onEachFeature}
        />
      ));
    }, [processedGeoData, getFeatureStyle, onEachFeature, selectedService]);

    // Memoize the filtered clients
    const filteredClients = useMemo(() => {
      if (!selectedService) return clients;
      if (selectedService === 'all') return clients;
      return clients.filter(client => {
        const serviceIds = clientServices[client.id] || [];
        return serviceIds.includes(selectedService);
      });
    }, [clients, clientServices, selectedService]);

    useEffect(() => {
      if (processedGeoData.length > 0 && Object.keys(cityToLocationMap).length > 0) {
        const featureMap = {};
        processedGeoData.forEach(geojsonData => {
          geojsonData.features.forEach(feature => {
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
        });
      }
    }, [processedGeoData, cityToLocationMap, regionData]);
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
          const { data } = await supabase
            .from('locations')
            .select('id, region, postcode_initials, city_name');
          
          const postcodeMap = {};
          data.forEach(location => {
            postcodeMap[location.postcode_initials] = {
              region: location.region,
              id: location.id,
              city_name: location.city_name
            };
          });
          setPostcodeMap(postcodeMap);
        } catch (err) {
          console.error("Error fetching region data:", err);
        }
      };
      fetchRegionData();
    }, []);
    useEffect(() => {
      const fetchLocationSlots = async () => {
        try {
          const { data: slots, error } = await supabase
            .from('location_slot')
            .select(`
              id, 
              location_id, 
              service_id, 
              slot_number, 
              status, 
              client_id,
              clients!inner(business_name)
            `);
          if (error) throw error;
          const slotMap = {};
          slots.forEach(slot => {
            const locationId = slot.location_id;
            const serviceId = slot.service_id;
            if (!slotMap[locationId]) slotMap[locationId] = {};
            if (!slotMap[locationId][serviceId]) {
              slotMap[locationId][serviceId] = {
                totalSlots: 2, 
                usedSlots: 0,
                businesses: []
              };
            }
            if (slot.client_id) {
              slotMap[locationId][serviceId].usedSlots += 1;
              slotMap[locationId][serviceId].businesses.push({
                name: slot.clients?.business_name || 'Unknown Business'
              });
            }
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
      if (selectedClient) {
        setActiveMarkers(prev => [...prev, selectedClient.id]);
        setTimeout(() => {
          setActiveMarkers(prev => prev.filter(id => id !== selectedClient.id));
        }, 2000);
      }
  }, [selectedClient]);
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
    const handleServiceClick = useCallback((serviceId) => {
      if (selectedService === serviceId) {
        setSelectedService(null);
        setActiveMarkers([]);
        return;
      }
      setSelectedService(serviceId);
      const clientsWithService = [];
      Object.entries(clientServices).forEach(([clientId, serviceIds]) => {
        if (serviceId === 'all' || serviceIds.includes(serviceId)) {
          clientsWithService.push(clientId);
        }
      });
      setActiveMarkers(clientsWithService);
    }, [selectedService, clientServices]);
    const shouldAnimateMarker = (clientId) => {
      return activeMarkers.includes(clientId);
    };
    const handleClientSelect = (client) => {
      setSelectedClient(client);
    };

    // Add back the missing functions
    const getClientServiceColors = useCallback((clientId) => {
      if (!clientServices[clientId] || !services) return ['#114859']; 
      const serviceIds = clientServices[clientId];
      const colors = serviceIds
        .map(id => services[id]?.color || '#114859')
        .filter(color => color); 
      return colors.length > 0 ? colors : ['#114859'];
    }, [clientServices, services]);

    const getClientServiceNames = useCallback((clientId) => {
      if (!clientServices[clientId] || !services) return []; 
      return clientServices[clientId]
        .map(id => services[id]?.name)
        .filter(name => name); 
    }, [clientServices, services]);

    // Add back ServiceButtons component
    const ServiceButtons = useCallback(() => {
      return (
        <div className="service-buttons">
          <button 
            onClick={() => handleServiceClick('all')}
            className={`service-button ${selectedService === 'all' ? 'active' : ''}`}
            style={{ 
              color: '#114859',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ALL
          </button>
          {Object.values(services).map(service => (
            <button 
              key={service.id}
              onClick={() => handleServiceClick(service.id)}
              className={`service-button ${selectedService === service.id ? 'active' : ''}`}
              style={{ 
                color: service.color,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <LiaMapMarkerSolid 
                color={service.color} 
                size={16} 
                style={{ marginRight: '4px' }} 
              />
              {service.name}
            </button>
          ))}
        </div>
      );
    }, [services, selectedService, handleServiceClick]);

    return (
      <div>
        <div className="header">
          <div className="header-left">
            <img className="logo" src={Logo} alt="Logo" /> 
            <ClientSearch 
              clients={clients} 
              onSelectClient={handleClientSelect}
              mapRef={mapRef} 
            />
          </div>
          <div className="header-right">
            <ServiceButtons />
          </div>
        </div>
        {error && <div className="error-message">Error loading data: {error}</div>}
        {loading && <div className="loading-message">Loading map data...</div>}
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: "88vh", width: "100%" }}
          maxBounds={mapBounds}
          maxBoundsViscosity={1.0}
          zoomSnap={0.5}
          ref={mapRef}
        >
          <DynamicLabelSize />
          {renderGeoJSONLayers()}
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
          
          /* Search bar styling */
          .client-search-container {
            position: relative;
            width: 300px;
            margin-left: 20px; 
          }
          
          .search-input-wrapper {
            position: relative;
          }
          
          .client-search-input {
            width: 100%;
            padding: 10px 15px;
            border: 2px solid var(--border-color);
            border-radius: 8px;
            font-size: 16px;
            background-color: white;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            position: static; 
            right: auto; 
            width: 100%; 
          }
          
          .client-search-input:focus {
            outline: none;
            border-color: var(--secondary-color);
            box-shadow: 0 2px 8px rgba(44, 125, 160, 0.2);
          }

          .clear-search-button {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            font-size: 16px;
            cursor: pointer;
            color: #888;
          }
          
          .search-results {
            position: absolute;
            top: 100%;
            left: 0;
            width: 100%;
            max-height: 200px;
            overflow-y: auto;
            background-color: white;
            border: 1px solid #ccc;
            border-top: none;
            border-radius: 0 0 4px 4px;
            z-index: 1000;
            padding: 0;
            margin: 0;
            list-style: none;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          
          .search-result-item {
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid #eee;
          }
          
          .search-result-item:last-child {
            border-bottom: none;
          }
          
          .search-result-item:hover {
            background-color: #f5f5f5;
          }
          
          .postcode-label {
            background: none;
            border: none;
            box-shadow: none;
          }
          
          .postcode-label div {
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 500;
            font-size: 12px;
            color: #333;
            text-align: center;
            white-space: nowrap;
            transform-origin: center;
            pointer-events: none;
          }
        `}</style>
      </div>
    );
  };
  export default Map;