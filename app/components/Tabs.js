'use client';

import React from 'react';

export const Tabs = ({ activeTab, onTabChange, tabs }) => {
  return (
    <div className="flex bg-gray-700 rounded-lg p-1 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-300 hover:text-white hover:bg-gray-600'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export const TabPanel = ({ activeTab, tabId, children }) => {
  if (activeTab !== tabId) return null;
  return <div>{children}</div>;
};
