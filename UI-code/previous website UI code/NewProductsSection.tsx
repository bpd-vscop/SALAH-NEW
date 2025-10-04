// filepath: automotive-salah/packages/ui/components/products/NewProductsSection.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Button, Card, CardContent } from "@automotive/ui";
import { ShoppingCart } from "lucide-react"; // Assuming you use lucide-react for icons
import { api } from "../../lib/api";

// Define your specific products based on the images
const products = [
  {
    id: 1,
    name: "Xhorse Dolphin II XP-005L XP005L Automatic Portable Key Cutting Machine with Adjustable Screen and Built-in Battery",
    price: 1950.0,
    originalPrice: 2300.0,
    imageUrl:
      "https://img1.wsimg.com/isteam/ip/4000732a-f94c-4a6b-af0e-3bed8608d9b9/21112216375724704443.jpg",
    slug: "xhorse-dolphin-ii-xp005l",
  },
  {
    id: 2,
    name: "2008-2012 Audi / 4-Button Smart Key / PN: 8T0959754A / IYZFBSB802 / 315 MHz (AFTERMARKET)",
    price: 19.0,
    originalPrice: 23.0,
    imageUrl:
      "https://img1.wsimg.com/isteam/ip/4000732a-f94c-4a6b-af0e-3bed8608d9b9/ols/fa304e6b-1630-443e-8872-79b5ac49e332_1.48f8ee.jpeg",
    slug: "audi-4button-smart-key-aftermarket",
  },
  {
    id: 3,
    name: "Xhorse - Key Reader and Blade Skimmer - Works with Xhorse App",
    price: 380.0,
    originalPrice: 420.0,
    imageUrl:
      "https://img1.wsimg.com/isteam/ip/4000732a-f94c-4a6b-af0e-3bed8608d9b9/21111116366862718152.jpg",
    slug: "xhorse-key-reader-blade-skimmer",
  },
  {
    id: 4,
    name: "Xhorse VVDI Mini Key Tool Remote Key Programmer Support IOS and Android Global Version",
    price: 140.0,
    originalPrice: 160.0,
    imageUrl:
      "https://img1.wsimg.com/isteam/ip/4000732a-f94c-4a6b-af0e-3bed8608d9b9/ols/19090615678293919230.jpg",
    slug: "xhorse-vvdi-mini-key-tool",
  },
  {
    id: 5,
    name: "Magic - FLX8.31 - Flexible Tool Case for FLEX kit",
    price: 160.0,
    originalPrice: 190.0,
    imageUrl:
      "https://img1.wsimg.com/isteam/ip/4000732a-f94c-4a6b-af0e-3bed8608d9b9/ols/FLX8.31-P_1111.jpg",
    slug: "magic-flx831-flexible-tool-case",
  },
  {
    id: 6,
    name: "Magic - FLK12 - MAGBench Mini - Jig Tool",
    price: 340.0,
    originalPrice: 390.0,
    imageUrl:
      "https://img1.wsimg.com/isteam/ip/4000732a-f94c-4a6b-af0e-3bed8608d9b9/ols/MagBench-mini-jig-tool-2_1.jpg",
    slug: "magic-flk12-magbench-mini-jig",
  },
  {
    id: 7,
    name: "Magic - DNR1.1 DynoRoad Car Test",
    price: 1170.0,
    originalPrice: 1350.0,
    imageUrl:
      "https://img1.wsimg.com/isteam/ip/4000732a-f94c-4a6b-af0e-3bed8608d9b9/ols/DNR1.1-1_3.jpg",
    slug: "magic-dnr11-dynoroad-car-test",
  },
  {
    id: 8,
    name: "V1.5.9 Xhorse Dolphin XP-005 XP005 Key Cutting Machine Multi-Language Cut Sided/Track/Dimple/Tibbe Keys",
    price: 1750.0,
    originalPrice: 1950.0,
    imageUrl:
      "https://img1.wsimg.com/isteam/ip/4000732a-f94c-4a6b-af0e-3bed8608d9b9/ols/21081816292791738891.jpg",
    slug: "xhorse-dolphin-xp005-v159",
  },
  {
    id: 9,
    name: "Xhorse VVDI BIMTool Pro Enhanced Edition Update Version of VVDI BMW",
    price: 1199.0,
    originalPrice: 1250.0,
    imageUrl:
      "https://img1.wsimg.com/isteam/ip/4000732a-f94c-4a6b-af0e-3bed8608d9b9/ols/20092916013684898094.jpg",
    slug: "xhorse-vvdi-bimtool-pro",
  },
  {
    id: 10,
    name: "Xhorse XSKF20EN Smart Remote Key Knife Style 4 Buttons English Version",
    price: 24.99,
    originalPrice: 26.0,
    imageUrl:
      "https://img1.wsimg.com/isteam/ip/4000732a-f94c-4a6b-af0e-3bed8608d9b9/ols/21012116112179383660.jpg/:/rs=w:500,h:500",
    slug: "xhorse-xskf20en-smart-remote",
  },
];

export function NewProductsSection() {
  const { data: newProducts = [], isLoading, error } = api.products.getNew.useQuery({
    limit: 8
  });

  // Convert database products to component format
  const productsToDisplay = newProducts.length > 0 ? newProducts.map(product => ({
    id: product.id,
    name: product.name,
    price: product.salePrice || product.regularPrice,
    originalPrice: product.regularPrice,
    imageUrl: product.thumbnailImage,
    slug: product.slug,
  })) : products;

  // Function to handle adding to cart (you'll need to implement the actual logic)
  const handleAddToCart = (
    productId: string | number,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault(); // Prevent link navigation when clicking the cart icon
    e.stopPropagation(); // Stop event bubbling
    console.log(`Adding product ${productId} to cart`);
    // Add your actual add to cart logic here (e.g., update state, call API)
  };

  // Show loading state
  if (isLoading) {
    return (
      <section className="w-[88%] mx-auto py-8 md:py-12">
        <h2 className="mb-6 text-2xl font-bold tracking-tight text-gray-800">New Products</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="bg-gray-200 animate-pulse aspect-[3/4] rounded-lg"></div>
          ))}
        </div>
      </section>
    );
  }

  // Show error state
  if (error) {
    console.error('Failed to load new products:', error);
    return (
      <section className="w-[88%] mx-auto py-8 md:py-12">
        <h2 className="mb-6 text-2xl font-bold tracking-tight text-gray-800">New Products</h2>
        <div className="text-center py-8">
          <p className="text-gray-500">Failed to load new products</p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-[88%] mx-auto py-8 md:py-12">
      <h2 className="mb-6 text-2xl font-bold tracking-tight">New Products</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {productsToDisplay.map((product) => (
          <Card
            key={product.id}
            className="group relative overflow-hidden rounded-lg transition-all hover:shadow-lg hover:scale-[1.02]"
          >
            <Link href={`/products/${product.slug}`} className="block">
              <div className="aspect-square relative">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  priority={typeof product.id === 'number' ? product.id <= 5 : false}
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-2 right-2 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-700 hover:text-white"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                    handleAddToCart(product.id, e)
                  }
                  aria-label={`Add ${product.name} to cart`}
                >
                  <ShoppingCart className="h-4 w-4" />
                </Button>
              </div>
              <CardContent className="p-3">
                <h3 className="font-medium line-clamp-2 text-sm h-10">
                  {product.name}
                </h3>
                {/* Price Display: Stacked on mobile, Row on sm+ */}
                <div className="mt-2 flex flex-col items-end gap-1 sm:flex-row sm:items-baseline sm:justify-end sm:gap-2">
                  {/* ^^ Base: flex-col, items-end, gap-1 */}
                  {/* ^^ sm+: flex-row, items-baseline, justify-end, gap-2 */}
                  {product.originalPrice && (
                    <span className="text-sm text-gray-500 line-through">
                      {" "}
                      {/* Stays same size */}${product.originalPrice.toFixed(2)}
                    </span>
                  )}
                  <span className="font-bold text-lg text-red-700">
                    {" "}
                    {/* Stays same size */}${product.price.toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <Button
          asChild
          className="bg-red-700 hover:bg-red-600 px-6 py-3 text-base"
        >
          <Link href="/new-products">View All New Products</Link>
        </Button>
      </div>
    </section>
  );
}


