// filepath: automotive-salah/packages/ui/components/layout/footer.tsx
"use client";

import Link from "next/link";

import Image from "next/image";

import {
  Facebook,
  Twitter,
  Instagram,
  Phone,
  Mail,
  ChevronUp,
  MapPin,
} from "lucide-react";

import { Button } from "@automotive/ui";

export function Footer() {
  return (
    <footer className="bg-[#1e1817] text-white">
      <div className="container py-8 px-2 md:px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-10 gap-3 md:gap-4 lg:gap-6">
          {/* Column 1: Automotive Locksmith Supplies */}

          <div className="col-span-1 md:col-span-1 lg:col-span-2">
            <h3 className="text-lg font-bold mb-3">
              Automotive Locksmith Supplies
            </h3>

            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-sm hover:text-gray-300">
                  By Manufacturer
                </Link>
              </li>

              <li>
                <Link href="#" className="text-sm hover:text-gray-300">
                  Clearance
                </Link>
              </li>

              <li>
                <Link href="#" className="text-sm hover:text-gray-300">
                  Deals
                </Link>
              </li>

              <li>
                <Link href="#" className="text-sm hover:text-gray-300">
                  New Products
                </Link>
              </li>

              <li>
                <Link href="#" className="text-sm hover:text-gray-300">
                  RFID Windows
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Corporate */}

          <div className="col-span-1 md:col-span-1 lg:col-span-2">
            <h3 className="text-lg font-bold mb-3">Corporate</h3>

            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-sm hover:text-gray-300">
                  Track Your Order
                </Link>
              </li>

              <li>
                <Link href="#" className="text-sm hover:text-gray-300">
                  Help/FAQ
                </Link>
              </li>

              <li>
                <Link href="#" className="text-sm hover:text-gray-300">
                  About Us
                </Link>
              </li>

              <li>
                <Link href="#" className="text-sm hover:text-gray-300">
                  Contact Us
                </Link>
              </li>

              <li>
                <Link href="#" className="text-sm hover:text-gray-300">
                  Do Not Sell My Info - CA Residents Only
                </Link>
              </li>

              <li>
                <Link href="#" className="text-sm hover:text-gray-300">
                  Key Buy Program Details
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal Documents */}

          <div className="col-span-1 md:col-span-1 lg:col-span-2">
            <h3 className="text-lg font-bold mb-3">Legal Documents</h3>

            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-sm hover:text-gray-300">
                  Terms & Conditions
                </Link>
              </li>

              <li>
                <Link href="#" className="text-sm hover:text-gray-300">
                  Return Policy
                </Link>
              </li>

              <li>
                <Link href="#" className="text-sm hover:text-gray-300">
                  Privacy Policy
                </Link>
              </li>

              <li>
                <Link href="#" className="text-sm hover:text-gray-300">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact Us - Separate section */}

          <div className="col-span-1 md:col-span-1 lg:col-span-2 order-4 md:order-4 lg:order-4">
            <h3 className="text-lg font-bold mb-3">Contact Us</h3>

            <address className="not-italic mb-3">
              {/* Phone Numbers */}

              <div className="mb-2">
                <p className="flex items-center mb-1">
                  <span className="inline-block w-5 mr-2 text-[#FF6F61] flex-shrink-0">
                    <Phone className="h-4 w-4" />
                  </span>

                  <Link
                    href="tel:+14074496740"
                    className="text-sm hover:text-gray-300 break-all"
                  >
                    +1-407-449-6740
                  </Link>
                </p>

                <p className="flex items-center mb-1 ml-7">
                  <Link
                    href="tel:+14074527149"
                    className="text-sm hover:text-gray-300 break-all"
                  >
                    +1-407-452-7149
                  </Link>
                </p>

                <p className="flex items-center mb-2 ml-7">
                  <Link
                    href="tel:+14079786077"
                    className="text-sm hover:text-gray-300 break-all"
                  >
                    +1-407-978-6077
                  </Link>
                </p>
              </div>

              {/* Email Addresses */}

              <div className="mb-2">
                <p className="flex items-center mb-1">
                  <span className="inline-block w-5 mr-2 text-[#FF6F61] flex-shrink-0">
                    <Mail className="h-4 w-4" />
                  </span>

                  <Link
                    href="mailto:sales@ulk-supply.com"
                    className="text-sm hover:text-gray-300 break-all"
                  >
                    sales@ulk-supply.com
                  </Link>
                </p>

                <p className="flex items-center mb-2 ml-7">
                  <Link
                    href="mailto:ulksupply@hotmail.com"
                    className="text-sm hover:text-gray-300 break-all"
                  >
                    ulksupply@hotmail.com
                  </Link>
                </p>
              </div>

              {/* Address */}

              <div className="flex items-start mb-3">
                <span className="inline-block w-5 mr-2 text-[#FF6F61] flex-shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4" />
                </span>

                <p className="text-sm">
                  1508 W Vine St
                  <br />
                  Kissimmee, FL 34741
                </p>
              </div>
            </address>

            {/* Social Icons */}

            <div className="flex space-x-4">
              <Link
                href="#"
                className="text-white hover:text-gray-300 hover:scale-110 transition-transform"
              >
                <Facebook className="h-5 w-5" />

                <span className="sr-only">Facebook</span>
              </Link>

              <Link
                href="#"
                className="text-white hover:text-gray-300 hover:scale-110 transition-transform"
              >
                <Twitter className="h-5 w-5" />

                <span className="sr-only">Twitter</span>
              </Link>

              <Link
                href="#"
                className="text-white hover:text-gray-300 hover:scale-110 transition-transform"
              >
                <Instagram className="h-5 w-5" />

                <span className="sr-only">Instagram</span>
              </Link>
            </div>
          </div>

          {/* Column 5: Map - Separate section - Full width on mobile */}

          <div className="col-span-2 md:col-span-4 lg:col-span-2 order-5 md:order-5 lg:order-5">
            <div className="relative w-full h-48 md:h-56 lg:h-64 rounded-lg overflow-hidden border border-gray-600">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d14051.322168483486!2d-81.418344!3d28.303457!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88dd851677b224a3%3A0x1d2529c0a54763e4!2sULK%20Supply%20LLC!5e0!3m2!1sen!2sus!4v1748259865220!5m2!1sen!2sus&disableDefaultUI=true&gestureHandling=cooperative&zoomControl=false&mapTypeControl=false&streetViewControl=false&fullscreenControl=false"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="ULK Supply Location"
                className="filter brightness-90 contrast-110"
              ></iframe>

              {/* Map Overlay for Styling */}

              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
            </div>
          </div>
        </div>

        {/* Logo and Copyright */}

        <div className="mt-8 pt-6 border-t border-white/20 text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="https://i.postimg.cc/136fcG0Z/qt-q-95.png"
              alt="KEY4 Logo"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>

          <p className="text-sm">
            © {new Date().getFullYear()} ULK Supply. All Rights Reserved.
          </p>
        </div>
      </div>

      {/* Back to Top Button */}

      <Button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-6 right-6 bg-red-700 hover:bg-red-600 rounded-full p-3 shadow-lg z-50"
        aria-label="Back to top"
      >
        <ChevronUp className="h-5 w-5" />
      </Button>
    </footer>
  );
}
