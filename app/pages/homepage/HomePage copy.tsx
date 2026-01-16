import { useEffect, useState } from "react";
import { Hero } from "../../components/Hero";
import { CourseCard } from "../../components/CourseCard";
import { TrendingUp, Award, Users, BookOpen, Play } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useLanguage } from "../../contexts/LanguageContext";

type DbProduct = {
  id: number;
  title: string;
  slug: string;
  image_url: string | null;
  min_price: number | null;
  min_original_price: number | null;
};

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { t } = useLanguage();

  const [featured, setFeatured] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 Load featured products from DB
  useEffect(() => {
    fetch("/api/products?limit=6")
      .then((res) => res.json())
      .then((data) => setFeatured(data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Hero onNavigate={onNavigate} />

      {/* Stats Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <Stat icon={<Users />} value="500K+" label={t("stats.active")} />
            <Stat icon={<BookOpen />} value="10K+" label={t("stats.courses")} />
            <Stat icon={<Award />} value="15K+" label={t("stats.instructors")} />
            <Stat icon={<TrendingUp />} value="98%" label={t("stats.success")} />
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t("featured.title")}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t("featured.description")}
            </p>
          </div>

          {loading ? (
            <div className="text-center text-gray-500">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
              {featured.map((p) => (
                <CourseCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  image={p.image_url}
                  price={p.min_price}
                  originalPrice={p.min_original_price}
                  slug={p.slug}
                />
              ))}
            </div>
          )}

          <div className="text-center">
            <Button
              size="lg"
              onClick={() => onNavigate("courses")}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {t("featured.viewAll")}
            </Button>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t("why.title")}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t("why.description")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <WhyCard
              icon={<Play />}
              title={t("why.pace.title")}
              desc={t("why.pace.description")}
            />
            <WhyCard
              icon={<Award />}
              title={t("why.certificate.title")}
              desc={t("why.certificate.description")}
            />
            <WhyCard
              icon={<Users />}
              title={t("why.expert.title")}
              desc={t("why.expert.description")}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            {t("cta.title")}
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            {t("cta.description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => onNavigate("register")}
              className="bg-white text-blue-600"
            >
              {t("cta.getStarted")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => onNavigate("courses")}
              className="border-2 border-white text-white"
            >
              {t("cta.browse")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------------- UI helpers ---------------- */

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex w-16 h-16 items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full mb-4 text-blue-600 dark:text-blue-400">
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white">
        {value}
      </div>
      <div className="text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  );
}

function WhyCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 p-8 rounded-xl">
      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4 text-white">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">{desc}</p>
    </div>
  );
}
