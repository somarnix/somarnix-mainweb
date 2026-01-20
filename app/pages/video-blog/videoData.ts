export type VideoCourse = {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnail: string;
  videoId: string;
  views: number;
  likes: number;
  duration: string;
  uploadDate: string;
  category: string;
  tags: string[];
  level: string;
  price: number;
  lessons: number;
  students: number;
  rating: number;
  ratingCount: number;
  author: string;
  authorAvatar: string;
};

export const videoCourses: VideoCourse[] = [
  {
    id: "1",
    slug: "seo-as-the-core-of-your-new-business-venture",
    title: "SEO as the Core of Your New Business Venture",
    description: "Learn how to build long-term SEO foundations and grow organic traffic.",
    thumbnail:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=450&fit=crop",
    videoId: "dQw4w9WgXcQ",
    views: 125000,
    likes: 8900,
    duration: "2:45:30",
    uploadDate: "2024-01-15",
    category: "marketing",
    tags: ["seo", "marketing", "business"],
    level: "beginner",
    price: 0,
    lessons: 16,
    students: 38,
    rating: 4.7,
    ratingCount: 28,
    author: "Masum Billah",
    authorAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
  },
  {
    id: "2",
    slug: "advanced-react-hooks-tutorial",
    title: "Advanced React Hooks Tutorial",
    description: "Master React Hooks with practical examples and best practices.",
    thumbnail:
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=450&fit=crop",
    videoId: "dQw4w9WgXcQ",
    views: 98000,
    likes: 7200,
    duration: "1:35:20",
    uploadDate: "2024-01-20",
    category: "web development",
    tags: ["react", "javascript"],
    level: "intermediate",
    price: 19,
    lessons: 14,
    students: 21,
    rating: 4.6,
    ratingCount: 19,
    author: "Masum Billah",
    authorAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
  },
  {
    id: "3",
    slug: "ui-ux-design-principles",
    title: "UI/UX Design Principles",
    description: "Learn essential design principles for creating beautiful interfaces.",
    thumbnail:
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=450&fit=crop",
    videoId: "dQw4w9WgXcQ",
    views: 156000,
    likes: 12500,
    duration: "58:45",
    uploadDate: "2024-01-18",
    category: "art & design",
    tags: ["ui", "ux", "figma"],
    level: "beginner",
    price: 0,
    lessons: 12,
    students: 40,
    rating: 4.8,
    ratingCount: 44,
    author: "Masum Billah",
    authorAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
  },
  {
    id: "4",
    slug: "machine-learning-for-beginners",
    title: "Machine Learning for Beginners",
    description: "Introduction to machine learning concepts and practical applications.",
    thumbnail:
      "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=450&fit=crop",
    videoId: "dQw4w9WgXcQ",
    views: 87000,
    likes: 6800,
    duration: "3:12:15",
    uploadDate: "2024-01-12",
    category: "data science",
    tags: ["python", "ai", "data"],
    level: "beginner",
    price: 29,
    lessons: 18,
    students: 12,
    rating: 4.5,
    ratingCount: 11,
    author: "Masum Billah",
    authorAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
  },
  {
    id: "5",
    slug: "digital-marketing-strategies-2024",
    title: "Digital Marketing Strategies 2024",
    description: "Latest digital marketing trends and strategies for success.",
    thumbnail:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop",
    videoId: "dQw4w9WgXcQ",
    views: 203000,
    likes: 15600,
    duration: "1:42:30",
    uploadDate: "2024-01-10",
    category: "marketing",
    tags: ["marketing", "seo"],
    level: "intermediate",
    price: 0,
    lessons: 14,
    students: 31,
    rating: 4.4,
    ratingCount: 17,
    author: "Masum Billah",
    authorAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
  },
  {
    id: "6",
    slug: "photography-masterclass",
    title: "Photography Masterclass",
    description: "Professional photography techniques and composition tips.",
    thumbnail:
      "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=800&h=450&fit=crop",
    videoId: "dQw4w9WgXcQ",
    views: 142000,
    likes: 11200,
    duration: "2:18:45",
    uploadDate: "2024-01-08",
    category: "art & design",
    tags: ["creative", "design"],
    level: "beginner",
    price: 0,
    lessons: 10,
    students: 9,
    rating: 4.9,
    ratingCount: 32,
    author: "Masum Billah",
    authorAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
  },
];

export const findVideoCourse = (slugOrId: string) =>
  videoCourses.find(
    (course) => course.slug === slugOrId || course.id === slugOrId
  ) ?? null;
