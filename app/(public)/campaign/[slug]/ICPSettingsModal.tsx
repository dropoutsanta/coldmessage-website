'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CampaignData } from '@/lib/types';

interface ICPSettings {
  domain: string;
  titles: string[];
  companySize: string;
  industries: string[];
  locations: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: ICPSettings;
  slug: string;
  onSave: (campaign: CampaignData) => void;
}

const titleOptions = [
  'CEO',
  'Founder',
  'Co-Founder',
  'CTO',
  'COO',
  'CMO',
  'VP of Sales',
  'VP of Marketing',
  'Head of Growth',
  'Director of Sales',
  'Sales Manager',
];

const companySizeOptions = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '500+ employees',
];

const industryOptions = [
  'SaaS',
  'Tech',
  'Agency',
  'E-commerce',
  'Healthcare',
  'Finance',
  'Real Estate',
  'Manufacturing',
  'Professional Services',
  'Education',
];

const locationOptions = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Germany',
  'France',
  'Europe',
  'Global',
];

export default function ICPSettingsModal({ isOpen, onClose, currentSettings, slug, onSave }: Props) {
  const [domain, setDomain] = useState(currentSettings.domain);
  const [titles, setTitles] = useState<string[]>(currentSettings.titles);
  const [companySize, setCompanySize] = useState(currentSettings.companySize);
  const [industries, setIndustries] = useState<string[]>(currentSettings.industries);
  const [locations, setLocations] = useState<string[]>(currentSettings.locations);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleTitle = (title: string) => {
    setTitles(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const toggleIndustry = (industry: string) => {
    setIndustries(prev =>
      prev.includes(industry)
        ? prev.filter(i => i !== industry)
        : [...prev, industry]
    );
  };

  const toggleLocation = (location: string) => {
    setLocations(prev =>
      prev.includes(location)
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!domain.trim()) {
      setError('Domain is required');
      return;
    }

    if (titles.length === 0) {
      setError('Select at least one title');
      return;
    }

    if (industries.length === 0) {
      setError('Select at least one industry');
      return;
    }

    if (locations.length === 0) {
      setError('Select at least one location');
      return;
    }

    setIsLoading(true);

    try {
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      
      const response = await fetch('/api/generate-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: cleanDomain,
          slug,
          icpSettings: {
            titles,
            companySize,
            industries,
            locations,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update campaign');
      }

      const data = await response.json();
      
      if (data.success && data.campaign) {
        onSave(data.campaign);
        onClose();
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Edit Campaign Settings</h2>
              <p className="text-sm text-slate-500">Update your domain or ICP to regenerate leads</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Domain */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Company Domain
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="yourcompany.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none transition-all text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Titles */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Target Titles
              </label>
              <div className="flex flex-wrap gap-2">
                {titleOptions.map(title => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => toggleTitle(title)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      titles.includes(title)
                        ? 'bg-sky-500 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {title}
                  </button>
                ))}
              </div>
            </div>

            {/* Company Size */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Company Size
              </label>
              <div className="flex flex-wrap gap-2">
                {companySizeOptions.map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setCompanySize(size)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      companySize === size
                        ? 'bg-sky-500 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Industries */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Target Industries
              </label>
              <div className="flex flex-wrap gap-2">
                {industryOptions.map(industry => (
                  <button
                    key={industry}
                    type="button"
                    onClick={() => toggleIndustry(industry)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      industries.includes(industry)
                        ? 'bg-sky-500 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {industry}
                  </button>
                ))}
              </div>
            </div>

            {/* Locations */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Target Locations
              </label>
              <div className="flex flex-wrap gap-2">
                {locationOptions.map(location => (
                  <button
                    key={location}
                    type="button"
                    onClick={() => toggleLocation(location)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      locations.includes(location)
                        ? 'bg-sky-500 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {location}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Regenerating...</span>
                  </>
                ) : (
                  'Save & Regenerate'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

