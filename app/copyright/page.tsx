// app/copyright/page.tsx
// DMCA & Copyright Notice Page

"use client";

export default function CopyrightPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Copyright & DMCA Notice
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last Updated: March 2026
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 space-y-8">
          
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              1. Copyright Notice
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              © {currentYear} GSTECHKH. All rights reserved.
            </p>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mt-4">
              All content, features, and functionality of this website, including but not limited to text, graphics, logos, icons, images, audio clips, digital downloads, data arrangements, and software, are the exclusive property of GSTECHKH and are protected by international copyright laws.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              2. Prohibited Activities
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              The following activities are strictly prohibited:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
              <li><strong>Copying or reproducing</strong> any content from this website without explicit written permission</li>
              <li><strong>Scraping or harvesting</strong> data, products, or user information</li>
              <li><strong>Using automated tools</strong> (bots, crawlers, scrapers) to access this website</li>
              <li><strong>Reverse engineering</strong> any software, code, or algorithms</li>
              <li><strong>Creating derivative works</strong> based on our content</li>
              <li><strong>Distributing, selling, or licensing</strong> our content to third parties</li>
              <li><strong>Framing or mirroring</strong> this website on other domains</li>
              <li><strong>Using our trademarks, logos, or brand elements</strong> without permission</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              3. Intellectual Property
            </h2>
            <div className="space-y-3 text-gray-600 dark:text-gray-300">
              <p><strong>Trademarks:</strong> GSTECHKH name, logo, and brand elements</p>
              <p><strong>Copyrights:</strong> All website content, code, and design</p>
              <p><strong>Patents:</strong> Proprietary technology and processes</p>
              <p><strong>Trade Secrets:</strong> Business methods and algorithms</p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              4. DMCA Compliance
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              We respect intellectual property rights and comply with the Digital Millennium Copyright Act (DMCA).
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mt-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                How to Report Copyright Infringement:
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                If you believe your copyrighted work has been used without authorization, please contact us:
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                <strong>Email:</strong> support@gstechkh.com<br />
                <strong>Subject:</strong> DMCA Takedown Notice
              </p>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Required Information:
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
                <li>Your contact information (name, address, phone, email)</li>
                <li>Description of the copyrighted work</li>
                <li>Location of the infringing material (URL)</li>
                <li>Statement of good faith belief</li>
                <li>Statement under penalty of perjury</li>
                <li>Your physical or electronic signature</li>
              </ol>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Our Response:
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
                <li>We will respond within 48 hours</li>
                <li>Infringing content will be removed promptly</li>
                <li>Repeat infringers will be banned</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              5. Legal Consequences
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              Violators may face:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
              <li><strong>Civil Lawsuits</strong> for copyright infringement</li>
              <li><strong>Statutory Damages</strong> up to $150,000 per work</li>
              <li><strong>Criminal Charges</strong> for willful infringement</li>
              <li><strong>Injunctions</strong> to stop infringing activities</li>
              <li><strong>Legal Fees</strong> and court costs</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              6. Contact Information
            </h2>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                For copyright questions:
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                <strong>Email:</strong> support@gstechkh.com<br />
                <strong>Response Time:</strong> 24-48 hours
              </p>
            </div>
          </section>

          {/* Footer Notice */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-8 mt-8">
            <p className="text-center text-gray-600 dark:text-gray-300 font-semibold">
              By using this website, you agree to these terms.
            </p>
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-2">
              GSTECHKH Legal Team
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
