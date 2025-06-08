import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Plus, X, Upload, Camera, FileText, 
  MapPin, Phone, Mail, Calendar, Tag, AlertCircle,
  Trash2, Eye, Download, Home, Clock, DollarSign,
  Users, Wrench, Star, CheckCircle
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { openAddressInMaps } from '../utils/frontend_utilities';

const PROPERTY_PHOTO_CATEGORIES = [
  { value: 'exterior_front', label: 'Exterior Front', color: 'bg-blue-100 text-blue-800' },
  { value: 'exterior_back', label: 'Exterior Back', color: 'bg-blue-100 text-blue-800' },
  { value: 'exterior_side', label: 'Exterior Side', color: 'bg-blue-100 text-blue-800' },
  { value: 'interior_room', label: 'Interior Room', color: 'bg-green-100 text-green-800' },
  { value: 'before_work', label: 'Before Work', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'after_work', label: 'After Work', color: 'bg-purple-100 text-purple-800' },
  { value: 'during_work', label: 'During Work', color: 'bg-orange-100 text-orange-800' },
  { value: 'damage', label: 'Damage', color: 'bg-red-100 text-red-800' },
  { value: 'materials', label: 'Materials', color: 'bg-gray-100 text-gray-800' },
  { value: 'equipment', label: 'Equipment', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'access_point', label: 'Access Point', color: 'bg-teal-100 text-teal-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' }
];

const PROPERTY_NOTE_CATEGORIES = [
  { value: 'paint_codes', label: 'Paint Codes', color: 'bg-pink-100 text-pink-800' },
  { value: 'materials', label: 'Materials', color: 'bg-blue-100 text-blue-800' },
  { value: 'measurements', label: 'Measurements', color: 'bg-green-100 text-green-800' },
  { value: 'access_info', label: 'Access Info', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'special_instructions', label: 'Special Instructions', color: 'bg-red-100 text-red-800' },
  { value: 'damage_notes', label: 'Damage Notes', color: 'bg-orange-100 text-orange-800' },
  { value: 'maintenance_history', label: 'Maintenance History', color: 'bg-purple-100 text-purple-800' },
  { value: 'client_preferences', label: 'Client Preferences', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'safety_concerns', label: 'Safety Concerns', color: 'bg-red-100 text-red-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' }
];

const SERVICE_TYPES = [
  { value: 'painting', label: 'Painting', icon: '🎨' },
  { value: 'repair', label: 'Repair', icon: '🔧' },
  { value: 'maintenance', label: 'Maintenance', icon: '⚙️' },
  { value: 'inspection', label: 'Inspection', icon: '🔍' },
  { value: 'estimate', label: 'Estimate', icon: '📋' },
  { value: 'consultation', label: 'Consultation', icon: '💬' },
  { value: 'cleanup', label: 'Cleanup', icon: '🧹' },
  { value: 'preparation', label: 'Preparation', icon: '📐' },
  { value: 'other', label: 'Other', icon: '📝' }
];

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
};

function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Photo state
  const [photos, setPhotos] = useState([]);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoCategory, setPhotoCategory] = useState('other');
  const [photoDescription, setPhotoDescription] = useState('');
  const [photoRoom, setPhotoRoom] = useState('');
  const [photoFloor, setPhotoFloor] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Notes state
  const [notes, setNotes] = useState([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('other');
  const [notePriority, setNotePriority] = useState('medium');
  const [noteRoom, setNoteRoom] = useState('');
  const [noteFloor, setNoteFloor] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Service history state
  const [serviceHistory, setServiceHistory] = useState([]);

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/properties/${id}`);
      const propertyData = response.data.property;
      
      setProperty(propertyData);
      setPhotos(propertyData.photos || []);
      setNotes(propertyData.notes || []);
      setServiceHistory(propertyData.serviceHistory || []);
    } catch (error) {
      console.error('Error fetching property:', error);
      toast.error('Failed to load property data');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    e.preventDefault();
    if (!photoFile) {
      toast.error('Please select a photo');
      return;
    }

    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('photo', photoFile);
    formData.append('category', photoCategory);
    formData.append('description', photoDescription);
    formData.append('room', photoRoom);
    formData.append('floor', photoFloor);

    try {
      const response = await api.post(`/properties/${id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setPhotos(prev => [response.data.photo, ...prev]);
      setShowPhotoModal(false);
      setPhotoFile(null);
      setPhotoDescription('');
      setPhotoCategory('other');
      setPhotoRoom('');
      setPhotoFloor('');
      toast.success('Photo uploaded successfully');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return;

    try {
      await api.delete(`/properties/photos/${photoId}`);
      setPhotos(prev => prev.filter(photo => photo.id !== photoId));
      toast.success('Photo deleted successfully');
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
    }
  };

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSavingNote(true);
    const noteData = {
      title: noteTitle,
      content: noteContent,
      category: noteCategory,
      priority: notePriority,
      room: noteRoom || null,
      floor: noteFloor ? parseInt(noteFloor) : null
    };

    try {
      let response;
      if (editingNote) {
        response = await api.put(`/properties/notes/${editingNote.id}`, noteData);
        setNotes(prev => prev.map(note => 
          note.id === editingNote.id ? response.data.note : note
        ));
        toast.success('Note updated successfully');
      } else {
        response = await api.post(`/properties/${id}/notes`, noteData);
        setNotes(prev => [response.data.note, ...prev]);
        toast.success('Note created successfully');
      }
      
      setShowNoteModal(false);
      resetNoteForm();
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      await api.delete(`/properties/notes/${noteId}`);
      setNotes(prev => prev.filter(note => note.id !== noteId));
      toast.success('Note deleted successfully');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  const openEditNote = (note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteCategory(note.category);
    setNotePriority(note.priority);
    setNoteRoom(note.room || '');
    setNoteFloor(note.floor || '');
    setShowNoteModal(true);
  };

  const resetNoteForm = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('other');
    setNotePriority('medium');
    setNoteRoom('');
    setNoteFloor('');
  };

  const getCategoryInfo = (categories, value) => {
    return categories.find(cat => cat.value === value) || categories.find(cat => cat.value === 'other');
  };

  const getServiceTypeInfo = (value) => {
    return SERVICE_TYPES.find(type => type.value === value) || SERVICE_TYPES.find(type => type.value === 'other');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Property not found</h2>
          <button
            onClick={() => navigate('/customers')}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  const fullAddress = [
    property.address,
    property.city && property.state ? `${property.city}, ${property.state}` : null,
    property.zipCode
  ].filter(Boolean).join('\n');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/customers/${property.customer?.id || ''}`)}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{property.name}</h1>
              <p className="text-gray-600">
                {property.customer?.name && `Property of ${property.customer.name}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/properties/${id}/edit`)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Property</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Home },
            { id: 'photos', label: 'Photos', icon: Camera },
            { id: 'notes', label: 'Notes', icon: FileText },
            { id: 'history', label: 'Service History', icon: Clock }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.id === 'photos' && photos.length > 0 && (
                  <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                    {photos.length}
                  </span>
                )}
                {tab.id === 'notes' && notes.length > 0 && (
                  <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full">
                    {notes.length}
                  </span>
                )}
                {tab.id === 'history' && serviceHistory.length > 0 && (
                  <span className="bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded-full">
                    {serviceHistory.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Property Type</p>
                  <p className="font-medium capitalize">{property.propertyType}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <button
                    onClick={() => openAddressInMaps(fullAddress)}
                    className="font-medium hover:text-blue-600 hover:underline transition-colors text-left"
                    title="Open in Maps"
                  >
                    {fullAddress}
                  </button>
                </div>

                {property.squareFootage && (
                  <div>
                    <p className="text-sm text-gray-500">Square Footage</p>
                    <p className="font-medium">{property.squareFootage.toLocaleString()} sq ft</p>
                  </div>
                )}

                {property.yearBuilt && (
                  <div>
                    <p className="text-sm text-gray-500">Year Built</p>
                    <p className="font-medium">{property.yearBuilt}</p>
                  </div>
                )}

                {property.bedrooms && (
                  <div>
                    <p className="text-sm text-gray-500">Bedrooms</p>
                    <p className="font-medium">{property.bedrooms}</p>
                  </div>
                )}

                {property.bathrooms && (
                  <div>
                    <p className="text-sm text-gray-500">Bathrooms</p>
                    <p className="font-medium">{property.bathrooms}</p>
                  </div>
                )}

                {property.floors && (
                  <div>
                    <p className="text-sm text-gray-500">Floors</p>
                    <p className="font-medium">{property.floors}</p>
                  </div>
                )}
              </div>

              {property.description && (
                <div className="mt-6">
                  <p className="text-sm text-gray-500 mb-2">Description</p>
                  <p className="text-gray-700">{property.description}</p>
                </div>
              )}
            </div>

            {/* Access Information */}
            {(property.gateCode || property.keyLocation || property.contactOnSite || property.contactPhone || property.accessNotes) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {property.gateCode && (
                    <div>
                      <p className="text-sm text-gray-500">Gate Code</p>
                      <p className="font-medium">{property.gateCode}</p>
                    </div>
                  )}

                  {property.keyLocation && (
                    <div>
                      <p className="text-sm text-gray-500">Key Location</p>
                      <p className="font-medium">{property.keyLocation}</p>
                    </div>
                  )}

                  {property.contactOnSite && (
                    <div>
                      <p className="text-sm text-gray-500">On-Site Contact</p>
                      <p className="font-medium">{property.contactOnSite}</p>
                    </div>
                  )}

                  {property.contactPhone && (
                    <div>
                      <p className="text-sm text-gray-500">Contact Phone</p>
                      <p className="font-medium">{property.contactPhone}</p>
                    </div>
                  )}
                </div>

                {property.accessNotes && (
                  <div className="mt-6">
                    <p className="text-sm text-gray-500 mb-2">Access Notes</p>
                    <p className="text-gray-700 whitespace-pre-line">{property.accessNotes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Special Instructions */}
            {property.specialInstructions && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Special Instructions</h2>
                <p className="text-gray-700 whitespace-pre-line">{property.specialInstructions}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Photos</span>
                  <span className="font-medium">{photos.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Notes</span>
                  <span className="font-medium">{notes.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Service Records</span>
                  <span className="font-medium">{serviceHistory.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Invoices</span>
                  <span className="font-medium">{property.invoices?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* Recent Photos Preview */}
            {photos.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Photos</h3>
                <div className="grid grid-cols-2 gap-2">
                  {photos.slice(0, 4).map((photo) => (
                    <div
                      key={photo.id}
                      className="aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      <img
                        src={`${process.env.REACT_APP_API_URL.replace('/api', '')}/uploads/property_photos/${photo.filename}`}
                        alt={photo.description || 'Property photo'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                {photos.length > 4 && (
                  <button
                    onClick={() => setActiveTab('photos')}
                    className="w-full mt-3 text-sm text-blue-600 hover:text-blue-700"
                  >
                    View all {photos.length} photos
                  </button>
                )}
              </div>
            )}

            {/* GPS Coordinates */}
            {(property.latitude && property.longitude) && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">GPS Coordinates</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Latitude:</span>
                    <span className="ml-2 font-mono text-sm">{property.latitude}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Longitude:</span>
                    <span className="ml-2 font-mono text-sm">{property.longitude}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photos Tab - Similar to CustomerDetail but for property photos */}
      {activeTab === 'photos' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Property Photos</h2>
            <button
              onClick={() => setShowPhotoModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add Photo</span>
            </button>
          </div>

          {photos.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
              <p className="text-gray-600 mb-4">Add photos to document this property</p>
              <button
                onClick={() => setShowPhotoModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Upload First Photo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {photos.map((photo) => {
                const categoryInfo = getCategoryInfo(PROPERTY_PHOTO_CATEGORIES, photo.category);
                return (
                  <div key={photo.id} className="bg-white rounded-lg shadow overflow-hidden group">
                    <div className="aspect-w-16 aspect-h-12 bg-gray-200 relative">
                      <img
                        src={`${process.env.REACT_APP_API_URL.replace('/api', '')}/uploads/property_photos/${photo.filename}`}
                        alt={photo.description || 'Property photo'}
                        className="w-full h-48 object-cover cursor-pointer"
                        onClick={() => setSelectedPhoto(photo)}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                          <button
                            onClick={() => setSelectedPhoto(photo)}
                            className="p-2 bg-white rounded-full text-gray-700 hover:text-blue-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePhoto(photo.id)}
                            className="p-2 bg-white rounded-full text-gray-700 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryInfo.color}`}>
                          {categoryInfo.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(photo.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {photo.room && (
                        <p className="text-xs text-gray-600 mb-1">Room: {photo.room}</p>
                      )}
                      {photo.description && (
                        <p className="text-sm text-gray-600 truncate">{photo.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Notes Tab - Similar structure but for property notes */}
      {activeTab === 'notes' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Property Notes</h2>
            <button
              onClick={() => {
                resetNoteForm();
                setShowNoteModal(true);
              }}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add Note</span>
            </button>
          </div>

          {notes.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
              <p className="text-gray-600 mb-4">Add notes to track important property information</p>
              <button
                onClick={() => {
                  resetNoteForm();
                  setShowNoteModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add First Note
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => {
                const categoryInfo = getCategoryInfo(PROPERTY_NOTE_CATEGORIES, note.category);
                const priorityColor = PRIORITY_COLORS[note.priority];
                return (
                  <div key={note.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{note.title}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryInfo.color}`}>
                            {categoryInfo.label}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColor}`}>
                            {note.priority.charAt(0).toUpperCase() + note.priority.slice(1)}
                          </span>
                          {note.room && (
                            <span className="text-xs text-gray-500">Room: {note.room}</span>
                          )}
                        </div>
                        <p className="text-gray-600 whitespace-pre-line">{note.content}</p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => openEditNote(note)}
                          className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Created: {new Date(note.createdAt).toLocaleString()}
                      {note.updatedAt !== note.createdAt && (
                        <span> • Updated: {new Date(note.updatedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Service History Tab */}
      {activeTab === 'history' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Service History</h2>
            <button
              onClick={() => navigate(`/properties/${id}/service/new`)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add Service Record</span>
            </button>
          </div>

          {serviceHistory.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No service history yet</h3>
              <p className="text-gray-600 mb-4">Track all services performed at this property</p>
              <button
                onClick={() => navigate(`/properties/${id}/service/new`)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add First Service Record
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {serviceHistory.map((service) => {
                const serviceTypeInfo = getServiceTypeInfo(service.serviceType);
                return (
                  <div key={service.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center">
                          <span className="text-lg">{serviceTypeInfo.icon}</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {serviceTypeInfo.label}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {new Date(service.serviceDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {service.totalCost && (
                          <p className="text-lg font-semibold text-gray-900">
                            ${parseFloat(service.totalCost).toFixed(2)}
                          </p>
                        )}
                        {service.invoice && (
                          <p className="text-sm text-blue-600">
                            Invoice #{service.invoice.invoiceNumber}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-700 mb-4">{service.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {service.timeSpent && (
                        <div>
                          <p className="text-gray-500">Time Spent</p>
                          <p className="font-medium">{service.timeSpent} hours</p>
                        </div>
                      )}
                      {service.roomsServiced && (
                        <div>
                          <p className="text-gray-500">Rooms</p>
                          <p className="font-medium">{service.roomsServiced}</p>
                        </div>
                      )}
                      {service.customerSatisfaction && (
                        <div>
                          <p className="text-gray-500">Satisfaction</p>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < service.customerSatisfaction
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {service.followUpRequired && (
                      <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center">
                          <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                          <p className="text-sm text-yellow-800">
                            Follow-up required
                            {service.followUpDate && (
                              <span> by {new Date(service.followUpDate).toLocaleDateString()}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Photo Upload Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Photo</h3>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handlePhotoUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files[0])}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={photoCategory}
                  onChange={(e) => setPhotoCategory(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PROPERTY_PHOTO_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room (Optional)
                  </label>
                  <input
                    type="text"
                    value={photoRoom}
                    onChange={(e) => setPhotoRoom(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Living Room"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Floor (Optional)
                  </label>
                  <input
                    type="number"
                    value={photoFloor}
                    onChange={(e) => setPhotoFloor(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={photoDescription}
                  onChange={(e) => setPhotoDescription(e.target.value)}
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe what this photo shows..."
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  className="flex-1 bg-gray-200 text-gray-900 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingPhoto}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploadingPhoto ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo View Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl max-h-full bg-white rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedPhoto.description || 'Property Photo'}
                </h3>
                <p className="text-sm text-gray-600">
                  {getCategoryInfo(PROPERTY_PHOTO_CATEGORIES, selectedPhoto.category).label}
                  {selectedPhoto.room && ` • ${selectedPhoto.room}`}
                  {selectedPhoto.floor && ` • Floor ${selectedPhoto.floor}`}
                  • {new Date(selectedPhoto.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <img
                src={`${process.env.REACT_APP_API_URL.replace('/api', '')}/uploads/property_photos/${selectedPhoto.filename}`}
                alt={selectedPhoto.description || 'Property photo'}
                className="max-w-full max-h-96 mx-auto"
              />
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingNote ? 'Edit Note' : 'Add Note'}
              </h3>
              <button
                onClick={() => setShowNoteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Paint Colors for Kitchen"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PROPERTY_NOTE_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={notePriority}
                    onChange={(e) => setNotePriority(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room (Optional)
                  </label>
                  <input
                    type="text"
                    value={noteRoom}
                    onChange={(e) => setNoteRoom(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Kitchen"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Floor (Optional)
                  </label>
                  <input
                    type="number"
                    value={noteFloor}
                    onChange={(e) => setNoteFloor(e.target.value)}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content *
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={6}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter detailed information about the property..."
                  required
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="flex-1 bg-gray-200 text-gray-900 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNote}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingNote ? 'Saving...' : (editingNote ? 'Update Note' : 'Add Note')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PropertyDetail;