import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';

const slides = [
  {
    id: 1,
    imageDesktop: 'https://www.key4.com/uploads/files/headers/3-2025/bmw-g-chasis-desk.jpg',
    imageMobile: 'https://www.key4.com/uploads/files/headers/6-2024/JMA-Nomad-Go-mob.jpg',
    alt: 'Experience the Fastest AutoProPAD, Ever.',
    href: '/products',
  },
  {
    id: 2,
    imageDesktop: 'https://www.key4.com/uploads/files/headers/3-2025/bmw-g-chasis-desk.jpg',
    imageMobile: 'https://www.key4.com/uploads/files/headers/6-2024/Lonsdor-LT20-Universal-Smart-Key-1-mob.jpg',
    alt: 'BMW G Chassis Programming',
    href: '/products',
  },
  {
    id: 3,
    imageDesktop: 'https://www.key4.com/uploads/files/headers/20-3-2025/new-xhorse-g2-wired-remotes_(1).jpg',
    imageMobile: 'https://www.key4.com/uploads/files/headers/6-2024/JMA-Nomad-Go-mob.jpg',
    alt: 'New Xhorse G2 Wired Remotes',
    href: '/products',
  },
];

export function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (isHovering || isAnimating) return;

    const interval = setInterval(() => changeSlide(1), 6000);

    return () => clearInterval(interval);
  }, [currentSlide, isHovering, isAnimating]);

  const changeSlide = (dir: number) => {
    if (isAnimating) return;

    setIsAnimating(true);
    setDirection(dir);

    setTimeout(() => {
      setCurrentSlide((prev) => (prev + dir + slides.length) % slides.length);
      setTimeout(() => setIsAnimating(false), 800);
    }, 400);
  };

  const nextSlide = () => changeSlide(1);
  const prevSlide = () => changeSlide(-1);

  const goToSlide = (index: number) => {
    if (isAnimating || index === currentSlide) return;

    const dir = index > currentSlide ? 1 : -1;
    setDirection(dir);
    setCurrentSlide(index);
  };

  const getAnimationClasses = () => {
    return cn(
      'object-contain transition-all duration-1000 w-full h-full',
      isAnimating
        ? direction > 0
          ? 'scale-110 blur-sm opacity-80'
          : 'scale-90 blur-sm opacity-80'
        : 'scale-100 blur-0 opacity-100'
    );
  };

  return (
    <div
      className="relative cursor-pointer mx-2 lg:mx-8 mt-10 mb-6"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="rounded-2xl relative overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.3)] isolate sm:rounded-2xl">
        {/* Slider Track */}
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
        {slides.map((slide, index) => (
          <a
            key={slide.id}
            href={slide.href || '#'}
            aria-label={`Learn more about ${slide.alt}`}
            className="relative min-w-full flex-shrink-0 block group"
          >
            {/* Image Container with Aspect Ratio */}
            <div className="relative w-full h-[40vh] sm:h-auto sm:aspect-[16/9] md:aspect-[3/1]">
              {/* Mobile Image */}
              <img
                src={slide.imageMobile || slide.imageDesktop}
                alt={slide.alt}
                className={cn(getAnimationClasses(), 'block md:hidden', 'sm:rounded-2xl')}
                loading={index === 0 ? 'eager' : 'lazy'}
              />

              {/* Desktop Image */}
              <img
                src={slide.imageDesktop || slide.imageMobile}
                alt={slide.alt}
                className={cn(getAnimationClasses(), 'hidden md:block', 'sm:rounded-2xl')}
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            </div>

            {/* Faded Glass Bottom Overlay */}
            <div
              className={cn(
                'absolute bottom-0 left-0 right-0 h-1/4',
                'bg-gradient-to-t from-black/20 via-black/5 to-transparent',
                'backdrop-blur-md',
                'transition-colors duration-300 group-hover:bg-black/10',
                'sm:rounded-b-2xl'
              )}
              aria-hidden="true"
              style={{
                maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 25%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 25%, transparent 100%)',
              }}
            />
          </a>
        ))}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            prevSlide();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition-colors z-20"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            nextSlide();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition-colors z-20"
          aria-label="Next slide"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>

        {/* Indicators */}
        <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-20">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                goToSlide(index);
              }}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300 ease-in-out',
                currentSlide === index
                  ? 'bg-white w-6'
                  : 'bg-white/60 hover:bg-white/90 w-3'
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
