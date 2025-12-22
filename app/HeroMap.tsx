'use client';

import { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { motion } from 'framer-motion';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Major business hubs for realistic-looking activity
const markers = [
  { name: "New York", coordinates: [-74.006, 40.7128] },
  { name: "London", coordinates: [-0.1276, 51.5074] },
  { name: "San Francisco", coordinates: [-122.4194, 37.7749] },
  { name: "Singapore", coordinates: [103.8198, 1.3521] },
  { name: "Berlin", coordinates: [13.4050, 52.5200] },
  { name: "Sydney", coordinates: [151.2093, -33.8688] },
  { name: "Tokyo", coordinates: [139.6917, 35.6895] },
  { name: "Paris", coordinates: [2.3522, 48.8566] },
  { name: "Toronto", coordinates: [-79.3832, 43.6532] },
  { name: "Dubai", coordinates: [55.2708, 25.2048] },
  { name: "Sao Paulo", coordinates: [-46.6333, -23.5505] },
  { name: "Mumbai", coordinates: [72.8777, 19.0760] }
];

export default function HeroMap() {
  const [activeMarkers, setActiveMarkers] = useState<number[]>([]);

  // Randomly activate markers
  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * markers.length);
      setActiveMarkers(prev => {
        const newMarkers = [...prev, randomIndex];
        // Keep only last 5
        if (newMarkers.length > 5) return newMarkers.slice(1);
        return newMarkers;
      });
      
      // Remove the marker after animation
      setTimeout(() => {
        setActiveMarkers(prev => prev.filter(i => i !== randomIndex));
      }, 2000);
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-sky-50/50 to-transparent rounded-full blur-3xl -z-10" />

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 140,
          center: [0, 20]
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#f1f5f9"
                stroke="#e2e8f0"
                strokeWidth={0.5}
                style={{
                  default: { outline: 'none' },
                  hover: { fill: '#e2e8f0', outline: 'none' },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>

        {markers.map((marker, index) => {
          const isActive = activeMarkers.includes(index);
          return (
             <Marker key={index} coordinates={marker.coordinates as [number, number]}>
                <circle r={2} fill="#cbd5e1" />
                
                {isActive && (
                  <g>
                    <motion.circle
                      r={4}
                      fill="none"
                      stroke="#0ea5e9"
                      strokeWidth={1}
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: 4, opacity: 0 }}
                      transition={{ duration: 1.5 }}
                    />
                    <circle r={3} fill="#0ea5e9" />
                  </g>
                )}
             </Marker>
          );
        })}
        
        {/* Connecting Lines (Simulated) */}
        <line x1="25%" y1="40%" x2="48%" y2="35%" stroke="#0ea5e9" strokeWidth="1" strokeOpacity="0.1" />
        <line x1="48%" y1="35%" x2="80%" y2="45%" stroke="#0ea5e9" strokeWidth="1" strokeOpacity="0.1" />
      </ComposableMap>
      
      {/* Overlay Badge */}
      <div className="absolute bottom-10 right-10 bg-white/90 backdrop-blur shadow-lg border border-slate-100 rounded-lg px-4 py-2 flex items-center gap-3 animate-fade-in-up">
         <div className="flex -space-x-2">
           <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white" />
           <div className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white" />
           <div className="w-6 h-6 rounded-full bg-slate-400 border-2 border-white" />
         </div>
         <div className="text-xs">
            <p className="font-bold text-slate-900">1,240+ Active Campaigns</p>
            <p className="text-slate-500">Sending right now</p>
         </div>
      </div>
    </div>
  );
}

