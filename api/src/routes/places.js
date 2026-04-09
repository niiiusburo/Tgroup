const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Google Places API proxy endpoints
// These proxy requests to avoid CORS issues when calling from the frontend

// Autocomplete endpoint
router.get('/autocomplete', requireAuth, async (req, res) => {
  try {
    const { input, types = 'address', language = 'vi' } = req.query;
    
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      console.error('[Places API] No Google API key configured');
      return res.status(500).json({ error: 'Google Places API key not configured' });
    }

    const encodedInput = encodeURIComponent(input);
    const components = 'country:vn'; // Restrict to Vietnam
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodedInput}&types=${types}&language=${language}&components=${components}&key=${apiKey}`;

    console.log('[Places API] Proxying autocomplete request for:', input);

    const response = await fetch(url);
    const data = await response.json();

    res.json(data);
  } catch (error) {
    console.error('[Places API] Autocomplete error:', error);
    res.status(500).json({ error: 'Failed to fetch autocomplete suggestions' });
  }
});

// Place details endpoint
router.get('/details', requireAuth, async (req, res) => {
  try {
    const { place_id } = req.query;
    
    if (!place_id) {
      return res.status(400).json({ error: 'Place ID is required' });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      console.error('[Places API] No Google API key configured');
      return res.status(500).json({ error: 'Google Places API key not configured' });
    }

    const fields = 'address_components,formatted_address,geometry,name';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${fields}&language=vi&key=${apiKey}`;

    console.log('[Places API] Proxying details request for place_id:', place_id);

    const response = await fetch(url);
    const data = await response.json();

    res.json(data);
  } catch (error) {
    console.error('[Places API] Details error:', error);
    res.status(500).json({ error: 'Failed to fetch place details' });
  }
});

module.exports = router;
