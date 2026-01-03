'use client';

import { memo } from 'react';
import { 
  Building2, 
  Target, 
  Lightbulb, 
  Users, 
  Sparkles,
  Briefcase,
  MapPin,
  TrendingUp,
  MessageSquare
} from 'lucide-react';

interface FieldConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  colorClass: string;
}

interface Props {
  parsedFields: Record<string, unknown>; // PRE-PARSED from server - no client parsing!
  agentName: string;
  isStreaming: boolean;
}

// Field configurations for each agent type
const AGENT_FIELDS: Record<string, FieldConfig[]> = {
  'Company Profiler': [
    { key: 'name', label: 'Company', icon: <Building2 className="w-3.5 h-3.5" />, colorClass: 'sky' },
    { key: 'tagline', label: 'Tagline', icon: <MessageSquare className="w-3.5 h-3.5" />, colorClass: 'violet' },
    { key: 'productOrService', label: 'Product', icon: <Sparkles className="w-3.5 h-3.5" />, colorClass: 'amber' },
    { key: 'problemTheySolve', label: 'Problem Solved', icon: <Target className="w-3.5 h-3.5" />, colorClass: 'rose' },
    { key: 'targetMarket', label: 'Target Market', icon: <Users className="w-3.5 h-3.5" />, colorClass: 'emerald' },
    { key: 'industry', label: 'Industry', icon: <Briefcase className="w-3.5 h-3.5" />, colorClass: 'indigo' },
    { key: 'pricingModel', label: 'Pricing', icon: <TrendingUp className="w-3.5 h-3.5" />, colorClass: 'purple' },
    { key: 'competitiveAdvantage', label: 'Advantage', icon: <Lightbulb className="w-3.5 h-3.5" />, colorClass: 'sky' },
  ],
  'ICP Brainstormer': [
    { key: 'personas', label: 'Buyer Personas', icon: <Users className="w-3.5 h-3.5" />, colorClass: 'purple' },
    { key: 'reasoning', label: 'Strategic Reasoning', icon: <Lightbulb className="w-3.5 h-3.5" />, colorClass: 'amber' },
  ],
  'Cold Email Ranker': [
    { key: 'evaluations', label: 'Evaluations', icon: <Target className="w-3.5 h-3.5" />, colorClass: 'indigo' },
    { key: 'selectedPersonaName', label: 'Best Persona', icon: <TrendingUp className="w-3.5 h-3.5" />, colorClass: 'emerald' },
    { key: 'selectionReasoning', label: 'Why Selected', icon: <Lightbulb className="w-3.5 h-3.5" />, colorClass: 'amber' },
  ],
  'LinkedIn Filter Builder': [
    { key: 'titles', label: 'Job Titles', icon: <Briefcase className="w-3.5 h-3.5" />, colorClass: 'sky' },
    { key: 'industries', label: 'Industries', icon: <Building2 className="w-3.5 h-3.5" />, colorClass: 'violet' },
    { key: 'locations', label: 'Locations', icon: <MapPin className="w-3.5 h-3.5" />, colorClass: 'rose' },
    { key: 'companySize', label: 'Company Size', icon: <Users className="w-3.5 h-3.5" />, colorClass: 'emerald' },
  ],
};

// Color style mappings (static to avoid re-creation)
const COLOR_STYLES: Record<string, { bg: string; border: string; icon: string; text: string; badge: string }> = {
  sky: { bg: 'bg-sky-50', border: 'border-sky-200', icon: 'text-sky-500', text: 'text-sky-700', badge: 'bg-sky-100 text-sky-700 border-sky-200' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'text-violet-500', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700 border-violet-200' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'text-rose-500', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-700 border-rose-200' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-500', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-500', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
};

// Memoized field component - only re-renders when its specific value changes
const StreamingField = memo(function StreamingField({ 
  config, 
  value, 
  isLoading 
}: { 
  config: FieldConfig; 
  value: unknown; 
  isLoading: boolean;
}) {
  const colors = COLOR_STYLES[config.colorClass] || COLOR_STYLES.sky;
  
  const hasValue = value !== null && value !== undefined && 
    (Array.isArray(value) ? value.length > 0 : String(value).length > 0);

  // Render value content based on data type
  const renderValue = () => {
    if (!hasValue) return null;
    
    // Array handling
    if (Array.isArray(value) && value.length > 0) {
      const firstItem = value[0];
      
      // Personas array (has name, titles, etc.)
      if (typeof firstItem === 'object' && 'name' in firstItem && 'titles' in firstItem) {
        return (
          <div className="space-y-1.5">
            {value.slice(0, 4).map((persona: { name?: string; titles?: string[] }, i) => (
              <div key={i} className="flex items-center gap-2 animate-fadeIn" style={{ animationDelay: `${i * 50}ms` }}>
                <span className={`w-5 h-5 rounded-full ${colors.bg} ${colors.text} text-[10px] font-bold flex items-center justify-center shrink-0`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className={`${colors.text} font-medium text-sm block truncate`}>{persona.name}</span>
                  {persona.titles && persona.titles.length > 0 && (
                    <span className="text-slate-400 text-[10px] truncate block">{persona.titles.slice(0, 2).join(', ')}</span>
                  )}
                </div>
              </div>
            ))}
            {value.length > 4 && <span className="text-slate-400 text-xs">+{value.length - 4} more</span>}
          </div>
        );
      }
      
      // Evaluations array (has personaName, overallScore)
      if (typeof firstItem === 'object' && 'personaName' in firstItem && 'overallScore' in firstItem) {
        return (
          <div className="space-y-1.5">
            {value.slice(0, 4).map((eval_: { personaName?: string; overallScore?: number }, i) => (
              <div key={i} className="flex items-center gap-2 animate-fadeIn" style={{ animationDelay: `${i * 50}ms` }}>
                <span className={`w-5 h-5 rounded-full ${colors.bg} ${colors.text} text-[10px] font-bold flex items-center justify-center shrink-0`}>
                  {i + 1}
                </span>
                <span className={`${colors.text} font-medium text-sm flex-1 truncate`}>{eval_.personaName}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${colors.badge}`}>
                  {eval_.overallScore?.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        );
      }
      
      // Industries/Locations array (objects with 'text' or 'name' property)
      if (typeof firstItem === 'object' && ('text' in firstItem || 'name' in firstItem)) {
        return (
          <div className="flex flex-wrap gap-1.5">
            {value.slice(0, 4).map((item: { text?: string; name?: string; id?: string }, i) => (
              <span
                key={i}
                className={`px-2 py-0.5 text-xs rounded-md border ${colors.badge} animate-fadeIn`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                {item.text || item.name}
              </span>
            ))}
            {value.length > 4 && (
              <span className="text-slate-400 text-xs self-center">+{value.length - 4}</span>
            )}
          </div>
        );
      }
      
      // Simple array of strings
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.slice(0, 6).map((item, i) => (
            <span
              key={i}
              className={`px-2 py-0.5 text-xs rounded-md border ${colors.badge} animate-fadeIn`}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {String(item)}
            </span>
          ))}
          {value.length > 6 && (
            <span className="text-slate-400 text-xs self-center">+{value.length - 6}</span>
          )}
        </div>
      );
    }
    
    // String value
    return (
      <span className={`${colors.text} font-medium text-sm animate-fadeIn leading-snug`}>
        {String(value)}
      </span>
    );
  };

  return (
    <div
      className={`rounded-lg border p-3 transition-colors duration-200 ${
        hasValue 
          ? `${colors.bg} ${colors.border}` 
          : 'bg-slate-50/50 border-slate-200 border-dashed'
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={hasValue ? colors.icon : 'text-slate-300'}>
          {config.icon}
        </span>
        <span className={`text-[10px] font-bold uppercase tracking-wider ${
          hasValue ? colors.text : 'text-slate-400'
        }`}>
          {config.label}
        </span>
        {isLoading && !hasValue && (
          <span className="text-[10px] text-slate-400 animate-pulse">
            waiting...
          </span>
        )}
      </div>
      
      {hasValue ? (
        <div className="text-sm">{renderValue()}</div>
      ) : (
        <div className="space-y-1.5">
          <div className="h-4 bg-slate-100 rounded w-3/4 animate-pulse" />
        </div>
      )}
    </div>
  );
});

/**
 * StreamingFieldsDisplay - displays PRE-PARSED fields from server
 * NO CLIENT-SIDE PARSING! All parsing done server-side for performance.
 */
function StreamingFieldsDisplay({ parsedFields, agentName, isStreaming }: Props) {
  const fields = AGENT_FIELDS[agentName] || [];
  
  // Count filled fields - simple object property check, no parsing!
  const filledCount = fields.filter(f => {
    const val = parsedFields[f.key];
    return val !== undefined && (Array.isArray(val) ? val.length > 0 : String(val).length > 0);
  }).length;

  // Fallback for unknown agents - just show field count
  if (fields.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="text-slate-500 text-sm">
          {Object.keys(parsedFields).length} fields received
        </div>
        {isStreaming && (
          <span className="inline-block w-1.5 h-3.5 bg-amber-500 ml-0.5 align-middle animate-pulse mt-2" />
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Progress header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          {isStreaming && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
          <span className="text-xs font-semibold text-slate-500">
            {filledCount}/{fields.length} fields
          </span>
        </div>
        {isStreaming && (
          <span className="text-[10px] text-amber-600 font-medium">
            Generating...
          </span>
        )}
      </div>

      {/* Fields list - just renders pre-parsed data! */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {fields.map((field) => (
          <StreamingField
            key={field.key}
            config={field}
            value={parsedFields[field.key]}
            isLoading={isStreaming}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(StreamingFieldsDisplay);
