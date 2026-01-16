import { useState } from 'react';
import { Search, Play, Eye, ThumbsUp, Clock, Calendar } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoId: string; // YouTube video ID
  views: number;
  likes: number;
  duration: string;
  uploadDate: string;
  category: string;
}

interface BlogPageProps {
  onNavigate: (page: string) => void;
}

export function BlogPage({ onNavigate }: BlogPageProps) {
  const { language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  // Mock video data (replace videoId with real YouTube video IDs)
  const videos: Video[] = [
    {
      id: '1',
      title: 'Complete Web Development Tutorial 2024',
      description: 'Learn web development from scratch with HTML, CSS, and JavaScript',
      thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=450&fit=crop',
      videoId: 'dQw4w9WgXcQ', // Replace with actual YouTube video ID
      views: 125000,
      likes: 8900,
      duration: '2:45:30',
      uploadDate: '2024-01-15',
      category: 'programming'
    },
    {
      id: '2',
      title: 'Advanced React Hooks Tutorial',
      description: 'Master React Hooks with practical examples and best practices',
      thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=450&fit=crop',
      videoId: 'dQw4w9WgXcQ',
      views: 98000,
      likes: 7200,
      duration: '1:35:20',
      uploadDate: '2024-01-20',
      category: 'programming'
    },
    {
      id: '3',
      title: 'UI/UX Design Principles',
      description: 'Learn essential design principles for creating beautiful interfaces',
      thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=450&fit=crop',
      videoId: 'dQw4w9WgXcQ',
      views: 156000,
      likes: 12500,
      duration: '58:45',
      uploadDate: '2024-01-18',
      category: 'design'
    },
    {
      id: '4',
      title: 'Machine Learning for Beginners',
      description: 'Introduction to machine learning concepts and practical applications',
      thumbnail: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=450&fit=crop',
      videoId: 'dQw4w9WgXcQ',
      views: 87000,
      likes: 6800,
      duration: '3:12:15',
      uploadDate: '2024-01-12',
      category: 'ai'
    },
    {
      id: '5',
      title: 'Digital Marketing Strategies 2024',
      description: 'Latest digital marketing trends and strategies for success',
      thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop',
      videoId: 'dQw4w9WgXcQ',
      views: 203000,
      likes: 15600,
      duration: '1:42:30',
      uploadDate: '2024-01-10',
      category: 'business'
    },
    {
      id: '6',
      title: 'Photography Masterclass',
      description: 'Professional photography techniques and composition tips',
      thumbnail: 'https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=800&h=450&fit=crop',
      videoId: 'dQw4w9WgXcQ',
      views: 142000,
      likes: 11200,
      duration: '2:18:45',
      uploadDate: '2024-01-08',
      category: 'creative'
    }
  ];

  const categories = [
    { id: 'all', name: language === 'km' ? 'ទាំងអស់' : 'All Videos' },
    { id: 'programming', name: language === 'km' ? 'កម្មវិធី' : 'Programming' },
    { id: 'design', name: language === 'km' ? 'ការរចនា' : 'Design' },
    { id: 'ai', name: language === 'km' ? 'AI' : 'AI & ML' },
    { id: 'business', name: language === 'km' ? 'អាជីវកម្ម' : 'Business' },
    { id: 'creative', name: language === 'km' ? 'គំនិតច្នៃប្រឌិត' : 'Creative' }
  ];

  const filteredVideos = selectedCategory === 'all' 
    ? videos 
    : videos.filter(v => v.category === selectedCategory);

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
    return views.toString();
  };

  const openVideo = (video: Video) => {
    setSelectedVideo(video);
  };

  const closeVideo = () => {
    setSelectedVideo(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Play className="w-12 h-12" />
              <h1 className="text-4xl md:text-5xl font-bold">
                {language === 'km' ? 'វីដេអូបង្រៀន' : 'Video Tutorials'}
              </h1>
            </div>
            <p className="text-xl text-red-100 mb-8">
              {language === 'km' 
                ? 'រៀនជាមួយវីដេអូបង្រៀនពីគ្រូបង្រៀនជំនាញ' 
                : 'Learn with video tutorials from expert instructors'}
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={language === 'km' ? 'ស្វែងរកវីដេអូ...' : 'Search videos...'}
                className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 dark:text-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Category Filters */}
        <div className="mb-8">
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-red-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Videos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              onClick={() => openVideo(video)}
              className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer"
            >
              {/* Video Thumbnail */}
              <div className="relative group">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 text-white ml-1" fill="white" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 bg-black/80 text-white px-2 py-1 rounded text-xs font-semibold">
                  {video.duration}
                </div>
              </div>

              {/* Video Info */}
              <div className="p-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {video.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                  {video.description}
                </p>

                {/* Video Stats */}
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{formatViews(video.views)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" />
                      <span>{formatViews(video.likes)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(video.uploadDate).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Category Badge */}
                <div className="mt-3">
                  <span className="inline-block px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-full capitalize">
                    {video.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <div className="flex justify-end p-4">
              <button
                onClick={closeVideo}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* YouTube Embed */}
            <div className="aspect-video w-full">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${selectedVideo.videoId}`}
                title={selectedVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </div>

            {/* Video Details */}
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {selectedVideo.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {selectedVideo.description}
              </p>
              
              <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  <span>{formatViews(selectedVideo.views)} {language === 'km' ? 'ចំនួនមើល' : 'views'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ThumbsUp className="w-5 h-5" />
                  <span>{formatViews(selectedVideo.likes)} {language === 'km' ? 'ចូលចិត្ត' : 'likes'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{selectedVideo.duration}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
