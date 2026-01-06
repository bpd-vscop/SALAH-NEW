import { Link } from 'react-router-dom';
import { CheckCircle, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { SiteLayout } from '../components/layout/SiteLayout';

const reasons = [
  {
    title: 'Authorized Distributor of Leading Brands',
    text:
      'We are an official distributor for top brands, including Autel, Xhorse, ILCO, JMA, Original Lishi, AccessTools USA, OBDSTAR, Lonsdor, CGDI, ACDP, Triton, AutoProPAD, and more, ensuring that our customers receive only genuine, high-quality products.',
  },
  {
    title: 'Exclusive ULK Supply Essentials',
    text:
      'We offer our own in-house selection with over 1,500 aftermarket items, including key fobs, remote shells, key shells, blanks, and more, providing locksmiths with a reliable and cost-effective solution.',
  },
  {
    title: 'Trusted by Customers Nationwide',
    text:
      'Our customers consistently rate us highly after receiving their orders, with verified reviews across major platforms.',
  },
  {
    title: 'Top Quality Store on Google',
    text:
      'We are recognized for outstanding customer experiences and dependable service.',
  },
  {
    title: 'Competitive Pricing and Promotions',
    text:
      'We offer industry-leading deals and special discounts to help locksmiths access premium products at affordable prices.',
  },
  {
    title: 'Expert Support and Guidance',
    text:
      'Our team consists of industry professionals who provide expert recommendations and technical assistance to ensure you get the right tools for your business.',
  },
  {
    title: 'Fast and Reliable Shipping',
    text:
      'With efficient order processing and shipping, we ensure that locksmiths receive their tools and keys quickly, minimizing downtime.',
  },
  {
    title: 'Flexible Payment Options',
    text:
      'We support various payment methods, including credit card, PayPal, Google Pay, and financing options, making transactions seamless for our customers.',
  },
];

const specialties = [
  {
    title: 'Car Keys and Remotes',
    items: [
      {
        label: 'OEM Keys and Remotes',
        text:
          'We maintain a large inventory of nearly 1,000 OEM keys in stock at all times, covering a wide range of vehicle makes and models from leading manufacturers and dealers, including Toyota, Lexus, Hyundai, Genesis, KIA, Nissan, Infiniti, Honda, Acura, GMC, Buick, Chevrolet, Cadillac, Chrysler, Dodge, RAM, Jeep, Mazda, and Mitsubishi.',
      },
      {
        label: 'Aftermarket Keys and Remotes',
        text:
          'We provide high-quality aftermarket solutions from our in-house essentials line along with trusted manufacturers like ILCO and Strattec, ensuring locksmiths have access to reliable, cost-effective alternatives.',
      },
    ],
  },
  {
    title: 'Universal Smart Keys',
    items: [
      {
        label: 'Universal Smart Keys',
        text:
          'As a top seller of universal keys, we carry premium options from Xhorse, Autel, and KEYDIY, offering versatile solutions that work across multiple vehicle brands and models.',
      },
    ],
  },
  {
    title: 'Key Programming Tools',
    items: [
      {
        label: 'Key Programming Tools',
        text:
          'We stock advanced key programming solutions from Autel, Xtool (AutoProPAD), OBDSTAR, Lonsdor, and Advanced Diagnostics (Smart Pro) to help locksmiths perform programming with accuracy and efficiency.',
      },
    ],
  },
  {
    title: 'Key Cutting Machines',
    items: [
      {
        label: 'Key Cutting Machines',
        text:
          'We supply high-precision key-cutting machines from Xhorse, ILCO, JMA, KEYLINE, Triton, and Black Widow, meeting the needs of locksmiths handling high-security and traditional mechanical keys.',
      },
    ],
  },
  {
    title: 'Opening Tools and Lockout Kits',
    items: [
      {
        label: 'Opening Tools and Lockout Kits',
        text:
          'Our inventory includes a wide range of car unlocking tools, lockout kits, long-reach tools, air wedges, and other accessories from industry leaders like AccessTools USA, Magnus, and Lock Monkey.',
      },
    ],
  },
  {
    title: 'Lishi and Lock Picking Tools',
    items: [
      {
        label: 'Lishi and Lock Picking Tools',
        text:
          'We provide professional Lishi tools, lock picks, and decoders from Original Lishi, AccuReader, Lock Monkey, Magnus, GOSO, and more.',
      },
    ],
  },
  {
    title: 'Ignition and Door Locks',
    items: [
      {
        label: 'Ignition and Door Locks',
        text:
          'We carry original and aftermarket ignition and door locks, primarily from Strattec, along with other well-known brands.',
      },
    ],
  },
  {
    title: 'Accessories and Locksmith Essentials',
    items: [
      {
        label: 'Accessories and Locksmith Essentials',
        text:
          'Our selection of essential locksmith accessories includes batteries, adapters, cables, and emulators, as well as key gloves, key accessories, and specialized locksmith tools.',
      },
    ],
  },
];

const customerHighlights = [
  'Exceptional customer service and expert support.',
  'Fast, reliable shipping with secure packaging.',
  'High-quality products that meet or exceed industry standards.',
  'Exclusive deals and promotions that help locksmiths save money.',
];

export const AboutPage: React.FC = () => {
  return (
    <SiteLayout>
      <section className="mx-auto mb-10 w-[88%] space-y-6 py-8">
        <div className="text-xs text-muted">
          <Link to="/" className="transition hover:text-primary">Home</Link>
          <span className="mx-2">/</span>
          <span className="font-semibold text-slate-900">About Us</span>
        </div>

        <div className="rounded-3xl border border-border bg-gradient-to-r from-[#f6b210] via-[#dc4f0c] to-[#a00b0b] p-10 text-white shadow-md">
          <h1 className="text-3xl font-semibold md:text-4xl">About Us</h1>
          <p className="mt-3 max-w-3xl text-sm text-white/85">
            We equip professional locksmiths with premium automotive keys, tools, and support to keep modern vehicles secure and customers satisfied.
          </p>
        </div>
      </section>

      <section className="mx-auto w-[88%] pb-16">
        <div className="space-y-10">
          <div className="rounded-3xl border border-border bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Who is ULK Supply?</h2>
            <p className="mt-4 text-sm text-slate-700">
              ULK Supply is a trusted distributor of automotive locksmith supplies, specializing in high-quality car keys,
              key programming devices, key-cutting machines, and locksmith tools. We serve professional locksmiths across
              the United States, providing them with cutting-edge products and expert support to meet the demands of modern vehicle security.
            </p>
            <p className="mt-4 text-sm text-slate-700">
              Since our founding, we have built a reputation for excellence by offering an extensive selection of OEM and
              aftermarket keys, universal smart keys, top-tier key programming tools, lockout solutions, and accessories to ensure locksmiths
              have everything they need for their trade.
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Why Choose ULK Supply?</h2>
            <ul className="mt-6 space-y-4">
              {reasons.map((reason) => (
                <li key={reason.title} className="flex gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{reason.title}</p>
                    <p className="mt-1 text-sm text-slate-700">{reason.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-border bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">What Does ULK Supply Specialize In?</h2>
            <p className="mt-4 text-sm text-slate-700">
              We offer a comprehensive range of automotive locksmith supplies, including:
            </p>

            <div className="mt-6 space-y-6">
              {specialties.map((specialty) => (
                <div key={specialty.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-red-600" />
                    <h3 className="text-lg font-semibold text-slate-900">{specialty.title}</h3>
                  </div>
                  <ul className="mt-3 space-y-3 text-sm text-slate-700">
                    {specialty.items.map((item) => (
                      <li key={item.label}>
                        <span className="font-semibold text-slate-900">{item.label} - </span>
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="mt-6 text-sm text-slate-700">
              At ULK Supply, we are committed to equipping professional locksmiths with the highest quality tools and supplies,
              ensuring they have everything they need to succeed in their business.
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">What Are Customers Saying About ULK Supply?</h2>
            <p className="mt-4 text-sm text-slate-700">Our customers love us for:</p>
            <ul className="mt-4 space-y-3">
              {customerHighlights.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-700">
                  <CheckCircle className="h-5 w-5 text-red-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-border bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Get Started with ULK Supply</h2>
            <p className="mt-4 text-sm text-slate-700">
              If you are a professional locksmith looking for top-quality automotive keys, programming tools, and accessories,
              ULK Supply is your one-stop shop. Visit www.ulk-supply.com to browse our inventory, take advantage of exclusive deals,
              and experience the best in locksmith supply.
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Customer Support and Contact Information</h2>
            <p className="mt-4 text-sm text-slate-700">
              At ULK Supply, we are committed to providing fast, reliable, and expert customer support. Our team works hard to
              answer all inquiries within a few hours. To ensure a quick and accurate response, please include all relevant details
              in your message.
            </p>

            <div className="mt-6 grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 text-red-600" />
                  <div>
                    <p className="font-semibold text-slate-900">Sales</p>
                    <a className="text-primary hover:underline" href="mailto:sales@ulk-supply.com">sales@ulk-supply.com</a>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 text-red-600" />
                  <div>
                    <p className="font-semibold text-slate-900">Support</p>
                    <a className="text-primary hover:underline" href="mailto:ulksupply@hotmail.com">ulksupply@hotmail.com</a>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 text-red-600" />
                  <div>
                    <p className="font-semibold text-slate-900">Contact Us</p>
                    <div className="flex flex-col gap-1">
                      <a className="text-primary hover:underline" href="tel:+14074496740">+1-407-449-6740</a>
                      <a className="text-primary hover:underline" href="tel:+14074527149">+1-407-452-7149</a>
                      <a className="text-primary hover:underline" href="tel:+14079786077">+1-407-978-6077</a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-red-600" />
                  <div>
                    <p className="font-semibold text-slate-900">Business Address</p>
                    <p>1508 W Vine St, Kissimmee, FL 34741</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MessageCircle className="mt-0.5 h-4 w-4 text-red-600" />
                  <div>
                    <p className="font-semibold text-slate-900">Live Chat</p>
                    <p>Use the chat widget on our site for real-time assistance.</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Customer Service Hours</p>
                  <p className="mt-2 text-sm text-slate-700">Monday to Friday: 9:00 AM - 5:00 PM</p>
                  <p className="mt-1 text-sm text-slate-700">Saturday: By appointment</p>
                  <p className="mt-1 text-sm text-slate-700">Sunday: Closed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
};
