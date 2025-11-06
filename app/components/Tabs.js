'use client';

import React from 'react';

export const Tabs = ({ activeTab, onTabChange, tabs }) => {
  return (
    <div className="flex bg-gray-700 rounded-lg p-1 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
            activeTab === tab.id
              ? ''
              : 'text-gray-300 hover:text-white hover:bg-gray-600 hover:scale-102'
          }`}
          style={activeTab === tab.id ? { backgroundColor: '#FBBF24', color: '#0ea5ff', boxShadow: '0 6px 18px rgba(0,0,0,0.08)', transform: 'scale(1.03)' } : undefined}
        >
          {tab.icon && <tab.icon size={18} />}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export const TabPanel = ({ activeTab, tabId, children }) => {
  return (
    <div style={{ display: activeTab === tabId ? 'block' : 'none', width: '100%' }}>
      {children}
    </div>
  );
};
