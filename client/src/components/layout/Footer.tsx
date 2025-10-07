import { useMemo, type FC, type ReactNode } from 'react';

const supplyLinks = [
  { label: 'By Manufacturer', href: '#' },
  { label: 'Clearance', href: '#' },
  { label: 'Deals', href: '#' },
  { label: 'New Products', href: '#' },
  { label: 'RFID Windows', href: '#' },
];

const corporateLinks = [
  { label: 'Track Your Order', href: '#' },
  { label: 'Help / FAQ', href: '#' },
  { label: 'About Us', href: '#' },
  { label: 'Contact Us', href: '#' },
  { label: 'Do Not Sell My Info - CA Residents Only', href: '#' },
  { label: 'Key Buy Program Details', href: '#' },
];

const legalLinks = [
  { label: 'Terms & Conditions', href: '#' },
  { label: 'Return Policy', href: '#' },
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
];

const socialLinks = [
  { label: 'Facebook', href: '#', Icon: FacebookIcon },
  { label: 'Twitter', href: '#', Icon: TwitterIcon },
  { label: 'Instagram', href: '#', Icon: InstagramIcon },
];

const contactPhones = ['+1-407-449-6740', '+1-407-452-7149', '+1-407-978-6077'];
const contactEmails = ['sales@ulk-supply.com', 'ulksupply@hotmail.com'];

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13.5 22v-7.16h2.4l.36-2.78h-2.76V9.53c0-.8.22-1.35 1.37-1.35h1.46V5.74c-.25-.03-1.13-.11-2.16-.11-2.14 0-3.6 1.31-3.6 3.72v2.07H8.8v2.78h2.77V22h1.93Z" />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M21.54 6.05c-.73.33-1.5.55-2.32.65a4.06 4.06 0 0 0 1.78-2.23 8.11 8.11 0 0 1-2.6.99 4.02 4.02 0 0 0-6.85 3.66 11.4 11.4 0 0 1-8.29-4.2 4.02 4.02 0 0 0 1.24 5.37 3.97 3.97 0 0 1-1.82-.5v.05a4.03 4.03 0 0 0 3.23 3.95 4.03 4.03 0 0 1-1.81.07 4.03 4.03 0 0 0 3.76 2.8A8.07 8.07 0 0 1 2 18.57a11.36 11.36 0 0 0 17.5-9.57c0-.17 0-.35-.01-.52a8.2 8.2 0 0 0 2.05-2.09Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5ZM17.75 6a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 17.75 6Z" />
    </svg>
  );
}

const PhoneIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M9.78 3c.43 0 .8.28.92.69l1.04 3.66a.96.96 0 0 1-.27.95l-1.3 1.3a12.14 12.14 0 0 0 5.23 5.24l1.3-1.3a.96.96 0 0 1 .95-.27l3.66 1.04a.96.96 0 0 1 .69.93v3.02a1.96 1.96 0 0 1-2.1 1.96A17.46 17.46 0 0 1 4.04 6.78 1.96 1.96 0 0 1 6 4.69Z" />
  </svg>
);

const MailIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm8 6.53L5.62 7.84A1 1 0 0 0 4 8.68v8.32h16V8.68a1 1 0 0 0-1.62-.84L12 11.53Zm0-2.41 8-4.62H4l8 4.62Z" />
  </svg>
);

const MapPinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13s-7-7.75-7-13a7 7 0 0 1 7-7Zm0 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
  </svg>
);

export const Footer: FC = () => {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const handleBackToTop = () => {
    if (typeof window === 'undefined') {
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-[#1e1817] text-white">
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:grid-cols-10">
          <FooterColumn title="Automotive Locksmith Supplies" spanClasses="lg:col-span-2">
            <ul className="space-y-2 text-sm text-white/80">
              {supplyLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="transition hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </FooterColumn>

          <FooterColumn title="Corporate" spanClasses="lg:col-span-2">
            <ul className="space-y-2 text-sm text-white/80">
              {corporateLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="transition hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </FooterColumn>

          <FooterColumn title="Legal Documents" spanClasses="lg:col-span-2">
            <ul className="space-y-2 text-sm text-white/80">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="transition hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </FooterColumn>

          <div className="lg:col-span-2">
            <h3 className="mb-3 text-lg font-semibold">Contact Us</h3>
            <address className="not-italic space-y-3 text-sm text-white/80">
              <div>
                <p className="flex items-start gap-2">
                  <PhoneIcon className="h-4 w-4 text-[#ff6f61]" />
                  <span className="flex flex-col">
                    {contactPhones.map((phone) => (
                      <a key={phone} href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="hover:text-white">
                        {phone}
                      </a>
                    ))}
                  </span>
                </p>
              </div>
              <div>
                <p className="flex items-start gap-2">
                  <MailIcon className="h-4 w-4 text-[#ff6f61]" />
                  <span className="flex flex-col">
                    {contactEmails.map((email) => (
                      <a key={email} href={`mailto:${email}`} className="hover:text-white">
                        {email}
                      </a>
                    ))}
                  </span>
                </p>
              </div>
              <div className="flex items-start gap-2">
                <MapPinIcon className="mt-0.5 h-4 w-4 text-[#ff6f61]" />
                <span>
                  1508 W Vine St
                  <br />
                  Kissimmee, FL 34741
                </span>
              </div>
            </address>
            <div className="mt-4 flex gap-4">
              {socialLinks.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="transition-transform hover:scale-110 hover:text-white"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-2">
            <div className="relative h-48 w-full overflow-hidden rounded-xl border border-white/15 bg-black/10 sm:h-56 lg:h-64">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d14051.322168483486!2d-81.418344!3d28.303457!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x88dd851677b224a3%3A0x1d2529c0a54763e4!2sULK%20Supply%20LLC!5e0!3m2!1sen!2sus!4v1748259865220!5m2!1sen!2sus&disableDefaultUI=true&gestureHandling=cooperative&zoomControl=false&mapTypeControl=false&streetViewControl=false&fullscreenControl=false"
                title="ULK Supply Location"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full w-full opacity-90"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-6 border-t border-white/20 pt-6 text-center text-sm text-white/70">
          <div className="flex justify-center">
            <img
              src="https://i.postimg.cc/136fcG0Z/qt-q-95.png"
              alt="ULK Supply logo"
              className="h-16 w-auto object-contain"
              loading="lazy"
            />
          </div>
          <p>© {currentYear} ULK Supply. All Rights Reserved.</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleBackToTop}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-red-700 text-white shadow-lg transition hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-transparent"
        aria-label="Back to top"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
    </footer>
  );
};

type FooterColumnProps = { title: string; spanClasses?: string; children: ReactNode };

const FooterColumn = ({ title, spanClasses, children }: FooterColumnProps) => (
  <div className={spanClasses}>
    <h3 className="mb-3 text-lg font-semibold">{title}</h3>
    {children}
  </div>
);

export default Footer;
