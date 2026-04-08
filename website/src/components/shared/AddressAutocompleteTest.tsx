/**
 * Test page for AddressAutocomplete component
 * Run this to verify Google Places API integration is working
 */

import { useState } from 'react';
import { AddressAutocomplete, type AddressDetails } from './AddressAutocomplete';

export function AddressAutocompleteTest() {
  const [address, setAddress] = useState('');
  const [details, setDetails] = useState<AddressDetails | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const handleAddressChange = (addr: string, addrDetails?: AddressDetails) => {
    setAddress(addr);
    addLog(`Address changed: ${addr}`);
    if (addrDetails) {
      setDetails(addrDetails);
      addLog(`Details received - City: ${addrDetails.city}, District: ${addrDetails.district}, Ward: ${addrDetails.ward}`);
    } else {
      addLog('No details received');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Address Autocomplete Test</h1>
        
        {/* Test Input */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Test Input</h2>
          <AddressAutocomplete
            value={address}
            onChange={handleAddressChange}
            placeholder="Type an address..."
          />
        </div>

        {/* Current State */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Current State</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Address:</strong> {address || '(empty)'}</p>
            {details && (
              <>
                <p><strong>Street:</strong> {details.street}</p>
                <p><strong>City:</strong> {details.city}</p>
                <p><strong>District:</strong> {details.district}</p>
                <p><strong>Ward:</strong> {details.ward}</p>
                <p><strong>Full Address:</strong> {details.fullAddress}</p>
                {details.lat && details.lng && (
                  <p><strong>Coordinates:</strong> {details.lat}, {details.lng}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Debug Logs */}
        <div className="bg-gray-900 rounded-2xl shadow-lg p-6 text-white font-mono text-sm">
          <h2 className="text-lg font-semibold mb-4 text-white">Debug Logs</h2>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Try typing an address above.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="border-b border-gray-800 pb-1">{log}</div>
              ))
            )}
          </div>
          <button
            onClick={() => setLogs([])}
            className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
          >
            Clear Logs
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-2 text-blue-900">How to Test</h2>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Click on the input field above</li>
            <li>Type an address (e.g., "5051 N Hamlin Ave" or "123 Nguyen Hue")</li>
            <li>Wait for suggestions to appear (should show within 300ms)</li>
            <li>Click on a suggestion</li>
            <li>Check the "Current State" section for parsed details</li>
          </ol>
          
          <div className="mt-4 pt-4 border-t border-blue-200">
            <h3 className="font-semibold mb-2">Troubleshooting</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
              <li>Check browser console (F12 → Console) for detailed logs</li>
              <li>If no suggestions appear, check if Google Places API key is valid</li>
              <li>Check network tab for API errors</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddressAutocompleteTest;
