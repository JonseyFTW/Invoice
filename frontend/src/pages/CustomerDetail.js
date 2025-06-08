import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Plus, X, Upload, Camera, FileText, 
  MapPin, Phone, Mail, Calendar, Tag, AlertCircle,
  Trash2, Eye, Download, User
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { openAddressInMaps } from '../utils/frontend_utilities';

const PHOTO_CATEGORIES = [
  { value: 'house_exterior', label: 'House Exterior', color: 'bg-blue-100 text-blue-800' },
  { value: 'house_interior', label: 'House Interior', color: 'bg-green-100 text-green-800' },
  { value: 'before_work', label: 'Before Work', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'after_work', label: 'After Work', color: 'bg-purple-100 text-purple-800' },
  { value: 'damage', label: 'Damage', color: 'bg-red-100 text-red-800' },
  { value: 'materials', label: 'Materials', color: 'bg-gray-100 text-gray-800' },
  { value: 'other', label: 'Other', color: 'bg-indigo-100 text-indigo-800' }
];

const NOTE_CATEGORIES = [
  { value: 'paint_codes', label: 'Paint Codes', color: 'bg-pink-100 text-pink-800' },
  { value: 'materials', label: 'Materials', color: 'bg-blue-100 text-blue-800' },
  { value: 'preferences', label: 'Preferences', color: 'bg-green-100 text-green-800' },
  { value: 'access_info', label: 'Access Info', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'special_instructions', label: 'Special Instructions', color: 'bg-red-100 text-red-800' },
  { value: 'job_history', label: 'Job History', color: 'bg-purple-100 text-purple-800' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' }
];

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
};

function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  
  // Photo state
  const [photos, setPhotos] = useState([]);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoCategory, setPhotoCategory] = useState('other');
  const [photoDescription, setPhotoDescription] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Notes state
  const [notes, setNotes] = useState([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('other');
  const [notePriority, setNotePriority] = useState('medium');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/customers/${id}`);
      setCustomer(response.data.customer);
      setPhotos(response.data.customer.photos || []);
      setNotes(response.data.customer.notes || []);
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast.error('Failed to load customer data');
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

    try {
      const response = await api.post(`/customers/${id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setPhotos(prev => [response.data.photo, ...prev]);
      setShowPhotoModal(false);
      setPhotoFile(null);
      setPhotoDescription('');
      setPhotoCategory('other');
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
      await api.delete(`/customers/photos/${photoId}`);
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
      priority: notePriority
    };

    try {
      let response;
      if (editingNote) {
        response = await api.put(`/customers/notes/${editingNote.id}`, noteData);
        setNotes(prev => prev.map(note => 
          note.id === editingNote.id ? response.data.note : note
        ));
        toast.success('Note updated successfully');
      } else {
        response = await api.post(`/customers/${id}/notes`, noteData);
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
      await api.delete(`/customers/notes/${noteId}`);
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
    setShowNoteModal(true);
  };

  const resetNoteForm = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('other');
    setNotePriority('medium');
  };

  const getCategoryInfo = (categories, value) => {
    return categories.find(cat => cat.value === value) || categories.find(cat => cat.value === 'other');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Customer not found</h2>
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/customers')}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
              <p className="text-gray-600">Customer Details</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/customers/${id}/edit`)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Customer</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'details', label: 'Details', icon: User },
            { id: 'photos', label: 'Photos', icon: Camera },
            { id: 'notes', label: 'Notes', icon: FileText }
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
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{customer.name}</p>
              </div>
            </div>
            
            {customer.email && (
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{customer.email}</p>
                </div>
              </div>
            )}
            
            {customer.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{customer.phone}</p>
                </div>
              </div>
            )}
            
            {customer.billingAddress && (
              <div className="flex items-start space-x-3 md:col-span-2">
                <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm text-gray-500">Billing Address</p>
                  <button
                    onClick={() => openAddressInMaps(customer.billingAddress)}
                    className="font-medium whitespace-pre-line text-left hover:text-blue-600 hover:underline transition-colors"
                    title="Open in Maps"
                  >
                    {customer.billingAddress}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'photos' && (
        <div>
          {/* Photos Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Customer Photos</h2>
            <button
              onClick={() => setShowPhotoModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add Photo</span>
            </button>
          </div>

          {/* Photos Grid */}
          {photos.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
              <p className="text-gray-600 mb-4">Add photos of the customer's house, jobs, or materials</p>
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
                const categoryInfo = getCategoryInfo(PHOTO_CATEGORIES, photo.category);
                return (
                  <div key={photo.id} className="bg-white rounded-lg shadow overflow-hidden group">
                    <div className="aspect-w-16 aspect-h-12 bg-gray-200 relative">
                      <img
                        src={`${process.env.REACT_APP_API_URL.replace('/api', '')}/uploads/customer_photos/${photo.filename}`}
                        alt={photo.description || 'Customer photo'}
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

      {activeTab === 'notes' && (
        <div>
          {/* Notes Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Customer Notes</h2>
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

          {/* Notes List */}
          {notes.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
              <p className="text-gray-600 mb-4">Add notes about paint codes, preferences, or job details</p>
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
                const categoryInfo = getCategoryInfo(NOTE_CATEGORIES, note.category);
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
                  {PHOTO_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
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
                  {selectedPhoto.description || 'Customer Photo'}
                </h3>
                <p className="text-sm text-gray-600">
                  {getCategoryInfo(PHOTO_CATEGORIES, selectedPhoto.category).label} • 
                  {new Date(selectedPhoto.uploadedAt).toLocaleDateString()}
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
                src={`${process.env.REACT_APP_API_URL.replace('/api', '')}/uploads/customer_photos/${selectedPhoto.filename}`}
                alt={selectedPhoto.description || 'Customer photo'}
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
                  placeholder="e.g., Paint Codes for Living Room"
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
                    {NOTE_CATEGORIES.map((category) => (
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content *
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={6}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter detailed information about the customer..."
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

export default CustomerDetail;