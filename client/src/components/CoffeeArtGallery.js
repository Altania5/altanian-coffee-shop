import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './CoffeeArtGallery.css';

function CoffeeArtGallery({ user, compact = false }) {
  const [activeTab, setActiveTab] = useState('gallery');
  const [artworks, setArtworks] = useState([]);
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    contestId: null
  });
  const [viewMode, setViewMode] = useState(compact ? 'compact' : 'full');

  useEffect(() => {
    loadGalleryData();
  }, []);

  const loadGalleryData = async () => {
    try {
      setLoading(true);
      
      const [artworksResponse, contestsResponse] = await Promise.all([
        api.get('/coffee-art/gallery'),
        api.get('/coffee-art/contests')
      ]);

      setArtworks(artworksResponse.data.arts || []);
      setContests(contestsResponse.data.contests || []);
    } catch (error) {
      console.error('Failed to load gallery data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    } else {
      alert('Please select a valid image file');
    }
  };

  const uploadArtwork = async () => {
    if (!selectedFile || !uploadData.title.trim()) {
      alert('Please select an image and enter a title');
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('title', uploadData.title);
      formData.append('description', uploadData.description);
      if (uploadData.contestId) {
        formData.append('contestId', uploadData.contestId);
      }

      await api.post('/coffee-art/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Reset form
      setSelectedFile(null);
      setUploadData({ title: '', description: '', contestId: null });
      document.getElementById('image-upload').value = '';
      
      // Reload gallery
      loadGalleryData();
      
      alert('Artwork uploaded successfully!');
    } catch (error) {
      console.error('Failed to upload artwork:', error);
      alert('Failed to upload artwork');
    } finally {
      setUploading(false);
    }
  };

  const voteForArtwork = async (artworkId) => {
    try {
      await api.post('/coffee-art/vote', { artworkId });
      loadGalleryData(); // Refresh to update vote counts
    } catch (error) {
      console.error('Failed to vote:', error);
      alert('Failed to vote for artwork');
    }
  };

  const joinContest = async (contestId) => {
    try {
      await api.post('/coffee-art/contests/join', { contestId });
      loadGalleryData(); // Refresh data
      alert('Contest joined successfully!');
    } catch (error) {
      console.error('Failed to join contest:', error);
      alert('Failed to join contest');
    }
  };

  if (loading) {
    return (
      <div className="coffee-art-gallery">
        <div className="loading-spinner"></div>
        <p>Loading coffee art gallery...</p>
      </div>
    );
  }

  return (
    <div className="coffee-art-gallery">
      <div className="gallery-header">
        <div className="gallery-title-section">
          <h3>🎨 Coffee Art Gallery</h3>
          {!compact && (
            <div className="view-mode-toggle">
              <button 
                className={`view-btn ${viewMode === 'compact' ? 'active' : ''}`}
                onClick={() => setViewMode('compact')}
                title="Compact View"
              >
                📱
              </button>
              <button 
                className={`view-btn ${viewMode === 'full' ? 'active' : ''}`}
                onClick={() => setViewMode('full')}
                title="Full View"
              >
                🖥️
              </button>
            </div>
          )}
        </div>
        <div className="gallery-tabs">
          <button 
            className={`tab ${activeTab === 'gallery' ? 'active' : ''}`}
            onClick={() => setActiveTab('gallery')}
          >
            🖼️ Gallery
          </button>
          <button 
            className={`tab ${activeTab === 'contests' ? 'active' : ''}`}
            onClick={() => setActiveTab('contests')}
          >
            🏆 Contests
          </button>
          <button 
            className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            📤 Upload
          </button>
        </div>
      </div>

      <div className="gallery-content">
        {activeTab === 'gallery' && (
          <GalleryTab 
            artworks={artworks}
            onVote={voteForArtwork}
            user={user}
            viewMode={viewMode}
          />
        )}

        {activeTab === 'contests' && (
          <ContestsTab 
            contests={contests}
            onJoinContest={joinContest}
            user={user}
          />
        )}

        {activeTab === 'upload' && (
          <UploadTab 
            selectedFile={selectedFile}
            uploadData={uploadData}
            setUploadData={setUploadData}
            onFileSelect={handleFileSelect}
            onUpload={uploadArtwork}
            uploading={uploading}
            contests={contests}
          />
        )}
      </div>
    </div>
  );
}

// Gallery Tab Component
function GalleryTab({ artworks, onVote, user, viewMode = 'full' }) {
  const [filter, setFilter] = useState('all'); // 'all', 'featured', 'recent', 'popular'

  const filteredArtworks = artworks.filter(artwork => {
    switch (filter) {
      case 'featured':
        return artwork.featured;
      case 'recent':
        return new Date(artwork.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      case 'popular':
        return artwork.votes > 10;
      default:
        return true;
    }
  });

  return (
    <div className="gallery-tab">
      <div className="gallery-filters">
        <h4>Community Artwork</h4>
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filter === 'featured' ? 'active' : ''}`}
            onClick={() => setFilter('featured')}
          >
            ⭐ Featured
          </button>
          <button 
            className={`filter-btn ${filter === 'recent' ? 'active' : ''}`}
            onClick={() => setFilter('recent')}
          >
            🆕 Recent
          </button>
          <button 
            className={`filter-btn ${filter === 'popular' ? 'active' : ''}`}
            onClick={() => setFilter('popular')}
          >
            🔥 Popular
          </button>
        </div>
      </div>

      <div className={`artworks-grid ${viewMode === 'compact' ? 'compact-view' : 'full-view'}`}>
        {filteredArtworks.map(artwork => (
          <div key={artwork._id} className="artwork-card">
            <div className="artwork-image-container">
              <img 
                src={artwork.imageUrl} 
                alt={artwork.title}
                className="artwork-image"
                loading="lazy"
              />
              {artwork.featured && (
                <div className="featured-badge">⭐ Featured</div>
              )}
            </div>
            
            <div className="artwork-info">
              <h5 className="artwork-title">{artwork.title}</h5>
              <p className="artwork-description">{artwork.description}</p>
              <div className="artwork-meta">
                <span className="artist-name">by {artwork.artist?.firstName || 'Anonymous'}</span>
                <span className="artwork-date">
                  {new Date(artwork.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className="artwork-actions">
                <button 
                  className="vote-btn"
                  onClick={() => onVote(artwork._id)}
                  disabled={artwork.userVoted}
                >
                  {artwork.userVoted ? '❤️' : '🤍'} {artwork.votes || 0}
                </button>
                <button className="share-btn">📤 Share</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredArtworks.length === 0 && (
        <div className="empty-gallery">
          <div className="empty-icon">🎨</div>
          <p>No artworks found for this filter.</p>
        </div>
      )}
    </div>
  );
}

// Contests Tab Component
function ContestsTab({ contests, onJoinContest, user }) {
  return (
    <div className="contests-tab">
      <h4>Art Contests</h4>
      
      <div className="contests-list">
        {contests.map(contest => (
          <div key={contest._id} className="contest-card">
            <div className="contest-header">
              <div className="contest-icon">{contest.icon}</div>
              <div className="contest-info">
                <h5>{contest.title}</h5>
                <p>{contest.description}</p>
              </div>
            </div>
            
            <div className="contest-details">
              <div className="contest-stats">
                <span className="participants">
                  👥 {contest.participants} participants
                </span>
                <span className="prize">
                  🏆 {contest.prize}
                </span>
              </div>
              
              <div className="contest-timeline">
                <span className="start-date">
                  Started: {new Date(contest.startDate).toLocaleDateString()}
                </span>
                <span className="end-date">
                  Ends: {new Date(contest.endDate).toLocaleDateString()}
                </span>
              </div>
            </div>
            
            <div className="contest-actions">
              <button 
                className="join-contest-btn"
                onClick={() => onJoinContest(contest._id)}
                disabled={contest.userJoined || new Date() > new Date(contest.endDate)}
              >
                {contest.userJoined ? '✅ Joined' : '🏆 Join Contest'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Upload Tab Component
function UploadTab({ selectedFile, uploadData, setUploadData, onFileSelect, onUpload, uploading, contests }) {
  return (
    <div className="upload-tab">
      <h4>Upload Your Coffee Art</h4>
      
      <div className="upload-form">
        <div className="upload-section">
          <label htmlFor="image-upload" className="upload-label">
            📷 Select Image
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={onFileSelect}
            className="file-input"
          />
          {selectedFile && (
            <div className="file-preview">
              <img 
                src={URL.createObjectURL(selectedFile)} 
                alt="Preview" 
                className="preview-image"
              />
              <p className="file-name">{selectedFile.name}</p>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="artwork-title" className="form-label">
            Title *
          </label>
          <input
            id="artwork-title"
            type="text"
            value={uploadData.title}
            onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
            placeholder="Enter artwork title"
            className="form-input"
            maxLength={100}
          />
        </div>

        <div className="form-group">
          <label htmlFor="artwork-description" className="form-label">
            Description
          </label>
          <textarea
            id="artwork-description"
            value={uploadData.description}
            onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
            placeholder="Describe your coffee art..."
            className="form-textarea"
            rows={3}
            maxLength={500}
          />
        </div>

        {contests.length > 0 && (
          <div className="form-group">
            <label htmlFor="contest-select" className="form-label">
              Submit to Contest (Optional)
            </label>
            <select
              id="contest-select"
              value={uploadData.contestId || ''}
              onChange={(e) => setUploadData({ ...uploadData, contestId: e.target.value || null })}
              className="form-select"
            >
              <option value="">No contest</option>
              {contests.map(contest => (
                <option key={contest._id} value={contest._id}>
                  {contest.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <button 
          className="upload-btn"
          onClick={onUpload}
          disabled={uploading || !selectedFile || !uploadData.title.trim()}
        >
          {uploading ? (
            <>
              <span className="loading-spinner"></span>
              Uploading...
            </>
          ) : (
            '📤 Upload Artwork'
          )}
        </button>
      </div>
    </div>
  );
}

export default CoffeeArtGallery;
