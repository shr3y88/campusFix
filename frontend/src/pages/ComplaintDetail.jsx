import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ComplaintDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    fetchComplaint();
    if (user?.role === 'admin') {
      fetchTeachers();
    }
  }, [id]);

  const fetchComplaint = async () => {
    try {
      const response = await api.get(`/complaints/${id}`);
      setComplaint(response.data);
    } catch (error) {
      toast.error('Failed to load complaint');
      navigate('/complaints');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/users/teachers');
      setTeachers(response.data);
    } catch (error) {
      console.error('Failed to load teachers');
    }
  };

  const handleAssign = async () => {
    try {
      await api.put(`/complaints/${id}/assign`, {
        assignedTo: selectedTeacher,
      });
      toast.success('Complaint assigned successfully');
      setShowAssignModal(false);
      fetchComplaint();
    } catch (error) {
      toast.error('Failed to assign complaint');
    }
  };

  const handleResolve = async () => {
    try {
      await api.put(`/complaints/${id}/resolve`, {
        resolutionNotes,
      });
      toast.success('Complaint resolved successfully');
      fetchComplaint();
      setResolutionNotes('');
    } catch (error) {
      toast.error('Failed to resolve complaint');
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      await api.put(`/complaints/${id}`, { status: newStatus });
      toast.success('Status updated successfully');
      fetchComplaint();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) {
      toast.error('Please enter a reply message');
      return;
    }

    setReplying(true);
    try {
      await api.post(`/complaints/${id}/reply`, { message: replyMessage });
      toast.success('Reply added successfully');
      setReplyMessage('');
      fetchComplaint();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add reply');
    } finally {
      setReplying(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      assigned: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!complaint) {
    return null;
  }

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link
            to="/complaints"
            className="text-primary-600 hover:text-primary-500 text-sm font-medium"
          >
            ← Back to Complaints
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">
                {complaint.title}
              </h1>
              <div className="flex items-center space-x-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    complaint.status
                  )}`}
                >
                  {complaint.status}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                    complaint.priority
                  )}`}
                >
                  {complaint.priority}
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Category</h3>
                <p className="mt-1 text-sm text-gray-900 capitalize">
                  {complaint.category}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Location</h3>
                <p className="mt-1 text-sm text-gray-900">{complaint.location}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Reported By
                </h3>
                <p className="mt-1 text-sm text-gray-900">
                  {complaint.reportedBy?.name || 'Unknown'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Assigned To
                </h3>
                <p className="mt-1 text-sm text-gray-900">
                  {complaint.assignedTo?.name || 'Not assigned'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Created At
                </h3>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(complaint.createdAt).toLocaleString()}
                </p>
              </div>
              {complaint.resolvedAt && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Resolved At
                  </h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(complaint.resolvedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                Description
              </h3>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {complaint.description}
              </p>
            </div>

            {complaint.images && complaint.images.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Images
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {complaint.images.map((image, index) => (
                    <img
                      key={index}
                      src={`${API_URL}${image}`}
                      alt={`Complaint ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}

            {complaint.resolutionNotes && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Resolution Notes
                </h3>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {complaint.resolutionNotes}
                </p>
              </div>
            )}

            {/* Replies Section */}
            {complaint.replies && complaint.replies.length > 0 && (
              <div className="mb-6 border-t border-gray-200 pt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-4">
                  Replies ({complaint.replies.length})
                </h3>
                <div className="space-y-4">
                  {complaint.replies.map((reply, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {reply.repliedBy?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(reply.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {reply.repliedBy?.role === 'teacher' && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                            Teacher
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {reply.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reply Form for Teachers */}
            {(user?.role === 'teacher' || user?.role === 'admin') && (
              <div className="border-t border-gray-200 pt-6 mt-6">
                <h3 className="text-sm font-medium text-gray-500 mb-4">Add Reply</h3>
                <form onSubmit={handleReply}>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply here..."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm mb-3"
                    rows={4}
                  />
                  <button
                    type="submit"
                    disabled={replying || !replyMessage.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                  >
                    {replying ? 'Sending...' : 'Send Reply'}
                  </button>
                </form>
              </div>
            )}

            {/* Action Buttons */}
            {(user?.role === 'admin' || user?.role === 'teacher') && (
              <div className="border-t border-gray-200 pt-6 mt-6">
                <div className="flex flex-wrap gap-3">
                  {complaint.status === 'pending' && user?.role === 'admin' && (
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                    >
                      Assign to Teacher
                    </button>
                  )}
                  {complaint.status !== 'resolved' &&
                    complaint.status !== 'closed' &&
                    (user?.role === 'admin' ||
                      user?.role === 'teacher' ||
                      (complaint.assignedTo?._id === user._id)) && (
                      <button
                        onClick={() => handleStatusUpdate('in-progress')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        Mark In Progress
                      </button>
                    )}
                  {complaint.status !== 'resolved' &&
                    (user?.role === 'admin' ||
                      user?.role === 'teacher' ||
                      (complaint.assignedTo?._id === user._id)) && (
                      <div className="flex-1">
                        <textarea
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="Resolution notes..."
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                          rows={3}
                        />
                        <button
                          onClick={handleResolve}
                          className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                        >
                          Resolve Complaint
                        </button>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Assign Complaint
            </h3>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm mb-4"
            >
              <option value="">Select teacher</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} - {t.department}
                </option>
              ))}
            </select>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedTeacher}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintDetail;

