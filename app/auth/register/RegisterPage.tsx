"use client";

import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { toast } from "sonner";

interface RegisterPageProps {
  onNavigate: (page: string) => void;
}

// Cambodia first + full list
const COUNTRIES: string[] = [
  "Cambodia",
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi",
  "Cabo Verde","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Cote d'Ivoire","Croatia","Cuba","Cyprus","Czechia",
  "Denmark","Djibouti","Dominica","Dominican Republic",
  "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia",
  "Fiji","Finland","France",
  "Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana",
  "Haiti","Honduras","Hungary",
  "Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
  "Jamaica","Japan","Jordan",
  "Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
  "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg",
  "Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar",
  "Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway",
  "Oman",
  "Pakistan","Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal",
  "Qatar",
  "Romania","Russia","Rwanda",
  "Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
  "Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu",
  "Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan",
  "Vanuatu","Vatican City","Venezuela","Vietnam",
  "Yemen",
  "Zambia","Zimbabwe"
];

function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9._]{3,30}$/.test(username);
}

export function RegisterPage({ onNavigate }: RegisterPageProps) {
  const { register } = useAuth();
  const { t } = useLanguage();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    birthDate: "",
    place: "Cambodia",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const handleChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error(t("register.errors.nameRequired"));
      return;
    }

    const uname = formData.username.trim();
    if (!uname) {
      toast.error(t("register.errors.usernameRequired"));
      return;
    }
    if (!isValidUsername(uname)) {
      toast.error(t("register.errors.usernameInvalid"));
      return;
    }

    if (!formData.email.trim() || !formData.password) {
      toast.error(t("register.errors.required"));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error(t("register.errors.passwordMismatch"));
      return;
    }

    if (!formData.agreeTerms) {
      toast.error(t("register.errors.terms"));
      return;
    }

    setIsLoading(true);
    try {
      await register(
        formData.firstName.trim(),
        formData.lastName.trim(),
        uname,
        formData.birthDate,
        formData.place,
        formData.email.trim(),
        formData.password
      );

      toast.success(t("register.success"));
      onNavigate("login");
    } catch (error) {
      toast.error(t("register.failed"), {
        description: error instanceof Error ? error.message : t("register.tryAgain"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center space-x-2 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-2xl">E</span>
              </div>
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Edugroit
              </span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900">{t("register.title")}</h2>
            <p className="text-gray-600 mt-2">{t("register.description")}</p>
          </div>

          {/* Social Registration Buttons */}
          <div className="space-y-3 mb-6">
            <Button type="button" variant="outline" className="w-full border-2">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t("register.google")} {t("register.to")} {t("register.emailLabel")}
            </Button>

            <Button type="button" variant="outline" className="w-full border-2">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              {t("register.facebook")} {t("register.to")} {t("register.emailLabel")}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">{t("register.email")}</span>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-5">
            {/* First + Last name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">{t("register.firstName")}</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder={t("register.firstNamePlaceholder")}
                    value={formData.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="lastName">{t("register.lastName")}</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder={t("register.lastNamePlaceholder")}
                    value={formData.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Username */}
            <div>
              <Label htmlFor="username">{t("register.username")}</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="username"
                  type="text"
                  placeholder={t("register.usernamePlaceholder")}
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{t("register.usernameHint")}</p>
            </div>

            {/* Birth date */}
            <div>
              <Label htmlFor="birthDate">{t("register.birthDate")}</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => handleChange("birthDate", e.target.value)}
              />
            </div>

            {/* Place */}
            <div>
              <Label htmlFor="place">{t("register.place")}</Label>
              <select
                id="place"
                value={formData.place}
                onChange={(e) => handleChange("place", e.target.value)}
                className="w-full mt-1 rounded-md border border-gray-300 px-3 py-2 bg-white"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">{t("register.emailLabel")}</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t("register.emailPlaceholder")}
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password">{t("register.passwordLabel")}</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("register.passwordPlaceholder")}
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirmPassword">{t("register.confirmPassword")}</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t("register.confirmPlaceholder")}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={formData.agreeTerms}
                onCheckedChange={(checked) => handleChange("agreeTerms", Boolean(checked))}
              />
              <Label htmlFor="terms" className="text-sm cursor-pointer leading-tight">
                {t("register.agreeTerms")}{" "}
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  {t("register.termsLink")}
                </a>{" "}
                {t("register.and")}{" "}
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  {t("register.privacyLink")}
                </a>
              </Label>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={isLoading}
            >
              {isLoading ? t("register.loading") : t("register.createAccount")}
            </Button>
          </form>

          {/* Login Link */}
          <p className="mt-6 text-center text-sm text-gray-600">
            {t("register.haveAccount")}{" "}
            <button
              type="button"
              onClick={() => onNavigate("login")}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              {t("register.signinLink")}
            </button>
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            {t("register.backHome")}
          </button>
        </div>
      </div>
    </div>
  );
}
