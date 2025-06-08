const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getCustomerProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  uploadPropertyPhoto,
  deletePropertyPhoto,
  createPropertyNote,
  updatePropertyNote,
  deletePropertyNote,
  createServiceHistory
} = require('../controllers/propertyController');

// All routes require authentication
router.use(auth);

// Property routes
router.get('/customer/:customerId', getCustomerProperties);
router.get('/:id', getProperty);
router.post('/customer/:customerId', createProperty);
router.put('/:id', updateProperty);
router.delete('/:id', deleteProperty);

// Property photo routes
router.post('/:id/photos', uploadPropertyPhoto);
router.delete('/photos/:photoId', deletePropertyPhoto);

// Property note routes
router.post('/:id/notes', createPropertyNote);
router.put('/notes/:noteId', updatePropertyNote);
router.delete('/notes/:noteId', deletePropertyNote);

// Property service history routes
router.post('/:id/service-history', createServiceHistory);

module.exports = router;