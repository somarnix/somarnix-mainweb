"use client";

type AuthBrandProps = {
  textClassName?: string;
  wrapperClassName?: string;
};

export function AuthBrand({
  textClassName = "text-3xl font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent",
  wrapperClassName = "mb-4 inline-flex flex-wrap items-center justify-center gap-2",
}: AuthBrandProps) {
  return (
    <div className={wrapperClassName}>
      <img
        src="/khqr-assets/gstechkh-logo.png"
        alt="GSTECHKH"
        className="h-12 w-12 rounded-lg object-contain"
      />
      <span className={textClassName}>GSTECHKH</span>
    </div>
  );
}
