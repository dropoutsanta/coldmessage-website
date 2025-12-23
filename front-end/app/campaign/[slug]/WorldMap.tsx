'use client';

import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { TargetGeo } from '@/lib/supabase';

const usGeoUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
const worldGeoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// US state name to abbreviation mapping
const stateNameToAbbr: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
  'District of Columbia': 'DC',
};

// City coordinates
const cityCoordinates: Record<string, [number, number]> = {
  'San Francisco': [-122.4194, 37.7749],
  'New York': [-74.006, 40.7128],
  'Los Angeles': [-118.2437, 34.0522],
  'Chicago': [-87.6298, 41.8781],
  'Boston': [-71.0589, 42.3601],
  'Seattle': [-122.3321, 47.6062],
  'Austin': [-97.7431, 30.2672],
  'Miami': [-80.1918, 25.7617],
  'Denver': [-104.9903, 39.7392],
  'Atlanta': [-84.388, 33.749],
  'Dallas': [-96.797, 32.7767],
  'Phoenix': [-112.074, 33.4484],
  'Philadelphia': [-75.1652, 39.9526],
  'Houston': [-95.3698, 29.7604],
  'Washington DC': [-77.0369, 38.9072],
  'San Diego': [-117.1611, 32.7157],
  'Portland': [-122.6765, 45.5152],
  'Nashville': [-86.7816, 36.1627],
  'Salt Lake City': [-111.891, 40.7608],
  'Minneapolis': [-93.265, 44.9778],
};

// Country name variations to Natural Earth name mapping (used in world-atlas)
// The world-atlas uses Natural Earth country names
const countryNameMappings: Record<string, string> = {
  // North America
  'United States of America': 'United States of America',
  'United States': 'United States of America',
  'USA': 'United States of America',
  'US': 'United States of America',
  'Canada': 'Canada',
  'Mexico': 'Mexico',
  
  // Europe
  'United Kingdom': 'United Kingdom',
  'UK': 'United Kingdom',
  'Great Britain': 'United Kingdom',
  'Germany': 'Germany',
  'France': 'France',
  'Italy': 'Italy',
  'Spain': 'Spain',
  'Netherlands': 'Netherlands',
  'Belgium': 'Belgium',
  'Switzerland': 'Switzerland',
  'Austria': 'Austria',
  'Sweden': 'Sweden',
  'Norway': 'Norway',
  'Denmark': 'Denmark',
  'Finland': 'Finland',
  'Poland': 'Poland',
  'Ireland': 'Ireland',
  'Portugal': 'Portugal',
  'Czech Republic': 'Czech Republic',
  'Czechia': 'Czech Republic',
  'Greece': 'Greece',
  'Romania': 'Romania',
  'Hungary': 'Hungary',
  
  // Asia Pacific
  'Australia': 'Australia',
  'New Zealand': 'New Zealand',
  'Japan': 'Japan',
  'South Korea': 'South Korea',
  'Korea': 'South Korea',
  'China': 'China',
  'India': 'India',
  'Singapore': 'Singapore',
  'Hong Kong': 'Hong Kong',
  'Indonesia': 'Indonesia',
  'Thailand': 'Thailand',
  'Vietnam': 'Vietnam',
  'Malaysia': 'Malaysia',
  'Philippines': 'Philippines',
  
  // Middle East
  'Israel': 'Israel',
  'United Arab Emirates': 'United Arab Emirates',
  'UAE': 'United Arab Emirates',
  'Saudi Arabia': 'Saudi Arabia',
  'Qatar': 'Qatar',
  
  // South America
  'Brazil': 'Brazil',
  'Argentina': 'Argentina',
  'Chile': 'Chile',
  'Colombia': 'Colombia',
  'Peru': 'Peru',
  
  // Africa
  'South Africa': 'South Africa',
  'Nigeria': 'Nigeria',
  'Egypt': 'Egypt',
  'Kenya': 'Kenya',
};

interface WorldMapProps {
  targetGeo: TargetGeo;
}

export default function WorldMap({ targetGeo }: WorldMapProps) {
  if (targetGeo.region === 'us') {
    return <USMap states={targetGeo.states || []} cities={targetGeo.cities || []} />;
  }
  
  return <WorldMapView countries={targetGeo.countries || []} />;
}

// US Map Component
function USMap({ states, cities }: { states: string[]; cities: string[] }) {
  const highlightedStates = new Set(states.map(s => s.toUpperCase()));
  
  const cityMarkers = cities
    .filter(city => cityCoordinates[city])
    .map(city => ({
      name: city,
      coordinates: cityCoordinates[city],
    }));

  return (
    <div className="w-full h-full relative">
      {/* Dropshadow filter def */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="map-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
            <feOffset dx="0" dy="1" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.15" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 900 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography={usGeoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const stateName = geo.properties.name;
              const stateAbbr = stateNameToAbbr[stateName];
              const isHighlighted = stateAbbr && highlightedStates.has(stateAbbr);
              
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  filter="url(#map-shadow)"
                  fill={isHighlighted ? '#e0f2fe' : '#ffffff'}
                  stroke={isHighlighted ? '#7dd3fc' : '#cbd5e1'}
                  strokeWidth={isHighlighted ? 1.5 : 0.75}
                  style={{
                    default: { outline: 'none' },
                    hover: { 
                      outline: 'none', 
                      fill: isHighlighted ? '#bae6fd' : '#f8fafc',
                      stroke: isHighlighted ? '#38bdf8' : '#94a3b8' 
                    },
                    pressed: { outline: 'none' },
                  }}
                />
              );
            })
          }
        </Geographies>
        
        {/* City Markers */}
        {cityMarkers.map((city, index) => (
          <Marker key={city.name} coordinates={city.coordinates}>
            {/* White halo */}
            <circle
              r={5}
              fill="#fff"
              stroke="#cbd5e1"
              strokeWidth={1}
            />
            {/* Blue dot */}
            <circle
              r={3}
              fill="#0ea5e9"
              stroke="none"
            />
            
            {/* City Label */}
            <text
              textAnchor="middle"
              y={-12}
              style={{
                fontFamily: 'system-ui',
                fontSize: 10,
                fontWeight: 700,
                fill: '#0f172a',
                textShadow: '0 2px 4px rgba(255,255,255,1)',
                pointerEvents: 'none'
              }}
            >
              {city.name}
            </text>
          </Marker>
        ))}
      </ComposableMap>
    </div>
  );
}

// World Map Component
function WorldMapView({ countries }: { countries: string[] }) {
  // Build a set of normalized country names for matching
  const highlightedCountries = new Set<string>();
  
  for (const country of countries) {
    // Add the original name (case-insensitive matching later)
    highlightedCountries.add(country.toLowerCase());
    
    // Also add the mapped Natural Earth name if we have one
    const mapped = countryNameMappings[country];
    if (mapped) {
      highlightedCountries.add(mapped.toLowerCase());
    }
  }

  return (
    <div className="w-full h-full relative">
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="world-map-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
            <feOffset dx="0" dy="1" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.15" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 120,
          center: [0, 30],
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography={worldGeoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const countryName = geo.properties.name || '';
              // Check if this country should be highlighted (case-insensitive)
              const isHighlighted = highlightedCountries.has(countryName.toLowerCase());
              
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  filter="url(#world-map-shadow)"
                  fill={isHighlighted ? '#e0f2fe' : '#ffffff'}
                  stroke={isHighlighted ? '#7dd3fc' : '#cbd5e1'}
                  strokeWidth={isHighlighted ? 1 : 0.5}
                  style={{
                    default: { outline: 'none' },
                    hover: { 
                      outline: 'none', 
                      fill: isHighlighted ? '#bae6fd' : '#f8fafc',
                      stroke: isHighlighted ? '#38bdf8' : '#94a3b8' 
                    },
                    pressed: { outline: 'none' },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}
