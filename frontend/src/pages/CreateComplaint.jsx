import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../context/AuthContext';
import toast from 'react-hot-toast';

const CreateComplaint = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Teachers cannot create complaints
  useEffect(() => {
    if (user?.role === 'teacher') {
      toast.error('Teachers cannot file complaints');
      navigate('/complaints');
    }
  }, [user, navigate]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [similarComplaints, setSimilarComplaints] = useState([]);
  const [aiSuggestionMeta, setAiSuggestionMeta] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'maintenance',
    location: '',
    priority: 'medium',
    department: user?.department || '',
  });
  const [images, setImages] = useState([]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    setImages([...images, ...files]);
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleAISuggest = async () => {
    if (!formData.title.trim() && !formData.description.trim()) {
      toast.error('Add title or description first for AI suggestions');
      return;
    }

    setAiLoading(true);
    try {
      const response = await api.post('/complaints/ai/suggest', {
        title: formData.title,
        description: formData.description,
        location: formData.location,
      });

      setFormData((prev) => ({
        ...prev,
        category: response.data.category || prev.category,
        priority: response.data.priority || prev.priority,
      }));
      setAiSuggestionMeta({
        confidence: response.data.confidence,
        reason: response.data.reason,
        source: response.data.source,
      });
      toast.success('AI suggestions applied');
    } catch (error) {
      setAiSuggestionMeta(null);
      toast.error('Failed to get AI suggestions');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCheckDuplicates = async () => {
    if (!formData.title.trim() && !formData.description.trim()) {
      toast.error('Add title or description first to check duplicates');
      return;
    }

    setDuplicateLoading(true);
    try {
      const response = await api.post('/complaints/ai/duplicates', {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        category: formData.category,
        department: formData.department,
      });
      setSimilarComplaints(response.data.similarComplaints || []);

      if ((response.data.similarComplaints || []).length === 0) {
        toast.success('No similar complaints found');
      } else {
        toast('Similar complaints found. Please review below.');
      }
    } catch (error) {
      toast.error('Failed to check similar complaints');
    } finally {
      setDuplicateLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('location', formData.location);
      formDataToSend.append('priority', formData.priority);
      if (formData.department) {
        formDataToSend.append('department', formData.department);
      }

      images.forEach((image) => {
        formDataToSend.append('images', image);
      });

      await api.post('/complaints', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Complaint created successfully!');
      navigate('/complaints');
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to create complaint'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Create New Complaint
        </h1>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
          <div className="space-y-6">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700"
              >
                Title *
              </label>
              <input
                type="text"
                name="title"
                id="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Brief description of the issue"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Description *
              </label>
              <textarea
                name="description"
                id="description"
                rows={4}
                required
                value={formData.description}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Detailed description of the issue..."
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleAISuggest}
                disabled={aiLoading}
                className="px-4 py-2 border border-primary-300 rounded-md text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 disabled:opacity-50"
              >
                {aiLoading ? 'Analyzing...' : 'Suggest Category & Priority (AI)'}
              </button>
              <button
                type="button"
                onClick={handleCheckDuplicates}
                disabled={duplicateLoading}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {duplicateLoading ? 'Checking...' : 'Check Similar Complaints'}
              </button>
            </div>

            {similarComplaints.length > 0 && (
              <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-900 mb-2">
                  Possible duplicate complaints found
                </h3>
                <ul className="space-y-2">
                  {similarComplaints.map((item) => (
                    <li
                      key={item._id}
                      className="text-sm text-yellow-900 border border-yellow-100 bg-white rounded-md p-3"
                    >
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-yellow-700">
                        {item.location} • {item.category} • {item.status} • Similarity:{' '}
                        {item.similarity}%
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiSuggestionMeta && (
              <div className="border border-primary-200 bg-primary-50 rounded-lg p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-primary-900">
                    AI Suggestion Details
                  </h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-800 font-medium">
                    Confidence: {aiSuggestionMeta.confidence ?? 0}%
                  </span>
                </div>
                <p className="text-sm text-primary-900">{aiSuggestionMeta.reason}</p>
                <p className="text-xs text-primary-700 mt-1">
                  Source: {aiSuggestionMeta.source || 'ai'}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-gray-700"
                >
                  Category *
                </label>
                <select
                  name="category"
                  id="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="maintenance">Maintenance</option>
                  <option value="safety">Safety</option>
                  <option value="electrical">Electrical</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="priority"
                  className="block text-sm font-medium text-gray-700"
                >
                  Priority
                </label>
                <select
                  name="priority"
                  id="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700"
              >
                Location *
              </label>
              <input
                type="text"
                name="location"
                id="location"
                required
                value={formData.location}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="e.g., Building A, Room 101"
              />
            </div>

            {user?.role === 'student' && (
              <div>
                <label
                  htmlFor="department"
                  className="block text-sm font-medium text-gray-700"
                >
                  Department *
                </label>
                <select
                  name="department"
                  id="department"
                  required
                  value={formData.department}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="">Select Department</option>
                  <option value="CS">CS</option>
                  <option value="IT">IT</option>
                  <option value="CSIT">CSIT</option>
                  <option value="DS">DS</option>
                  <option value="CY">CY</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Civil">Civil</option>
                  <option value="Sports">Sports</option>
                </select>
              </div>
            )}
            {user?.department && user?.role !== 'student' && (
              <div>
                <label
                  htmlFor="department"
                  className="block text-sm font-medium text-gray-700"
                >
                  Department
                </label>
                <input
                  type="text"
                  name="department"
                  id="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-50"
                  placeholder="Your department"
                  readOnly
                />
              </div>
            )}

            <div>
              <label
                htmlFor="images"
                className="block text-sm font-medium text-gray-700"
              >
                Images (Max 5)
              </label>
              <input
                type="file"
                name="images"
                id="images"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/complaints')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Complaint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateComplaint;

