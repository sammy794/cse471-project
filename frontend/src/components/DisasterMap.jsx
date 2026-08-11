import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Home, Navigation, ShieldAlert, Truck, Warehouse } from 'lucide-react';
import { hasGoogleMapsApiKey, loadGoogleMaps } from '../services/googleMaps';

const BANGLADESH_CENTER = { lat: 23.685, lng: 90.3563 };

const asLatLngLiteral = (location) => {
  if (!location) return null;
  const lat = typeof location.lat === 'function' ? location.lat() : Number(location.lat);
  const lng = typeof location.lng === 'function' ? location.lng() : Number(location.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
};

const straightLineDistanceKm = (a, b) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const LegacyFallbackMap = ({ requests = [], reason }) => {
  const getMapXY = (lat, lng) => {
    const minLat = 20.5, maxLat = 26.6;
    const minLng = 88.0, maxLng = 92.6;
    const x = ((lng - minLng) / (maxLng - minLng)) * 700 + 50;
    const y = 600 - (((lat - minLat) / (maxLat - minLat)) * 500 + 50);
    return { x, y };
  };

  const mapHotspots = [
    { name: 'Sylhet', lat: 24.8949, lng: 91.8687, type: 'disaster' },
    { name: 'Sunamganj Shelter', lat: 25.0658, lng: 91.3950, type: 'shelter' },
    { name: 'Khulna Relief Depot', lat: 22.8456, lng: 89.5403, type: 'warehouse' },
    { name: 'Dhaka HQ', lat: 23.8103, lng: 90.4125, type: 'warehouse' },
    { name: 'Rajshahi', lat: 24.3636, lng: 88.6241, type: 'disaster' },
    { name: 'Chittagong Shelter', lat: 22.3569, lng: 91.7832, type: 'shelter' },
  ];

  return (
    <>
      <div style={{ marginBottom: '14px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)', color: '#fbbf24', borderRadius: '10px', padding: '12px 14px', fontSize: '0.85rem' }}>
        <AlertTriangle size={15} style={{ verticalAlign: 'middle', marginRight: '7px' }} />
        {reason} The existing offline DisasterNet map is shown as a fallback.
      </div>
      <div style={{ position: 'relative', width: '100%', height: '420px', background: '#0d1322', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <svg viewBox="0 0 800 600" style={{ width: '100%', height: '100%' }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <path d="M 220,120 L 340,90 L 480,100 L 580,150 L 620,240 L 590,320 L 650,420 L 610,530 L 520,560 L 430,500 L 320,530 L 250,460 L 220,380 L 150,300 L 160,200 Z" fill="rgba(30,58,138,0.15)" stroke="rgba(59,130,246,0.4)" strokeWidth="2" strokeDasharray="6,4" />
          {requests.filter((r) => r.status === 'In-Transit').map((req, idx) => {
            const startPos = getMapXY(24.8949, 91.8687);
            const endPos = getMapXY(req.destination_lat || 25.0658, req.destination_lng || 91.3950);
            return <line key={`route-${idx}`} x1={startPos.x} y1={startPos.y} x2={endPos.x} y2={endPos.y} stroke="#f59e0b" strokeWidth="3" strokeDasharray="8,6" />;
          })}
          {mapHotspots.map((pin, index) => {
            const { x, y } = getMapXY(pin.lat, pin.lng);
            const fill = pin.type === 'disaster' ? '#ef4444' : pin.type === 'warehouse' ? '#10b981' : '#3b82f6';
            return (
              <g key={index}>
                <circle cx={x} cy={y} r="14" fill={fill} stroke="white" strokeWidth="2" />
                <text x={x} y={y + 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">{pin.type === 'disaster' ? '!' : pin.type === 'warehouse' ? 'W' : 'S'}</text>
                <text x={x} y={y + 30} textAnchor="middle" fill="#e5e7eb" fontSize="11" fontWeight="600">{pin.name}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
};

export const DisasterMap = ({ disasters = [], inventories = [], requests = [] }) => {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const evacuationPolylinesRef = useRef([]);
  const deliveryPolylinesRef = useRef([]);
  const infoWindowRef = useRef(null);
  const [mapError, setMapError] = useState('');
  const [mapLoading, setMapLoading] = useState(true);
  const [facilities, setFacilities] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);

  const activeDisaster = useMemo(() => {
    return disasters.find((item) => item.status === 'Active') || disasters[0] || null;
  }, [disasters]);

  const routeOrigin = useMemo(() => {
    if (!activeDisaster) return BANGLADESH_CENTER;
    const lat = Number(activeDisaster.lat);
    const lng = Number(activeDisaster.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : BANGLADESH_CENTER;
  }, [activeDisaster]);

  useEffect(() => {
    let cancelled = false;

    const clearMarkers = () => {
      markersRef.current.forEach((marker) => marker.setMap?.(null));
      markersRef.current = [];
    };

    const clearPolylines = (collectionRef) => {
      collectionRef.current.forEach((polyline) => polyline.setMap?.(null));
      collectionRef.current = [];
    };

    const addMarker = (google, map, position, title, label, color, html, onClick) => {
      const marker = new google.maps.Marker({
        map,
        position,
        title,
        label: label ? { text: label, color: 'white', fontWeight: '700' } : undefined,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 12,
        },
      });
      marker.addListener('click', () => {
        if (html) {
          infoWindowRef.current.setContent(html);
          infoWindowRef.current.open({ map, anchor: marker });
        }
        if (onClick) onClick();
      });
      markersRef.current.push(marker);
      return marker;
    };

    const drawRoute = async (origin, destination, kind = 'evacuation', facility = null) => {
      const { Route } = await window.google.maps.importLibrary('routes');
      const { routes } = await Route.computeRoutes({
        origin,
        destination,
        travelMode: 'DRIVING',
        fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
      });
      if (!routes?.length) return null;

      const route = routes[0];
      const polylines = route.createPolylines({
        polylineOptions: {
          strokeColor: kind === 'delivery' ? '#f59e0b' : '#22c55e',
          strokeOpacity: 0.9,
          strokeWeight: kind === 'delivery' ? 5 : 6,
        },
      });
      polylines.forEach((polyline) => polyline.setMap(mapRef.current));

      if (kind === 'delivery') {
        deliveryPolylinesRef.current.push(...polylines);
      } else {
        clearPolylines(evacuationPolylinesRef);
        evacuationPolylinesRef.current.push(...polylines);
        setRouteSummary({
          facility: facility?.name || 'Emergency facility',
          type: facility?.type || 'facility',
          distanceKm: route.distanceMeters ? (route.distanceMeters / 1000).toFixed(1) : null,
          minutes: route.durationMillis ? Math.max(1, Math.round(route.durationMillis / 60000)) : null,
        });
      }
      return route;
    };

    const initGoogleMap = async () => {
      if (!hasGoogleMapsApiKey()) {
        setMapError('Google Maps API key is not configured. Run SET_GOOGLE_MAPS_API_KEY.bat, then restart the app.');
        setMapLoading(false);
        return;
      }

      try {
        setMapLoading(true);
        setMapError('');
        await loadGoogleMaps();
        if (cancelled || !mapElementRef.current) return;

        const google = window.google;
        const [{ Map, InfoWindow }, { Place, SearchNearbyRankPreference }] = await Promise.all([
          google.maps.importLibrary('maps'),
          google.maps.importLibrary('places'),
          google.maps.importLibrary('marker'),
        ]);

        if (!mapRef.current) {
          mapRef.current = new Map(mapElementRef.current, {
            center: routeOrigin,
            zoom: activeDisaster ? 10 : 7,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            gestureHandling: 'greedy',
            styles: [
              { elementType: 'geometry', stylers: [{ color: '#172033' }] },
              { elementType: 'labels.text.stroke', stylers: [{ color: '#172033' }] },
              { elementType: 'labels.text.fill', stylers: [{ color: '#a8b3c7' }] },
              { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d3b55' }] },
              { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#d1d5db' }] },
              { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b2545' }] },
            ],
          });
          infoWindowRef.current = new InfoWindow();
        } else {
          mapRef.current.setCenter(routeOrigin);
        }

        clearMarkers();
        clearPolylines(evacuationPolylinesRef);
        clearPolylines(deliveryPolylinesRef);
        setRouteSummary(null);

        disasters.forEach((disaster) => {
          const lat = Number(disaster.lat);
          const lng = Number(disaster.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          addMarker(
            google,
            mapRef.current,
            { lat, lng },
            disaster.title,
            '!',
            '#ef4444',
            `<div style="max-width:260px"><strong>${disaster.title}</strong><br/>${disaster.disaster_type} · ${disaster.severity}<br/>Affected: ${disaster.affected_districts}<br/>Status: ${disaster.status}</div>`,
          );
        });

        inventories.forEach((item) => {
          const lat = Number(item.warehouse_lat);
          const lng = Number(item.warehouse_lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          addMarker(
            google,
            mapRef.current,
            { lat, lng },
            item.warehouse_location,
            'W',
            '#10b981',
            `<div style="max-width:260px"><strong>${item.warehouse_location}</strong><br/>${item.organization_name}<br/>${item.item_name}: ${item.quantity} ${item.unit}</div>`,
          );
        });

        let hospitals = [];
        let shelters = [];

        try {
          const hospitalResult = await Place.searchNearby({
            fields: ['id', 'displayName', 'location', 'formattedAddress', 'googleMapsURI'],
            locationRestriction: { center: routeOrigin, radius: 50000 },
            includedPrimaryTypes: ['hospital'],
            maxResultCount: 8,
            rankPreference: SearchNearbyRankPreference.DISTANCE,
          });
          hospitals = (hospitalResult.places || []).map((place) => ({
            id: place.id,
            name: place.displayName || 'Hospital',
            type: 'hospital',
            location: asLatLngLiteral(place.location),
            address: place.formattedAddress || '',
            googleMapsURI: place.googleMapsURI,
          })).filter((item) => item.location);
        } catch (error) {
          console.warn('Google hospital search failed:', error);
        }

        try {
          const queries = ['disaster shelter', 'cyclone shelter'];
          const shelterResults = await Promise.all(queries.map((textQuery) => Place.searchByText({
            textQuery,
            fields: ['id', 'displayName', 'location', 'formattedAddress', 'googleMapsURI'],
            locationBias: routeOrigin,
            maxResultCount: 6,
            region: 'bd',
            language: 'en-US',
          })));
          const seen = new Set();
          shelters = shelterResults.flatMap((result) => result.places || []).map((place) => ({
            id: place.id,
            name: place.displayName || 'Emergency Shelter',
            type: 'shelter',
            location: asLatLngLiteral(place.location),
            address: place.formattedAddress || '',
            googleMapsURI: place.googleMapsURI,
          })).filter((item) => {
            if (!item.location || seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          }).slice(0, 10);
        } catch (error) {
          console.warn('Google shelter search failed:', error);
        }

        if (cancelled) return;
        const allFacilities = [...shelters, ...hospitals];
        setFacilities(allFacilities);

        allFacilities.forEach((facility) => {
          const color = facility.type === 'hospital' ? '#06b6d4' : '#3b82f6';
          const label = facility.type === 'hospital' ? 'H' : 'S';
          addMarker(
            google,
            mapRef.current,
            facility.location,
            facility.name,
            label,
            color,
            `<div style="max-width:280px"><strong>${facility.name}</strong><br/>${facility.type === 'hospital' ? 'Hospital' : 'Emergency Shelter'}<br/>${facility.address || 'Google Maps facility'}<br/><em>Click marker to calculate an evacuation route.</em></div>`,
            () => {
              drawRoute(routeOrigin, facility.location, 'evacuation', facility).catch((error) => {
                console.error('Evacuation route failed:', error);
                setMapError(`Google route calculation failed: ${error.message}`);
              });
            },
          );
        });

        if (activeDisaster && allFacilities.length) {
          const nearest = [...allFacilities].sort((a, b) => straightLineDistanceKm(routeOrigin, a.location) - straightLineDistanceKm(routeOrigin, b.location))[0];
          try {
            await drawRoute(routeOrigin, nearest.location, 'evacuation', nearest);
          } catch (error) {
            console.warn('Automatic evacuation route failed:', error);
          }
        }

        const activeDeliveries = requests.filter((request) => request.status === 'In-Transit').slice(0, 5);
        for (const request of activeDeliveries) {
          const warehouse = inventories.find((item) => request.assigned_warehouse?.includes(item.warehouse_location));
          if (!warehouse) continue;
          const origin = { lat: Number(warehouse.warehouse_lat), lng: Number(warehouse.warehouse_lng) };
          const destination = { lat: Number(request.destination_lat), lng: Number(request.destination_lng) };
          if (![origin.lat, origin.lng, destination.lat, destination.lng].every(Number.isFinite)) continue;
          try {
            await drawRoute(origin, destination, 'delivery');
          } catch (error) {
            console.warn(`Delivery route #${request.id} could not be drawn:`, error);
          }
        }
      } catch (error) {
        console.error('Google Maps initialization failed:', error);
        if (!cancelled) setMapError(error.message || 'Google Maps could not be loaded.');
      } finally {
        if (!cancelled) setMapLoading(false);
      }
    };

    initGoogleMap();
    return () => {
      cancelled = true;
    };
  }, [activeDisaster, disasters, inventories, requests, routeOrigin]);

  return (
    <div className="glass-card" style={{ padding: '24px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '18px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Navigation color="#3b82f6" /> Google Disaster Map & Emergency Facility Locator
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#9ca3af', marginTop: '4px' }}>
            Affected areas, nearby hospitals/shelters, evacuation routing and active relief-delivery routes.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', background: 'rgba(31,41,55,0.6)', padding: '8px 14px', borderRadius: '10px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f87171' }}><ShieldAlert size={14} /> Disaster</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399' }}><Warehouse size={14} /> Warehouse</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#60a5fa' }}><Home size={14} /> Shelter / Hospital</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}><Truck size={14} /> Delivery Route</span>
        </div>
      </div>

      {mapError ? (
        <LegacyFallbackMap requests={requests} reason={mapError} />
      ) : (
        <>
          {mapLoading && (
            <div style={{ marginBottom: '12px', color: '#93c5fd', fontSize: '0.85rem' }}>Loading Google Maps, facilities and routes…</div>
          )}
          <div ref={mapElementRef} style={{ width: '100%', height: '500px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', background: '#0d1322' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '16px' }}>
            <div style={{ background: 'rgba(31,41,55,0.7)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ color: 'white', fontWeight: 700, marginBottom: '6px' }}>Nearest Emergency Facilities</div>
              <div style={{ color: '#9ca3af', fontSize: '0.82rem' }}>
                Google Places found {facilities.filter((item) => item.type === 'shelter').length} shelters and {facilities.filter((item) => item.type === 'hospital').length} hospitals near the active disaster.
              </div>
            </div>
            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ color: '#86efac', fontWeight: 700, marginBottom: '6px' }}>Suggested Evacuation Route</div>
              <div style={{ color: '#d1d5db', fontSize: '0.82rem' }}>
                {routeSummary
                  ? `${routeSummary.facility}${routeSummary.distanceKm ? ` · ${routeSummary.distanceKm} km` : ''}${routeSummary.minutes ? ` · ~${routeSummary.minutes} min` : ''}. Click another facility marker to recalculate.`
                  : 'A route will be drawn to the nearest Google Maps shelter/hospital when routing data is available.'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
