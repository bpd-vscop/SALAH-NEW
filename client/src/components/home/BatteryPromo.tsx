const uniqueBrands = [
  {
    src: "https://auto-sens.com/wp-content/uploads/2023/04/Murata-768x266.webp",
    alt: "Murata",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Sony_logo.svg/1024px-Sony_logo.svg.png",
    alt: "Sony",
  },
  {
    src: "https://static.vecteezy.com/system/resources/previews/012/871/380/non_2x/panasonic-brand-icon-illustration-top-tech-company-logotype-free-png.png",
    alt: "Panasonic",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Logo_of_the_Eastman_Kodak_Company_%282006%E2%80%932016%29.svg/2560px-Logo_of_the_Eastman_Kodak_Company_%282006%E2%80%932016%29.svg.png",
    alt: "Kodak",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Maxell_logo.svg/2560px-Maxell_logo.svg.png",
    alt: "Maxell",
  },
  {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Duracell_logo.svg/1200px-Duracell_logo.svg.png",
    alt: "Duracell",
  },
];

// Create the list for the marquee (duplicate the unique list for smooth looping)
const marqueeBrands = [...uniqueBrands, ...uniqueBrands];

export function BatteryPromo() {
  return (
    <section className="py-8 md:py-12 bg-gradient-to-r from-[#f6b210] to-[#a00b0b] text-white overflow-x-hidden">
      <div className="container mx-auto px-4">
        {/* Main flex container: column on mobile, row on desktop */}
        <div className="flex flex-col md:flex-row items-center">
          {/* --- Text Section --- */}
          <div className="w-full md:w-1/2 order-2 md:order-1 text-center md:text-left md:pr-6 lg:pr-8 mb-6 md:mb-0">
            <h2 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-bold mb-4">
              High-Quality Batteries from Trusted Brands!
            </h2>
            <p className="text-base sm:text-lg mb-6">
              Shop CR2032, CR2016, CR2025, CR1616, CR1632, and more at great
              prices!
            </p>
            <button className="bg-red-700 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              Shop Batteries
            </button>
          </div>

          {/* --- Image Section --- */}
          <div className="w-full md:w-1/2 order-1 md:order-2 mb-6 md:mb-0">
            {/* Container for the image: Apply rounding and overflow-hidden HERE */}
            <div className="relative h-[200px] md:h-[300px] w-full rounded-lg overflow-hidden">
              <img
                src="https://i.postimg.cc/zGsS9xct/Screenshot-2025-04-22-164851.png"
                alt="Battery Collection"
                loading="lazy"
                className="object-contain w-full h-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- Logo Marquee Section --- */}
      <div className="mt-10 md:mt-12 w-full inline-flex flex-nowrap overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_10%,_black_90%,transparent_100%)]">
        <ul className="flex items-center justify-center [&_li]:mx-4 md:[&_li]:mx-6 lg:[&_li]:mx-8 animate-infinite-scroll">
          {marqueeBrands.map((brand, index) => (
            <li key={`marquee1-${index}-${brand.alt}`}>
              <img
                src={brand.src}
                alt={brand.alt}
                width={80}
                height={30}
                loading="lazy"
                className="object-contain max-h-[30px] md:max-h-[35px] lg:max-h-[40px] max-w-[80px] md:max-w-[90px] lg:max-w-[100px]"
              />
            </li>
          ))}
        </ul>

        <ul
          className="flex items-center justify-center [&_li]:mx-4 md:[&_li]:mx-6 lg:[&_li]:mx-8 animate-infinite-scroll"
          aria-hidden="true"
        >
          {marqueeBrands.map((brand, index) => (
            <li key={`marquee2-${index}-${brand.alt}`}>
              <img
                src={brand.src}
                alt={brand.alt}
                width={80}
                height={30}
                loading="lazy"
                className="object-contain max-h-[30px] md:max-h-[35px] lg:max-h-[40px] max-w-[80px] md:max-w-[90px] lg:max-w-[100px]"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
