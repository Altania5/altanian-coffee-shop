import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './SocialFeatures.css';

function SocialFeatures({ user }) {
  const [activeTab, setActiveTab] = useState('sharing');
  const [coffeeLogs, setCoffeeLogs] = useState([]);
  const [communityChallenges, setCommunityChallenges] = useState([]);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSocialData();
    }
  }, [user]);

  const loadSocialData = async () => {
    try {
      setLoading(true);
      
      const [logsResponse, challengesResponse, postsResponse] = await Promise.all([
        api.get('/coffeelogs'),
        api.get('/social/challenges'),
        api.get('/social/feed')
      ]);

      setCoffeeLogs(logsResponse.data.logs || []);
      setCommunityChallenges(challengesResponse.data.challenges || []);
      setUserPosts(postsResponse.data.posts || []);
    } catch (error) {
      console.error('Failed to load social data:', error);
    } finally {
      setLoading(false);
    }
  };

  const shareCoffeeLog = async (logId) => {
    try {
      const log = coffeeLogs.find(l => l._id === logId);
      if (!log) return;

      const shareData = {
        title: `My ${log.bean?.name || 'Coffee'} Experience`,
        text: `Just had an amazing ${log.shotQuality}/10 shot! ${log.notes || ''}`,
        url: window.location.origin + `/coffee-log/${logId}`
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(`${shareData.text} - ${shareData.url}`);
        alert('Share text copied to clipboard!');
      }

      // Track share
      await api.post('/social/share', { logId, type: 'coffee_log' });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const shareOrder = async (orderId) => {
    try {
      const shareData = {
        title: 'My Altania Coffee Order',
        text: 'Just ordered some amazing coffee from Altania Coffee!',
        url: window.location.origin + `/order/${orderId}`
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} - ${shareData.url}`);
        alert('Share text copied to clipboard!');
      }

      await api.post('/social/share', { orderId, type: 'order' });
    } catch (error) {
      console.error('Failed to share order:', error);
    }
  };

  const joinChallenge = async (challengeId) => {
    try {
      await api.post('/social/challenges/join', { challengeId });
      loadSocialData(); // Refresh data
      alert('Challenge joined successfully!');
    } catch (error) {
      console.error('Failed to join challenge:', error);
      alert('Failed to join challenge');
    }
  };

  const createPost = async (postData) => {
    try {
      await api.post('/social/posts', postData);
      loadSocialData(); // Refresh data
      alert('Post created successfully!');
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('Failed to create post');
    }
  };

  const likePost = async (postId) => {
    try {
      await api.post('/social/posts/like', { postId });
      loadSocialData(); // Refresh data
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  if (loading) {
    return (
      <div className="social-features">
        <div className="loading-spinner"></div>
        <p>Loading social features...</p>
      </div>
    );
  }

  return (
    <div className="social-features">
      <div className="social-header">
        <h3>🌟 Social Features</h3>
        <div className="social-tabs">
          <button 
            className={`tab ${activeTab === 'sharing' ? 'active' : ''}`}
            onClick={() => setActiveTab('sharing')}
          >
            📤 Sharing
          </button>
          <button 
            className={`tab ${activeTab === 'challenges' ? 'active' : ''}`}
            onClick={() => setActiveTab('challenges')}
          >
            🏆 Challenges
          </button>
          <button 
            className={`tab ${activeTab === 'community' ? 'active' : ''}`}
            onClick={() => setActiveTab('community')}
          >
            👥 Community
          </button>
        </div>
      </div>

      <div className="social-content">
        {activeTab === 'sharing' && (
          <SharingTab 
            coffeeLogs={coffeeLogs}
            onShareLog={shareCoffeeLog}
            onShareOrder={shareOrder}
          />
        )}

        {activeTab === 'challenges' && (
          <ChallengesTab 
            challenges={communityChallenges}
            onJoinChallenge={joinChallenge}
          />
        )}

        {activeTab === 'community' && (
          <CommunityTab 
            posts={userPosts}
            onCreatePost={createPost}
            onLikePost={likePost}
            user={user}
          />
        )}
      </div>
    </div>
  );
}

// Sharing Tab Component
function SharingTab({ coffeeLogs, onShareLog, onShareOrder }) {
  const recentLogs = coffeeLogs.slice(0, 5);

  return (
    <div className="sharing-tab">
      <h4>Share Your Coffee Journey</h4>
      
      <div className="share-section">
        <h5>Recent Coffee Logs</h5>
        <div className="logs-list">
          {recentLogs.map(log => (
            <div key={log._id} className="log-item">
              <div className="log-info">
                <span className="bean-name">{log.bean?.name || 'Unknown Bean'}</span>
                <span className="quality-score">{log.shotQuality}/10</span>
                <span className="log-date">
                  {new Date(log.createdAt).toLocaleDateString()}
                </span>
              </div>
              <button 
                className="share-btn"
                onClick={() => onShareLog(log._id)}
              >
                📤 Share
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="share-section">
        <h5>Quick Share Options</h5>
        <div className="quick-share-options">
          <button className="quick-share-btn" onClick={() => shareCurrentOrder()}>
            📦 Share Current Order
          </button>
          <button className="quick-share-btn" onClick={() => shareFavoriteDrink()}>
            ☕ Share Favorite Drink
          </button>
          <button className="quick-share-btn" onClick={() => shareCoffeeShop()}>
            🏪 Share Altania Coffee
          </button>
        </div>
      </div>
    </div>
  );
}

// Challenges Tab Component
function ChallengesTab({ challenges, onJoinChallenge }) {
  return (
    <div className="challenges-tab">
      <h4>Community Challenges</h4>
      
      <div className="challenges-list">
        {challenges.map(challenge => (
          <div key={challenge._id} className="challenge-item">
            <div className="challenge-header">
              <span className="challenge-icon">{challenge.icon}</span>
              <div className="challenge-info">
                <h5>{challenge.title}</h5>
                <p>{challenge.description}</p>
              </div>
            </div>
            
            <div className="challenge-stats">
              <span className="participants">
                👥 {challenge.participants} participants
              </span>
              <span className="deadline">
                ⏰ Ends {new Date(challenge.deadline).toLocaleDateString()}
              </span>
            </div>
            
            <div className="challenge-actions">
              <button 
                className="join-challenge-btn"
                onClick={() => onJoinChallenge(challenge._id)}
                disabled={challenge.joined}
              >
                {challenge.joined ? '✅ Joined' : '🏆 Join Challenge'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Community Tab Component
function CommunityTab({ posts, onCreatePost, onLikePost, user }) {
  const [newPost, setNewPost] = useState({ content: '', image: null });

  const handleCreatePost = () => {
    if (!newPost.content.trim()) return;
    
    onCreatePost({
      content: newPost.content,
      image: newPost.image,
      author: user.id
    });
    
    setNewPost({ content: '', image: null });
  };

  return (
    <div className="community-tab">
      <h4>Community Posts</h4>
      
      <div className="create-post">
        <textarea
          placeholder="Share your coffee experience with the community..."
          value={newPost.content}
          onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
          maxLength={500}
          rows={3}
        />
        <div className="post-actions">
          <span className="char-count">{newPost.content.length}/500</span>
          <button 
            className="post-btn"
            onClick={handleCreatePost}
            disabled={!newPost.content.trim()}
          >
            📝 Post
          </button>
        </div>
      </div>

      <div className="posts-list">
        {posts.map(post => (
          <div key={post._id} className="post-item">
            <div className="post-header">
              <span className="author-name">{post.author?.firstName || 'Anonymous'}</span>
              <span className="post-date">
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            <div className="post-content">
              <p>{post.content}</p>
              {post.image && (
                <img src={post.image} alt="Post" className="post-image" />
              )}
            </div>
            
            <div className="post-actions">
              <button 
                className="like-btn"
                onClick={() => onLikePost(post._id)}
              >
                ❤️ {post.likes || 0}
              </button>
              <button className="comment-btn">
                💬 Comment
              </button>
              <button className="share-btn">
                📤 Share
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper functions for quick sharing
function shareCurrentOrder() {
  const shareData = {
    title: 'My Altania Coffee Order',
    text: 'Just placed an order at Altania Coffee!',
    url: window.location.origin
  };
  
  if (navigator.share) {
    navigator.share(shareData);
  } else {
    navigator.clipboard.writeText(`${shareData.text} - ${shareData.url}`);
    alert('Share text copied to clipboard!');
  }
}

function shareFavoriteDrink() {
  const shareData = {
    title: 'My Favorite Coffee',
    text: 'Check out my favorite drink at Altania Coffee!',
    url: window.location.origin
  };
  
  if (navigator.share) {
    navigator.share(shareData);
  } else {
    navigator.clipboard.writeText(`${shareData.text} - ${shareData.url}`);
    alert('Share text copied to clipboard!');
  }
}

function shareCoffeeShop() {
  const shareData = {
    title: 'Altania Coffee',
    text: 'Amazing coffee and great atmosphere at Altania Coffee!',
    url: window.location.origin
  };
  
  if (navigator.share) {
    navigator.share(shareData);
  } else {
    navigator.clipboard.writeText(`${shareData.text} - ${shareData.url}`);
    alert('Share text copied to clipboard!');
  }
}

export default SocialFeatures;
