/**
 * Vendo — Comprehensive Mock Data & State Store
 * Adheres to Vendo System Architecture & UI/UX v2.0
 */

window.VendoDefaultData = {
  products: [
    {
      id: "p1",
      name: "Linen Resort Shirt",
      vendor: "Atelier North",
      vendorId: "v1",
      price: 48,
      originalPrice: 65,
      rating: 4.8,
      reviewsCount: 124,
      cat: "Apparel",
      categorySlug: "apparel",
      tags: ["summer", "linen", "eco-friendly"],
      stock: 34,
      inStock: true,
      img: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80&auto=format",
      gallery: [
        "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80&auto=format",
        "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80&auto=format",
        "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80&auto=format"
      ],
      description: "Crafted from 100% European flax linen, this relaxed-fit resort shirt offers exceptional breathability and effortless elegance for warm climates.",
      specs: {
        Material: "100% Pure European Flax Linen",
        Fit: "Relaxed resort collar",
        Care: "Machine wash cold, line dry in shade",
        Origin: "Sustainably woven in Porto"
      },
      options: {
        sizes: ["S", "M", "L", "XL"],
        colors: ["Sand White", "Sage Green", "Dusk Teal"]
      }
    },
    {
      id: "p2",
      name: "Ceramic Pour-Over & Carafe",
      vendor: "Kiln & Co",
      vendorId: "v2",
      price: 32,
      originalPrice: 42,
      rating: 4.9,
      reviewsCount: 289,
      cat: "Home & Living",
      categorySlug: "home",
      tags: ["handmade", "coffee", "ceramic"],
      stock: 18,
      inStock: true,
      img: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80&auto=format",
      gallery: [
        "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80&auto=format",
        "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80&auto=format",
        "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&q=80&auto=format"
      ],
      description: "Wheel-thrown speckled stoneware dripper with a matched 600ml glass carafe. Internal fluting is engineered for optimal flow rate and balanced extraction.",
      specs: {
        Material: "High-fire stoneware ceramic & borosilicate glass",
        Capacity: "600ml (2-4 cups)",
        Glaze: "Matte stone food-grade non-toxic",
        Origin: "Crafted in Kyoto"
      },
      options: {
        colors: ["Speckled Oat", "Obsidian Gray", "Earthy Terracotta"]
      }
    },
    {
      id: "p3",
      name: "Studio Leather Tote",
      vendor: "Harbor Goods",
      vendorId: "v3",
      price: 128,
      originalPrice: 160,
      rating: 4.9,
      reviewsCount: 88,
      cat: "Bags & Accessories",
      categorySlug: "bags",
      tags: ["leather", "handcrafted", "minimal"],
      stock: 9,
      inStock: true,
      img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80&auto=format",
      gallery: [
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80&auto=format",
        "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80&auto=format"
      ],
      description: "Full-grain vegetable-tanned leather tote with reinforced brass rivets, dedicated laptop sleeve (fits 15\"), and seamless water-resistant lining.",
      specs: {
        Material: "Full-Grain Italian Vacchetta Leather",
        Dimensions: "38cm × 32cm × 14cm",
        Hardware: "Solid antique brass",
        Warranty: "Lifetime craftsmanship guarantee"
      },
      options: {
        colors: ["Cognac Tan", "Midnight Black", "Olive Waxed"]
      }
    },
    {
      id: "p4",
      name: "Botanical Illuminating Serum",
      vendor: "Verdant Lab",
      vendorId: "v4",
      price: 54,
      originalPrice: 68,
      rating: 4.7,
      reviewsCount: 312,
      cat: "Beauty & Wellness",
      categorySlug: "beauty",
      tags: ["vegan", "skincare", "clean"],
      stock: 45,
      inStock: true,
      img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80&auto=format",
      gallery: [
        "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80&auto=format",
        "https://images.unsplash.com/photo-1608248597359-2e616335198b?w=800&q=80&auto=format"
      ],
      description: "Potent cold-pressed facial oil infused with Rosehip, Bakuchiol, and Squalane to restore skin barrier lipid balance with luminous morning radiance.",
      specs: {
        Volume: "30ml / 1.0 fl oz",
        SkinType: "All skin types including sensitive",
        Certification: "Leaping Bunny Cruelty-Free & Cosmos Organic"
      }
    },
    {
      id: "p5",
      name: "Walnut Sculpted Desk Lamp",
      vendor: "Atelier North",
      vendorId: "v1",
      price: 89,
      originalPrice: 110,
      rating: 4.6,
      reviewsCount: 64,
      cat: "Home & Living",
      categorySlug: "home",
      tags: ["lighting", "woodcraft", "minimal"],
      stock: 14,
      inStock: true,
      img: "https://images.unsplash.com/photo-1507473885882-197c0e2a3186?w=800&q=80&auto=format",
      gallery: [
        "https://images.unsplash.com/photo-1507473885882-197c0e2a3186?w=800&q=80&auto=format"
      ],
      description: "Hand-turned American black walnut base with warm 2700K integrated LED and tactile brass dimmer touch switch.",
      specs: {
        Material: "Solid American Walnut & Anodized Brass",
        Bulb: "Warm 2700K 600 lumen dimmable LED",
        Cable: "2m braided textile cord"
      }
    },
    {
      id: "p6",
      name: "Trail Knit Performance Sneaker",
      vendor: "Harbor Goods",
      vendorId: "v3",
      price: 96,
      originalPrice: 120,
      rating: 4.5,
      reviewsCount: 156,
      cat: "Apparel",
      categorySlug: "apparel",
      tags: ["footwear", "recycled", "outdoors"],
      stock: 22,
      inStock: true,
      img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80&auto=format",
      gallery: [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80&auto=format"
      ],
      description: "Breathable knit upper made from recycled marine plastics paired with a high-traction Vibram lug sole for city sidewalks and wilderness paths.",
      specs: {
        Upper: "100% Recycled PET Seamless Knit",
        Sole: "Vibram Megagrip compound",
        Drop: "6mm neutral trail platform"
      },
      options: {
        sizes: ["40", "41", "42", "43", "44", "45"]
      }
    },
    {
      id: "p7",
      name: "Pre-Seasoned Cast Iron Skillet",
      vendor: "Kiln & Co",
      vendorId: "v2",
      price: 72,
      originalPrice: 85,
      rating: 4.9,
      reviewsCount: 410,
      cat: "Home & Living",
      categorySlug: "home",
      tags: ["kitchen", "castiron", "cooking"],
      stock: 25,
      inStock: true,
      img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&auto=format",
      gallery: [
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80&auto=format"
      ],
      description: "Triple organic flaxseed oil pre-seasoned 10.5-inch skillet. Smooth machine-milled cooking surface offers natural non-stick performance from day one.",
      specs: {
        Diameter: "10.5 inches (26.7 cm)",
        Weight: "2.3 kg",
        Compatibility: "Induction, gas, campfire, oven safe to 500°F"
      }
    },
    {
      id: "p8",
      name: "Mulberry Silk Hair Wrap & Scrunchie",
      vendor: "Verdant Lab",
      vendorId: "v4",
      price: 24,
      originalPrice: 30,
      rating: 4.4,
      reviewsCount: 92,
      cat: "Beauty & Wellness",
      categorySlug: "beauty",
      tags: ["silk", "haircare", "luxury"],
      stock: 38,
      inStock: true,
      img: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80&auto=format",
      gallery: [
        "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80&auto=format"
      ],
      description: "22 Momme grade 6A pure mulberry silk designed to eliminate hair friction, frizz, and morning bedhead.",
      specs: {
        Grade: "100% Pure Mulberry Silk 22 Momme",
        Certification: "OEKO-TEX Standard 100"
      }
    }
  ],

  vendors: [
    {
      id: "v1",
      name: "Atelier North",
      handle: "@atelier.north",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&q=80&auto=format",
      banner: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1280&q=80&auto=format",
      category: "Apparel & Minimalist Living",
      kyc: "approved",
      kycStatus: "approved",
      joined: "2026-01-12",
      rating: 4.9,
      salesCount: 1420,
      followersCount: "14.2k",
      isLive: false,
      bio: "Nordic-inspired resort wear, structured linen cuts, and timeless organic lifestyle goods crafted for calm living.",
      location: "Stockholm / Lisbon",
      documents: [
        { name: "Trade_License_Atelier_2026.pdf", type: "Trade License", status: "Verified", date: "2026-01-10" },
        { name: "Tax_Registration_TIN.pdf", type: "Tax ID", status: "Verified", date: "2026-01-10" }
      ]
    },
    {
      id: "v2",
      name: "Kiln & Co",
      handle: "@kiln.co",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&q=80&auto=format",
      banner: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1280&q=80&auto=format",
      category: "Artisanal Tableware & Coffee",
      kyc: "pending",
      kycStatus: "pending",
      joined: "2026-09-02",
      rating: 4.8,
      salesCount: 890,
      followersCount: "9.8k",
      isLive: true,
      bio: "Small-batch wheel-thrown pottery, pour-over drippers, and cast-iron kitchen essentials handmade with local clays.",
      location: "Kyoto / Portland",
      documents: [
        { name: "Business_Registration_KilnCo.pdf", type: "Trade License", status: "Under Review", date: "2026-09-02" },
        { name: "National_ID_Founder.jpg", type: "ID Proof", status: "Under Review", date: "2026-09-02" }
      ]
    },
    {
      id: "v3",
      name: "Harbor Goods",
      handle: "@harborgoods",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&q=80&auto=format",
      banner: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1280&q=80&auto=format",
      category: "Heritage Leather & Bags",
      kyc: "approved",
      kycStatus: "approved",
      joined: "2025-11-20",
      rating: 4.9,
      salesCount: 3200,
      followersCount: "28.5k",
      isLive: false,
      bio: "Durable full-grain leather bags, trail runners, and everyday carry gear built to last a lifetime.",
      location: "Seattle, WA",
      documents: [
        { name: "HarborGoods_LLC_License.pdf", type: "Trade License", status: "Verified", date: "2025-11-18" }
      ]
    },
    {
      id: "v4",
      name: "Verdant Lab",
      handle: "@verdantlab",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&q=80&auto=format",
      banner: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1280&q=80&auto=format",
      category: "Clean Beauty & Botanical Care",
      kyc: "suspended",
      kycStatus: "suspended",
      joined: "2025-08-04",
      rating: 4.3,
      salesCount: 640,
      followersCount: "4.1k",
      isLive: false,
      bio: "Certified vegan, cold-pressed face elixirs and 22 Momme mulberry silk essentials for mindful self-care rituals.",
      location: "San Francisco, CA",
      documents: [
        { name: "Verdant_Lab_Disputed_Cert.pdf", type: "Organic Certification", status: "Suspended / Flagged", date: "2025-08-01" }
      ]
    }
  ],

  reels: [
    {
      id: "r1",
      vendor: "Kiln & Co",
      vendorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80&auto=format",
      title: "Hand-turning the morning pour-over carafe batch #pottery #ceramics",
      likes: 2480,
      commentsCount: 96,
      sharesCount: 312,
      isLiked: false,
      isSaved: false,
      bgImg: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=960&q=80&auto=format",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-potter-shaping-clay-on-a-wheel-42286-large.mp4",
      product: {
        id: "p2",
        name: "Ceramic Pour-Over & Carafe",
        price: 32,
        img: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=160&q=80&auto=format"
      },
      comments: [
        { user: "Maya R.", avatar: "MR", text: "Is the glaze food-grade and dishwasher safe?" },
        { user: "Kiln & Co", avatar: "KC", text: "Yes! High-fire dinnerware grade glaze.", isVendor: true },
        { user: "Arif H.", avatar: "AH", text: "Ordered two, loving the matte stone finish!" }
      ]
    },
    {
      id: "r2",
      vendor: "Atelier North",
      vendorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80&auto=format",
      title: "How we weave 100% pure European flax linen. Soft, breathable, timeless.",
      likes: 3820,
      commentsCount: 142,
      sharesCount: 520,
      isLiked: true,
      isSaved: true,
      bgImg: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=960&q=80&auto=format",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-close-up-of-a-tailor-working-with-cloth-42777-large.mp4",
      product: {
        id: "p1",
        name: "Linen Resort Shirt",
        price: 48,
        img: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=160&q=80&auto=format"
      },
      comments: [
        { user: "Kenji Sato", avatar: "KS", text: "What size would fit 6ft 180lbs?" },
        { user: "Atelier North", avatar: "AN", text: "Size L is perfect for a breezy relaxed silhouette.", isVendor: true }
      ]
    },
    {
      id: "r3",
      vendor: "Harbor Goods",
      vendorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80&auto=format",
      title: "Hand-burnishing full-grain Italian leather edges. Built for 20+ years of use.",
      likes: 5120,
      commentsCount: 204,
      sharesCount: 890,
      isLiked: false,
      isSaved: false,
      bgImg: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=960&q=80&auto=format",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-artisan-cutting-leather-in-workshop-41710-large.mp4",
      product: {
        id: "p3",
        name: "Studio Leather Tote",
        price: 128,
        img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=160&q=80&auto=format"
      },
      comments: [
        { user: "Elena P.", avatar: "EP", text: "Does a 16 inch MacBook Pro fit in this?" },
        { user: "Harbor Goods", avatar: "HG", text: "Yes! Dedicated padded laptop bay fits up to 16\".", isVendor: true }
      ]
    },
    {
      id: "r4",
      vendor: "Verdant Lab",
      vendorAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&q=80&auto=format",
      title: "Morning cold-pressed botanical serum routine for glass skin glow",
      likes: 1940,
      commentsCount: 68,
      sharesCount: 180,
      isLiked: false,
      isSaved: false,
      bgImg: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=960&q=80&auto=format",
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-skincare-product-dropper-in-slow-motion-42571-large.mp4",
      product: {
        id: "p4",
        name: "Botanical Illuminating Serum",
        price: 54,
        img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=160&q=80&auto=format"
      },
      comments: [
        { user: "Tanya B.", avatar: "TB", text: "Obsessed with the rosehip and squalane blend!" }
      ]
    }
  ],

  liveRooms: [
    {
      id: "live-kiln",
      vendor: "Kiln & Co",
      vendorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80&auto=format",
      title: "Pour-over hour: Live ceramics throwing & brewing demo",
      viewersCount: "1,248",
      streamBg: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=960&q=80&auto=format",
      pinnedProduct: {
        id: "p2",
        name: "Ceramic Pour-Over & Carafe",
        price: 32,
        originalPrice: 42,
        stock: 18,
        img: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=160&q=80&auto=format"
      },
      chat: [
        { user: "Maya R.", msg: "Is the glaze food-safe?", time: "1m ago" },
        { user: "Kiln & Co (Host)", msg: "Yes! 100% non-toxic dinnerware grade.", isHost: true, time: "45s ago" },
        { user: "Kenji T.", msg: "Can I add to cart directly from this stream?", time: "30s ago" },
        { user: "Amina R.", msg: "Pouring now, looks amazing!", time: "18s ago" },
        { user: "Sofia M.", msg: "Just bought the Speckled Oat version!", time: "just now" }
      ]
    }
  ],

  categories: [
    { id: "c1", name: "Apparel & Fashion", slug: "apparel", icon: "shirt", count: 42 },
    { id: "c2", name: "Home & Ceramics", slug: "home", icon: "coffee", count: 28 },
    { id: "c3", name: "Leather & Bags", slug: "bags", icon: "briefcase", count: 19 },
    { id: "c4", name: "Clean Beauty", slug: "beauty", icon: "sparkles", count: 35 },
    { id: "c5", name: "Footwear", slug: "footwear", icon: "footprints", count: 14 }
  ],

  orders: [
    {
      id: "VD-10421",
      customer: "Amina Rahman",
      email: "amina.r@example.com",
      phone: "+880 1712 345678",
      address: "House 42, Road 11, Banani, Dhaka",
      items: [
        { id: "p1", name: "Linen Resort Shirt", price: 48, qty: 1, img: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=160&q=80&auto=format" },
        { id: "p3", name: "Studio Leather Tote", price: 128, qty: 1, img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=160&q=80&auto=format" }
      ],
      subtotal: 176,
      tax: 13.20,
      shipping: 0,
      total: 189.20,
      status: "paid",
      source: "live",
      date: "2026-09-27 19:42",
      trackingNumber: "TRK-982142",
      carrier: "Pathao Express / DHL",
      timeline: [
        { stage: "Ordered", time: "Sep 27, 19:42", done: true },
        { stage: "Payment Confirmed", time: "Sep 27, 19:43", done: true },
        { stage: "Shipped", time: "Pending fulfillment", done: false },
        { stage: "Delivered", time: "Est. Sep 30", done: false }
      ]
    },
    {
      id: "VD-10418",
      customer: "Kenji Tanaka",
      email: "kenji.t@example.com",
      phone: "+1 206 555 0192",
      address: "842 Pine Street, Apt 4B, Seattle, WA",
      items: [
        { id: "p1", name: "Linen Resort Shirt", price: 48, qty: 1, img: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=160&q=80&auto=format" }
      ],
      subtotal: 48,
      tax: 3.60,
      shipping: 5,
      total: 56.60,
      status: "shipped",
      source: "reel",
      date: "2026-09-27 10:15",
      trackingNumber: "TRK-881920",
      carrier: "USPS Priority",
      timeline: [
        { stage: "Ordered", time: "Sep 27, 10:15", done: true },
        { stage: "Payment Confirmed", time: "Sep 27, 10:16", done: true },
        { stage: "Shipped", time: "Sep 27, 14:30", done: true },
        { stage: "Delivered", time: "Est. Wednesday", done: false }
      ]
    },
    {
      id: "VD-10412",
      customer: "Sofia Miller",
      email: "sofia.m@example.com",
      phone: "+44 20 7946 0912",
      address: "14 Belgrave Square, London SW1X 8PZ",
      items: [
        { id: "p3", name: "Studio Leather Tote", price: 128, qty: 1, img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=160&q=80&auto=format" }
      ],
      subtotal: 128,
      tax: 9.60,
      shipping: 10,
      total: 147.60,
      status: "pending",
      source: "direct",
      date: "2026-09-26 18:20",
      trackingNumber: "Pending dispatch",
      carrier: "Royal Mail",
      timeline: [
        { stage: "Ordered", time: "Sep 26, 18:20", done: true },
        { stage: "Payment Confirmed", time: "Sep 26, 18:22", done: true },
        { stage: "Shipped", time: "Processing in warehouse", done: false },
        { stage: "Delivered", time: "Est. Oct 02", done: false }
      ]
    },
    {
      id: "VD-10409",
      customer: "Omar Khan",
      email: "omar.k@example.com",
      phone: "+880 1819 876543",
      address: "Gulshan-2, Road 54, House 12, Dhaka",
      items: [
        { id: "p4", name: "Botanical Illuminating Serum", price: 54, qty: 1, img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=160&q=80&auto=format" }
      ],
      subtotal: 54,
      tax: 4.05,
      shipping: 0,
      total: 58.05,
      status: "delivered",
      source: "reel",
      date: "2026-09-25 11:04",
      trackingNumber: "TRK-771203",
      carrier: "Pathao Express",
      timeline: [
        { stage: "Ordered", time: "Sep 25, 11:04", done: true },
        { stage: "Payment Confirmed", time: "Sep 25, 11:05", done: true },
        { stage: "Shipped", time: "Sep 25, 16:00", done: true },
        { stage: "Delivered", time: "Sep 26, 14:15", done: true }
      ]
    }
  ],

  disputes: [
    {
      id: "DSP-301",
      orderId: "VD-10412",
      customer: "Sofia Miller",
      vendor: "Harbor Goods",
      amount: 147.60,
      reason: "Item not as described (Color variance)",
      date: "2026-09-27 12:40",
      status: "open",
      evidence: "Customer uploaded photo showing olive tint under daylight compared to cognac catalog photo.",
      solutionRequested: "Full refund or replacement"
    },
    {
      id: "DSP-298",
      orderId: "VD-10398",
      customer: "Elena Rostova",
      vendor: "Verdant Lab",
      amount: 68.00,
      reason: "Damaged dropper bottle during international transit",
      date: "2026-09-24 16:15",
      status: "resolved",
      evidence: "Courier damage report confirmed crushed outer packaging.",
      solutionRequested: "Refund approved & credited back to Visa"
    }
  ],

  payouts: [
    {
      id: "PO-891",
      vendor: "Atelier North",
      amount: 2480.00,
      fee: 198.40,
      net: 2281.60,
      method: "Bank Wire (SEPA / IBAN)",
      accountNumber: "SE42 **** **** 9102",
      status: "pending",
      requestedAt: "2026-09-27 15:30"
    },
    {
      id: "PO-890",
      vendor: "Harbor Goods",
      amount: 4120.00,
      fee: 329.60,
      net: 3790.40,
      method: "Direct Deposit (Chase NA)",
      accountNumber: "US91 **** **** 4419",
      status: "processing",
      requestedAt: "2026-09-26 09:12"
    },
    {
      id: "PO-885",
      vendor: "Kiln & Co",
      amount: 1150.00,
      fee: 92.00,
      net: 1058.00,
      method: "bKash Merchant / Bank",
      accountNumber: "+880 1711 **** 88",
      status: "paid",
      requestedAt: "2026-09-22 14:00"
    }
  ],

  auditLogs: [
    { time: "2026-09-27 22:15:04", actor: "admin@vendo.app", action: "vendor.kyc.review", target: "vendor_profiles/kiln-co", ip: "192.168.1.42" },
    { time: "2026-09-27 20:30:19", actor: "system.escrow", action: "payout.create", target: "payouts/PO-891", ip: "internal.job" },
    { time: "2026-09-27 18:44:02", actor: "mod_lead@vendo", action: "content.reel.flag", target: "reels/r4_verdant_lab", ip: "103.24.12.8" },
    { time: "2026-09-27 16:12:45", actor: "admin@vendo.app", action: "security.2fa.verify", target: "user_auth/admin_root", ip: "192.168.1.42" },
    { time: "2026-09-27 14:02:11", actor: "admin@vendo.app", action: "vendor.kyc.approve", target: "vendor_profiles/atelier-north", ip: "192.168.1.42" }
  ],

  notifications: [
    { id: "n1", group: "Today", title: "Order VD-10418 has shipped!", desc: "Track your Linen Resort Shirt via USPS Priority.", type: "order", time: "2h ago", unread: true, link: "orders.html" },
    { id: "n2", group: "Today", title: "Kiln & Co is Live now", desc: "Watch wheel-throwing ceramics and grab exclusive live discounts.", type: "live", time: "4h ago", unread: true, link: "live.html" },
    { id: "n3", group: "Yesterday", title: "Price drop on saved item", desc: "Studio Leather Tote by Harbor Goods dropped by $15.", type: "promo", time: "1d ago", unread: false, link: "product.html?id=p3" },
    { id: "n4", group: "Earlier", title: "Welcome to Vendo!", desc: "Discover live shops, shoppable reels, and vetted artisan stores.", type: "welcome", time: "3d ago", unread: false, link: "home.html" }
  ],

  vendorMessages: [
    {
      id: "msg-1",
      customer: "Amina Rahman",
      avatar: "AR",
      lastMessage: "Thank you! Excited for the pour-over carafe.",
      time: "14:22",
      unread: 1,
      thread: [
        { sender: "customer", text: "Hi, I just ordered from your live stream. Is it shipped with gift box packaging?", time: "14:15" },
        { sender: "vendor", text: "Hello Amina! Yes, every Kiln & Co piece arrives in our embossed gift kraft box with organic cotton padding.", time: "14:18" },
        { sender: "customer", text: "Thank you! Excited for the pour-over carafe.", time: "14:22" }
      ]
    },
    {
      id: "msg-2",
      customer: "Kenji Tanaka",
      avatar: "KT",
      lastMessage: "Size exchange inquiry for linen shirt",
      time: "Yesterday",
      unread: 0,
      thread: [
        { sender: "customer", text: "Hello, if the Medium is slightly tight, can I exchange for Large without extra shipping?", time: "Yesterday 11:30" },
        { sender: "vendor", text: "Certainly Kenji! We offer free 14-day sizing exchanges on all apparel items.", time: "Yesterday 11:45" }
      ]
    }
  ]
};

// Initialize State in window.VendoData
window.VendoData = (function () {
  var KEY = "vendo_global_store";
  var data = window.VendoDefaultData;
  try {
    var stored = localStorage.getItem(KEY);
    if (stored) {
      data = JSON.parse(stored);
    }
  } catch(e) {}
  
  data.save = function() {
    var clone = Object.assign({}, this);
    delete clone.save;
    try { localStorage.setItem(KEY, JSON.stringify(clone)); } catch(e) {}
  };
  return data;
})();
// Per-user notifications store. Static demo notifications are shown only
// for new anonymous visitors (to demonstrate the UI shape); as soon as
// the user signs up / signs in we drop the demo feed so they see an
// empty inbox instead of someone else's activity.
window.VendoNotifications = (function () {
  var KEY = "vendo_notifications_v2";

  function ownerKey() {
    try {
      var auth = window.VendoAuth && VendoAuth.getUser && VendoAuth.getUser();
      if (auth && (auth.email || auth.phone)) return auth.email || auth.phone;
    } catch (e) {}
    return null;
  }

  function scopedKey() {
    var o = ownerKey();
    return o ? (KEY + ":" + o) : KEY + ":__demo__";
  }

  function all() {
    var o = ownerKey();
    if (!o) {
      // Anonymous visitor: show static demo notifications so the page is not empty.
      return (window.VendoData && window.VendoData.notifications) || [];
    }
    try {
      var raw = localStorage.getItem(scopedKey());
      if (raw) {
        var saved = JSON.parse(raw);
        if (Array.isArray(saved)) return saved;
      }
    } catch (e) {}
    return [];
  }

  function push(notif) {
    var list = all();
    list.unshift(Object.assign({ time: "Just now", group: "Today" }, notif || {}));
    try { localStorage.setItem(scopedKey(), JSON.stringify(list.slice(0, 50))); } catch (e) {}
  }

  function markRead(id) {
    var list = all();
    list.forEach(function (n) { if (n.id === id) n.read = true; });
    try { localStorage.setItem(scopedKey(), JSON.stringify(list)); } catch (e) {}
  }

  return { all: all, push: push, markRead: markRead };
})();

// Reactive Persistent Stores: Cart, Wishlist, Orders, Products, KYC

window.VendoCart = (function () {
  var KEY = "vendo_cart_v2";

  function items() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function set(newItems) {
    localStorage.setItem(KEY, JSON.stringify(newItems));
    triggerUpdate();
  }

  function add(product, qty, selectedOptions) {
    var list = items();
    var found = list.find(function (i) { return i.id === product.id; });
    qty = qty || 1;
    if (found) {
      found.qty += qty;
      if (selectedOptions) found.options = selectedOptions;
    } else {
      list.push({
        id: product.id,
        name: product.name,
        price: product.price,
        img: product.img,
        vendor: product.vendor,
        qty: qty,
        options: selectedOptions || {}
      });
    }
    set(list);
  }

  function updateQty(id, qty) {
    var list = items();
    var found = list.find(function (i) { return i.id === id; });
    if (found) {
      found.qty = Math.max(1, qty);
      set(list);
    }
  }

  function remove(id) {
    var list = items().filter(function (i) { return i.id !== id; });
    set(list);
  }

  function clear() {
    set([]);
  }

  function count() {
    return items().reduce(function (sum, item) { return sum + item.qty; }, 0);
  }

  function subtotal() {
    return items().reduce(function (sum, item) { return sum + item.price * item.qty; }, 0);
  }

  function getPromo() {
    return localStorage.getItem("vendo_promo_code") || "";
  }

  function applyPromo(code) {
    if ((code || "").trim().toUpperCase() === "VENDO2026") {
      localStorage.setItem("vendo_promo_code", "VENDO2026");
      triggerUpdate();
      return { success: true, discountPercent: 15 };
    }
    return { success: false, message: "Invalid promo code. Try VENDO2026 for 15% off." };
  }

  function clearPromo() {
    localStorage.removeItem("vendo_promo_code");
    triggerUpdate();
  }

  function discount() {
    if (getPromo() === "VENDO2026") {
      return Math.round(subtotal() * 0.15 * 100) / 100;
    }
    return 0;
  }

  function shipping() {
    var sub = subtotal();
    if (sub === 0) return 0;
    return sub >= 75 ? 0 : 9.00;
  }

  function tax() {
    var sub = Math.max(0, subtotal() - discount());
    return Math.round(sub * 0.075 * 100) / 100; // 7.5% Tax
  }

  function grandTotal() {
    return Math.max(0, subtotal() - discount() + shipping() + tax());
  }

  function triggerUpdate() {
    window.dispatchEvent(new CustomEvent("vendo-cart-updated", { detail: { count: count(), total: grandTotal() } }));
    // Update badge in DOM if present
    document.querySelectorAll(".cart-count-badge").forEach(function (el) {
      var c = count();
      el.textContent = c;
      el.classList.toggle("hidden", c === 0);
    });
  }

  return {
    items: items,
    set: set,
    add: add,
    updateQty: updateQty,
    remove: remove,
    clear: clear,
    count: count,
    subtotal: subtotal,
    discount: discount,
    shipping: shipping,
    tax: tax,
    grandTotal: grandTotal,
    total: grandTotal,
    getPromo: getPromo,
    applyPromo: applyPromo,
    clearPromo: clearPromo,
    triggerUpdate: triggerUpdate
  };
})();

window.VendoWish = (function () {
  var KEY = "vendo_wishlist_v2";

  function ids() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function has(id) {
    return ids().indexOf(id) !== -1;
  }

  function toggle(id) {
    var list = ids();
    var idx = list.indexOf(id);
    var added = false;
    if (idx === -1) {
      list.push(id);
      added = true;
    } else {
      list.splice(idx, 1);
      added = false;
    }
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("vendo-wish-updated", { detail: { count: list.length } }));
    return added;
  }

  function items() {
    var currentIds = ids();
    return window.VendoData.products.filter(function (p) {
      return currentIds.indexOf(p.id) !== -1;
    });
  }

  return {
    ids: ids,
    has: has,
    toggle: toggle,
    items: items
  };
})();

window.VendoOrders = (function () {
  var KEY = "vendo_orders_v2";

function ownerKey() {
    try {
      var auth = window.VendoAuth && VendoAuth.getUser && VendoAuth.getUser();
      if (auth && (auth.email || auth.phone || auth.name)) {
        return auth.email || auth.phone || ("name:" + auth.name);
      }
      var anon = localStorage.getItem("vendo_anon_id");
      if (anon) return anon;
      anon = "anon-" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("vendo_anon_id", anon);
      return anon;
    } catch (e) {
      return "anon-static";
    }
  }

  function scopedKey() {
    return KEY + ":" + ownerKey();
  }

  function all() {
    try {
      var saved = JSON.parse(localStorage.getItem(scopedKey()) || "[]");
      if (saved && Array.isArray(saved) && saved.length > 0) return saved;
    } catch (e) {}
    return [];
  }

  function get(id) {
    return all().find(function (o) { return o.id === id; });
  }

  function create(orderPayload) {
    var list = all();
    var orderId = "VD-" + (Math.floor(10000 + Math.random() * 90000));
    var newOrder = Object.assign({
      id: orderId,
      date: new Date().toISOString().replace("T", " ").slice(0, 16),
      status: "paid",
      source: "direct",
      trackingNumber: "TRK-" + (Math.floor(100000 + Math.random() * 900000)),
      carrier: "Pathao / DHL Express",
      timeline: [
        { stage: "Ordered", time: "Just now", done: true },
        { stage: "Payment Confirmed", time: "Just now", done: true },
        { stage: "Shipped", time: "Warehouse preparing packaging", done: false },
        { stage: "Delivered", time: "Est. in 3 business days", done: false }
      ]
    }, orderPayload);

    list.unshift(newOrder);
    try { localStorage.setItem(scopedKey(), JSON.stringify(list)); } catch (e) {}
    return newOrder;
  }

  function updateStatus(id, newStatus) {
    var list = all();
    var found = list.find(function (o) { return o.id === id; });
    if (found) {
      found.status = newStatus;
      try { localStorage.setItem(scopedKey(), JSON.stringify(list)); } catch (e) {}
    }
  }

  return {
    all: all,
    get: get,
    create: create,
    updateStatus: updateStatus
  };
})();

window.VendoKYC = (function () {
  var KEY = "vendo_vendor_kyc_draft";

  function getDraft() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveDraft(stepData) {
    var cur = getDraft();
    var updated = Object.assign({}, cur, stepData);
    localStorage.setItem(KEY, JSON.stringify(updated));
    return updated;
  }

  function isSubmitted() {
    return localStorage.getItem("vendo_kyc_submitted") === "true";
  }

  function submit(data) {
    saveDraft(data);
    localStorage.setItem("vendo_kyc_submitted", "true");
  }

  return {
    getDraft: getDraft,
    saveDraft: saveDraft,
    isSubmitted: isSubmitted,
    submit: submit
  };
})();
