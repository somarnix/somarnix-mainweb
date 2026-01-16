import {
  Star,
  Clock,
  BookOpen,
  Users,
  Award,
  CheckCircle,
  Play,
  Download,
  Globe,
  ShoppingCart,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { useLanguage } from "../../contexts/LanguageContext";

type DbCourseDetail = {
  id: number;
  title: string;
  slug: string;
  description: string;
  image_url: string | null;
  category: string;
  instructor: string;
  rating: number;
  students: number;
  duration: string;
  lessons: number;
  min_price: number | null;
  min_original_price: number | null;
  bestseller: boolean;
  is_new: boolean;
};

interface CourseDetailPageProps {
  slug: string;
  onNavigate: (page: string) => void;
}

export function CourseDetailPage({
  slug,
  onNavigate,
}: CourseDetailPageProps) {
  const { t } = useLanguage();

  const [course, setCourse] = useState<DbCourseDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  /* ================= FETCH FROM DB ================= */
  useEffect(() => {
    fetch(`/api/products/${slug}`)
      .then((res) => res.json())
      .then((data) => setCourse(data))
      .finally(() => setLoading(false));
  }, [slug]);

  /* ================= STATIC UI DATA (UNCHANGED) ================= */
  const curriculum = [
    {
      section: "Introduction",
      lessons: [
        { title: "Welcome to the Course", duration: "5:23", preview: true },
        { title: "Course Overview", duration: "8:45", preview: true },
        { title: "Setting Up Your Environment", duration: "12:30", preview: false },
      ],
    },
    {
      section: "Fundamentals",
      lessons: [
        { title: "Core Concepts", duration: "15:20", preview: false },
        { title: "Best Practices", duration: "18:45", preview: false },
        { title: "Hands-on Exercise", duration: "25:10", preview: false },
      ],
    },
  ];

  const reviews = [
    {
      name: "Sarah Johnson",
      rating: 5,
      date: "January 2, 2026",
      comment:
        "Excellent course! The instructor explains everything clearly.",
    },
    {
      name: "Michael Chen",
      rating: 5,
      date: "December 28, 2025",
      comment: "Best investment in my career.",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Course not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ================= HERO ================= */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* LEFT */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                <button
                  onClick={() => onNavigate("courses")}
                  className="hover:text-white"
                >
                  Courses
                </button>
                <span>/</span>
                <span>{course.category}</span>
              </div>

              <div className="flex gap-2 mb-4">
                {course.bestseller && (
                  <Badge className="bg-yellow-500">Bestseller</Badge>
                )}
                {course.is_new && (
                  <Badge className="bg-green-500">New</Badge>
                )}
                <Badge variant="secondary">{course.category}</Badge>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {course.title}
              </h1>
              <p className="text-xl text-gray-300 mb-6">
                {course.description}
              </p>

              <div className="flex gap-6 mb-6">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <span>{course.rating}</span>
                  <span className="text-gray-400">
                    ({course.students.toLocaleString()})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {course.duration}
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  {course.lessons} lessons
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="w-6 h-6" />
                <span>{course.instructor}</span>
              </div>
            </div>

            {/* RIGHT */}
            <div className="bg-white rounded-xl shadow-xl p-6 sticky top-24">
              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-3xl font-bold">
                  ${course.min_price}
                </span>
                {course.min_original_price && (
                  <span className="line-through text-gray-400">
                    ${course.min_original_price}
                  </span>
                )}
              </div>

              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 mb-4"
                onClick={() => setShowModal(true)}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Add to Cart
              </Button>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex gap-2">
                  <Play className="w-4 h-4" /> On-demand video
                </div>
                <div className="flex gap-2">
                  <Download className="w-4 h-4" /> Resources
                </div>
                <div className="flex gap-2">
                  <Globe className="w-4 h-4" /> Lifetime access
                </div>
                <div className="flex gap-2">
                  <Award className="w-4 h-4" /> Certificate
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= TABS ================= */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Tabs defaultValue="overview">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="bg-white p-6 mt-4">
            <h2 className="text-2xl font-bold mb-4">
              About This Course
            </h2>
            <p className="text-gray-600">{course.description}</p>
          </TabsContent>

          <TabsContent value="curriculum" className="bg-white p-6 mt-4">
            {curriculum.map((section, i) => (
              <div key={i} className="mb-4">
                <h3 className="font-semibold mb-2">
                  {section.section}
                </h3>
                {section.lessons.map((l, j) => (
                  <div
                    key={j}
                    className="flex justify-between py-2 border-b"
                  >
                    <span>{l.title}</span>
                    <span className="text-sm text-gray-500">
                      {l.duration}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="reviews" className="bg-white p-6 mt-4">
            {reviews.map((r, i) => (
              <div key={i} className="border-b pb-4 mb-4">
                <div className="flex justify-between">
                  <strong>{r.name}</strong>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, j) => (
                      <Star
                        key={j}
                        className={`w-4 h-4 ${
                          j < r.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600">{r.comment}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
