import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const configuredPath = process.env.DATABASE_PATH?.trim();
const dbPath = configuredPath
  ? path.resolve(process.cwd(), configuredPath)
  : path.resolve(process.cwd(), 'data', 'renora.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      country TEXT NOT NULL DEFAULT 'Ghana',
      phone TEXT DEFAULT '',
      preferred_currency TEXT NOT NULL DEFAULT 'GHS',
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
      email_verified INTEGER NOT NULL DEFAULT 0,
      verification_token_hash TEXT,
      verification_expires_at TEXT,
      reset_token_hash TEXT,
      reset_expires_at TEXT,
      account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      role TEXT NOT NULL CHECK (role IN ('customer', 'admin')),
      expires_at TEXT NOT NULL,
      user_agent TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category_slug TEXT NOT NULL,
      estimated_value_usd INTEGER NOT NULL,
      short_description TEXT NOT NULL,
      detailed_description TEXT NOT NULL,
      condition TEXT NOT NULL DEFAULT 'Brand New',
      location TEXT NOT NULL DEFAULT 'Accra, Ghana',
      delivery_info TEXT NOT NULL,
      important_info TEXT NOT NULL,
      official_rules TEXT NOT NULL,
      eligibility_countries_json TEXT NOT NULL DEFAULT '["Ghana","United States","United Kingdom","Canada"]',
      specs_json TEXT NOT NULL DEFAULT '[]',
      images_json TEXT NOT NULL DEFAULT '[]',
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_sample INTEGER NOT NULL DEFAULT 1,
      campaign_status TEXT NOT NULL DEFAULT 'showcase_only',
      ticket_price_usd REAL NOT NULL DEFAULT 5,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_slug) REFERENCES categories(slug) ON UPDATE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payment_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_reference TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price_usd REAL NOT NULL,
      total_usd REAL NOT NULL,
      display_currency TEXT NOT NULL DEFAULT 'GHS',
      display_amount REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK (payment_method IN ('visa_card', 'bank_transfer', 'mobile_money', 'paypal')),
      provider_name TEXT NOT NULL,
      provider_reference TEXT DEFAULT '',
      mobile_network TEXT DEFAULT '',
      payer_phone TEXT DEFAULT '',
      bank_sender_name TEXT DEFAULT '',
      bank_reference TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pending_verification', 'paid', 'sandbox_paid', 'failed', 'rejected')),
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_code TEXT NOT NULL UNIQUE,
      order_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'sandbox', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES payment_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      body TEXT NOT NULL,
      market_scope TEXT NOT NULL DEFAULT 'Global & Ghana',
      is_published INTEGER NOT NULL DEFAULT 1,
      published_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      country TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id INTEGER,
      actor_email TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL DEFAULT '',
      target_id TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Safe migration for existing databases missing ticket_price_usd
  const productColumns = db.prepare('PRAGMA table_info(products)').all() as { name: string }[];
  if (!productColumns.some((col) => col.name === 'ticket_price_usd')) {
    db.exec('ALTER TABLE products ADD COLUMN ticket_price_usd REAL NOT NULL DEFAULT 5');
  }

  seedInitialData();
}

function seedInitialData(): void {
  const categoryCount = (db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }).count;
  if (categoryCount === 0) {
    const insertCategory = db.prepare(`
      INSERT INTO categories (slug, name, description, sort_order)
      VALUES (@slug, @name, @description, @sort_order)
    `);

    const categories = [
      {
        slug: 'cars-and-vehicles',
        name: 'Cars and Vehicles',
        description: 'Executive sedans, family SUVs, and utility vehicles curated for dependable everyday mobility.',
        sort_order: 1,
      },
      {
        slug: 'houses-and-properties',
        name: 'Houses and Properties',
        description: 'Contemporary residences, townhomes, and architectural developments in prime residential districts.',
        sort_order: 2,
      },
      {
        slug: 'smartphones',
        name: 'Smartphones',
        description: 'Flagship mobile devices engineered for photography, productivity, and global connectivity.',
        sort_order: 3,
      },
      {
        slug: 'computers-and-laptops',
        name: 'Computers and Laptops',
        description: 'High-performance workstations and ultrabooks built for creators, engineers, and students.',
        sort_order: 4,
      },
      {
        slug: 'electronics',
        name: 'Electronics',
        description: 'Cinema-grade OLED televisions, home theatre acoustics, and precision digital electronics.',
        sort_order: 5,
      },
      {
        slug: 'home-appliances',
        name: 'Home Appliances',
        description: 'Energy-efficient refrigeration, kitchen systems, and modern household appliances.',
        sort_order: 6,
      },
      {
        slug: 'furniture',
        name: 'Furniture',
        description: 'Sculptural hardwood, travertine, and upholstered furnishings designed for enduring living spaces.',
        sort_order: 7,
      },
      {
        slug: 'lifestyle-and-accessories',
        name: 'Lifestyle and Accessories',
        description: 'Fine mechanical timepieces, travel gear, and signature personal accessories.',
        sort_order: 8,
      },
    ];

    const seedCategoriesTx = db.transaction(() => {
      for (const cat of categories) {
        insertCategory.run(cat);
      }
    });
    seedCategoriesTx();
  }

  const productCount = (db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }).count;
  if (productCount === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (
        slug, name, category_slug, estimated_value_usd, short_description,
        detailed_description, condition, location, delivery_info, important_info,
        official_rules, eligibility_countries_json, specs_json, images_json,
        is_featured, is_sample, campaign_status
      ) VALUES (
        @slug, @name, @category_slug, @estimated_value_usd, @short_description,
        @detailed_description, @condition, @location, @delivery_info, @important_info,
        @official_rules, @eligibility_countries_json, @specs_json, @images_json,
        @is_featured, @is_sample, @campaign_status
      )
    `);

    const defaultRules =
      'DRAFT FRAMEWORK ONLY: Participatory entries, ticket sales, payments, and winner selection are currently disabled. Any future campaign featuring this item will only open after full legal review, regulatory clearance, and publication of jurisdiction-specific official rules in each eligible country.';

    const sampleProducts = [
      {
        slug: 'sapphire-executive-suv-sample',
        name: 'Executive All-Wheel-Drive Touring SUV (Sample Showcase)',
        category_slug: 'cars-and-vehicles',
        estimated_value_usd: 20000,
        short_description:
          'Illustrative sample vehicle showcase demonstrating how RENORA presents verified vehicle specifications and transparent valuation.',
        detailed_description:
          'This illustrative sample listing represents the automotive tier RENORA plans to curate for customers starting in Ghana and expanding across international markets. In a future approved campaign, every vehicle listing will publish verified inspection records, customs clearance status, and independent market valuation documentation prior to opening.',
        condition: 'Factory Inspected / Sample Specification',
        location: 'Accra, Ghana (Illustrative Hub)',
        delivery_info:
          'Ghana: Coordinated handover in Accra or Kumasi with full DVLA documentation support. International markets: Regional dealership fulfillment or insured port delivery subject to local import regulations.',
        important_info:
          'Sample Catalog Item: This vehicle is displayed strictly to demonstrate platform structure and product presentation. No entry tickets or payments are accepted at this stage.',
        official_rules: defaultRules,
        eligibility_countries_json: JSON.stringify(['Ghana', 'United States', 'United Kingdom', 'Canada']),
        specs_json: JSON.stringify([
          { label: 'Make', value: 'Illustrative Touring Series' },
          { label: 'Model', value: 'Vogue Executive AWD' },
          { label: 'Year', value: '2025' },
          { label: 'Engine', value: '2.0L Turbocharged Mild-Hybrid' },
          { label: 'Transmission', value: '8-Speed Automatic' },
          { label: 'Mileage', value: '120 km (Delivery Miles)' },
          { label: 'Condition', value: 'New / Unregistered Sample' },
          { label: 'Registration Status', value: 'Clear Pre-Registration Customs Ready' },
        ]),
        images_json: JSON.stringify([
          '/src/assets/images/product_luxury_vehicle_1795385155049.jpg',
          '/src/assets/images/vehicle_interior_detail_1795385171630.jpg',
          '/src/assets/images/hero_renora_showcase_1795385154209.jpg',
        ]),
        is_featured: 1,
        is_sample: 1,
        campaign_status: 'showcase_only',
      },
      {
        slug: 'cantonments-architectural-residence-sample',
        name: 'Contemporary 4-Bedroom Courtyard Residence (Sample Showcase)',
        category_slug: 'houses-and-properties',
        estimated_value_usd: 245000,
        short_description:
          'Illustrative sample property profile showing architectural specifications, land documentation transparency, and regional eligibility.',
        detailed_description:
          'Designed to showcase how RENORA structures high-value real estate listings, this sample architectural residence features double-height glazing, warm timber accents, solar-ready infrastructure, and landscaped courtyard grounds. Future property offerings will only launch once title verification, escrow safeguards, and regulatory approvals are finalized.',
        condition: 'Newly Completed / Sample Property',
        location: 'East Legon / Cantonments District, Accra, Ghana',
        delivery_info:
          'Title deed transfer and physical property handover coordinated exclusively through licensed conveyancing counsel in the property jurisdiction.',
        important_info:
          'Sample Catalog Item: Not an active property draw or offer for sale. Displayed for platform architecture and user experience preview.',
        official_rules: defaultRules,
        eligibility_countries_json: JSON.stringify(['Ghana', 'United Kingdom', 'United States', 'Canada']),
        specs_json: JSON.stringify([
          { label: 'Property Type', value: 'Detached Two-Story Residence' },
          { label: 'Bedrooms', value: '4 En-Suite Bedrooms' },
          { label: 'Bathrooms', value: '4.5 Bathrooms' },
          { label: 'Location', value: 'Accra Metropolitan Area, Ghana' },
          { label: 'Land Size', value: '620 sq meters (Titled Plot)' },
          { label: 'Building Features', value: 'Double-Glazed Facade, Courtyard Pool, Solar Backup' },
          { label: 'Ownership & Documentation Status', value: 'Illustrative Freehold / Lands Commission Ready' },
        ]),
        images_json: JSON.stringify([
          '/src/assets/images/product_modern_house_1795385154165.jpg',
          '/src/assets/images/product_modern_furniture_1795385154226.jpg',
          '/src/assets/images/product_smart_television_1795385154323.jpg',
        ]),
        is_featured: 1,
        is_sample: 1,
        campaign_status: 'showcase_only',
      },
      {
        slug: 'titanium-pro-smartphone-512gb-sample',
        name: 'Flagship Titanium 5G Smartphone — 512GB (Sample Showcase)',
        category_slug: 'smartphones',
        estimated_value_usd: 1199,
        short_description:
          'Illustrative sample flagship smartphone with grade-5 titanium frame, pro triple-lens camera array, and unlocked global 5G bands.',
        detailed_description:
          'Built for creators, entrepreneurs, and everyday communication across Ghana and international networks. This sample listing illustrates how RENORA presents detailed technical specifications, factory-unlocked compatibility, and insured courier fulfillment.',
        condition: 'Factory Sealed / Sample Specification',
        location: 'Accra & International Regional Warehouses',
        delivery_info:
          'Tracked insured courier delivery available within Ghana (2–4 business days) and international shipping hubs in the US, UK, and Canada upon approved campaign release.',
        important_info:
          'Sample Catalog Item: Shown for product catalog demonstration only. Participation is disabled.',
        official_rules: defaultRules,
        eligibility_countries_json: JSON.stringify(['Ghana', 'United States', 'United Kingdom', 'Canada']),
        specs_json: JSON.stringify([
          { label: 'Display', value: '6.7-inch LTPO OLED, 120Hz Adaptive' },
          { label: 'Processor', value: 'Next-Gen 3nm 6-Core Mobile SoC' },
          { label: 'Storage & Memory', value: '512GB NVMe / 12GB RAM' },
          { label: 'Camera System', value: '48MP Main + 48MP Ultrawide + 5x Telephoto' },
          { label: 'Network Compatibility', value: 'Factory Unlocked Global Dual-SIM + eSIM' },
          { label: 'Chassis Material', value: 'Grade-5 Brushed Titanium & Ceramic Glass' },
          { label: 'Warranty', value: '12-Month Manufacturer Coverage (Illustrative)' },
        ]),
        images_json: JSON.stringify([
          '/src/assets/images/product_smartphone_flagship_1795385155542.jpg',
          '/src/assets/images/smartphone_front_display_1795385170466.jpg',
        ]),
        is_featured: 1,
        is_sample: 1,
        campaign_status: 'showcase_only',
      },
      {
        slug: 'studio-pro-ultrabook-16-sample',
        name: 'Anodized Aluminum 16" Creator Laptop (Sample Showcase)',
        category_slug: 'computers-and-laptops',
        estimated_value_usd: 2499,
        short_description:
          'Illustrative sample precision workstation featuring 32GB unified memory, 1TB SSD, and a calibrated 120Hz reference display.',
        detailed_description:
          'Designed to empower software engineers, designers, students, and business founders, this sample workstation showcases RENORA’s computing tier with complete hardware transparency and international power adapter support.',
        condition: 'Brand New / Sample Specification',
        location: 'Accra, Ghana & Global Fulfillment',
        delivery_info:
          'Sealed retail packaging delivered via signature-required courier in Ghana, US, UK, and Canada with region-matched power adapter.',
        important_info:
          'Sample Catalog Item: Hardware shown for demonstration purposes only; entries are not open.',
        official_rules: defaultRules,
        eligibility_countries_json: JSON.stringify(['Ghana', 'United States', 'United Kingdom', 'Canada']),
        specs_json: JSON.stringify([
          { label: 'Display', value: '16.2-inch Liquid Reference XDR (3456 x 2234)' },
          { label: 'Processor', value: '12-Core Performance Architecture' },
          { label: 'Memory', value: '32GB High-Bandwidth Unified Memory' },
          { label: 'Storage', value: '1TB PCIe Gen4 Solid State Drive' },
          { label: 'Connectivity', value: '3x Thunderbolt 4, HDMI 2.1, Wi-Fi 6E' },
          { label: 'Battery Endurance', value: 'Up to 18 Hours Mixed Productivity' },
          { label: 'Keyboard Layout', value: 'US/UK International Backlit Layout' },
        ]),
        images_json: JSON.stringify([
          '/src/assets/images/product_premium_laptop_1795385154608.jpg',
          '/src/assets/images/laptop_workspace_detail_1795385169891.jpg',
        ]),
        is_featured: 1,
        is_sample: 1,
        campaign_status: 'showcase_only',
      },
      {
        slug: 'reference-65-oled-smart-tv-sample',
        name: '65" Frameless 4K Reference OLED Smart TV (Sample Showcase)',
        category_slug: 'electronics',
        estimated_value_usd: 2150,
        short_description:
          'Illustrative sample ultra-thin 4K OLED television engineered for true-to-life contrast, Dolby Vision HDR, and modern interiors.',
        detailed_description:
          'Showcasing RENORA’s home entertainment category, this sample 65-inch OLED panel combines gallery-thin wall mounting with dual-voltage international power compatibility (100V–240V) suitable for Ghana, North America, and Europe.',
        condition: 'Brand New / Sample Specification',
        location: 'Accra, Ghana',
        delivery_info:
          'White-glove regional delivery and wall-mount inspection available in Greater Accra; insured freight available for supported international regions.',
        important_info:
          'Sample Catalog Item: Displayed to illustrate product category formatting and specification standards.',
        official_rules: defaultRules,
        eligibility_countries_json: JSON.stringify(['Ghana', 'United States', 'United Kingdom', 'Canada']),
        specs_json: JSON.stringify([
          { label: 'Panel Technology', value: '65-inch Self-Lit 4K OLED' },
          { label: 'Refresh Rate', value: '120Hz Native Variable Refresh' },
          { label: 'HDR Support', value: 'Dolby Vision IQ, HDR10+, HLG' },
          { label: 'Audio System', value: '60W 4.2-Channel Integrated Acoustic Array' },
          { label: 'Power Input', value: 'Universal 100–240V, 50/60Hz' },
          { label: 'Inputs', value: '4x HDMI 2.1, eARC, Optical, Ethernet' },
        ]),
        images_json: JSON.stringify([
          '/src/assets/images/product_smart_television_1795385154323.jpg',
          '/src/assets/images/product_modern_furniture_1795385154226.jpg',
        ]),
        is_featured: 1,
        is_sample: 1,
        campaign_status: 'showcase_only',
      },
      {
        slug: 'chronometer-steel-gold-watch-sample',
        name: 'Automatic Two-Tone Steel & Gold Chronometer Watch (Sample Showcase)',
        category_slug: 'lifestyle-and-accessories',
        estimated_value_usd: 6800,
        short_description:
          'Illustrative sample mechanical timepiece crafted in brushed steel and 18k gold bezel with deep sapphire dial.',
        detailed_description:
          'Representing RENORA’s lifestyle and fine accessories category, this sample chronometer demonstrates how provenance certificates, serial documentation, and insured concierge delivery would be structured for high-value personal items.',
        condition: 'Unworn Box & Papers / Sample Specification',
        location: 'Geneva / Accra Concierge Vault (Illustrative)',
        delivery_info:
          'Hand-delivered via insured armored courier or verified collection appointment with tamper-evident documentation.',
        important_info:
          'Sample Catalog Item: Not an active giveaway or commercial sale.',
        official_rules: defaultRules,
        eligibility_countries_json: JSON.stringify(['Ghana', 'United States', 'United Kingdom', 'Canada']),
        specs_json: JSON.stringify([
          { label: 'Case Diameter', value: '40mm Brushed Stainless Steel' },
          { label: 'Bezel', value: '18k Satin-Brushed Yellow Gold' },
          { label: 'Movement', value: 'Automatic Mechanical Calibre, 70h Reserve' },
          { label: 'Crystal', value: 'Anti-Reflective Scratch-Resistant Sapphire' },
          { label: 'Water Resistance', value: '100 meters / 10 ATM' },
          { label: 'Included', value: 'Presentation Box & Certificate (Illustrative)' },
        ]),
        images_json: JSON.stringify([
          '/src/assets/images/product_luxury_watch_1795385155067.jpg',
        ]),
        is_featured: 1,
        is_sample: 1,
        campaign_status: 'showcase_only',
      },
      {
        slug: 'culinary-smart-refrigeration-suite-sample',
        name: 'Brushed Steel Smart French-Door Refrigerator & Coffee Suite (Sample Showcase)',
        category_slug: 'home-appliances',
        estimated_value_usd: 4200,
        short_description:
          'Illustrative sample inverter kitchen appliance pairing engineered for energy efficiency, tropical ambient resilience, and quiet operation.',
        detailed_description:
          'Built for modern households in Ghana and abroad, this sample appliance suite pairs a dual-inverter French-door refrigerator with a precision espresso system, emphasizing energy efficiency and surge-protected compressor durability.',
        condition: 'Brand New / Sample Specification',
        location: 'Tema / Accra Logistics Center (Illustrative)',
        delivery_info:
          'Scheduled two-person home placement and packaging removal within supported metropolitan delivery zones.',
        important_info:
          'Sample Catalog Item: Featured to illustrate the Home Appliances category.',
        official_rules: defaultRules,
        eligibility_countries_json: JSON.stringify(['Ghana', 'United Kingdom', 'United States', 'Canada']),
        specs_json: JSON.stringify([
          { label: 'Capacity', value: '635 Liters Net Storage' },
          { label: 'Compressor', value: 'Digital Dual-Inverter Low-Noise' },
          { label: 'Voltage Rating', value: '220–240V / 50Hz Tropicalized Model (GH/UK)' },
          { label: 'Finish', value: 'Fingerprint-Resistant Brushed Stainless Steel' },
          { label: 'Energy Rating', value: 'Class A++ High Efficiency' },
        ]),
        images_json: JSON.stringify([
          '/src/assets/images/product_home_appliance_1795385154898.jpg',
        ]),
        is_featured: 0,
        is_sample: 1,
        campaign_status: 'showcase_only',
      },
      {
        slug: 'sculptural-walnut-boucle-living-set-sample',
        name: 'Solid Walnut & Cream Boucle Lounge Set with Travertine Table (Sample Showcase)',
        category_slug: 'furniture',
        estimated_value_usd: 3600,
        short_description:
          'Illustrative sample living room ensemble handcrafted in kiln-dried walnut, tailored boucle upholstery, and natural travertine stone.',
        detailed_description:
          'Highlighting RENORA’s commitment to lasting home interiors, this sample furniture collection brings architectural craft and durable natural materials into everyday living rooms.',
        condition: 'Made to Order / Sample Specification',
        location: 'Accra Design Studio (Illustrative)',
        delivery_info:
          'Blanket-wrapped scheduled delivery and room-of-choice placement within Ghana and regional partner hubs.',
        important_info:
          'Sample Catalog Item: Shown for catalog and category exploration only.',
        official_rules: defaultRules,
        eligibility_countries_json: JSON.stringify(['Ghana', 'United States', 'United Kingdom', 'Canada']),
        specs_json: JSON.stringify([
          { label: 'Frame Material', value: 'Kiln-Dried Solid American Walnut' },
          { label: 'Upholstery', value: 'Stain-Resistant Performance Cream Boucle' },
          { label: 'Table Material', value: 'Honed Natural Roman Travertine' },
          { label: 'Sofa Dimensions', value: '228cm W x 92cm D x 78cm H' },
          { label: 'Seating Capacity', value: '3 Adults + Lounge Table' },
        ]),
        images_json: JSON.stringify([
          '/src/assets/images/product_modern_furniture_1795385154226.jpg',
          '/src/assets/images/product_smart_television_1795385154323.jpg',
        ]),
        is_featured: 0,
        is_sample: 1,
        campaign_status: 'showcase_only',
      },
      {
        slug: 'executive-hybrid-sedan-sample',
        name: 'Executive Hybrid Touring Sedan (Sample Showcase)',
        category_slug: 'cars-and-vehicles',
        estimated_value_usd: 32500,
        short_description:
          'Illustrative sample flagship sedan showcasing executive comfort, hybrid efficiency, and complete registration transparency.',
        detailed_description:
          'A second automotive sample showcasing RENORA’s breadth across sedans and SUVs. Highlights full provenance disclosures, safety ratings, and country-specific import compliance.',
        condition: 'Factory Inspected / Sample Specification',
        location: 'Accra, Ghana',
        delivery_info:
          'Regional collection or enclosed carrier delivery arranged upon verified regulatory clearance.',
        important_info:
          'Sample Catalog Item: No ticket sales or draws are active.',
        official_rules: defaultRules,
        eligibility_countries_json: JSON.stringify(['Ghana', 'United States', 'United Kingdom', 'Canada']),
        specs_json: JSON.stringify([
          { label: 'Make', value: 'Executive Mobility Line' },
          { label: 'Model', value: 'S-Line Hybrid Saloon' },
          { label: 'Year', value: '2025' },
          { label: 'Engine', value: '2.5L Petrol-Electric Hybrid' },
          { label: 'Transmission', value: 'e-CVT Automatic' },
          { label: 'Mileage', value: '85 km' },
          { label: 'Condition', value: 'New Sample Specification' },
          { label: 'Registration Status', value: 'Unregistered / Export & Local Compliant' },
        ]),
        images_json: JSON.stringify([
          '/src/assets/images/hero_renora_showcase_1795385154209.jpg',
          '/src/assets/images/vehicle_interior_detail_1795385171630.jpg',
        ]),
        is_featured: 0,
        is_sample: 1,
        campaign_status: 'showcase_only',
      },
    ];

    const seedProductsTx = db.transaction(() => {
      for (const product of sampleProducts) {
        insertProduct.run(product);
      }
    });
    seedProductsTx();
  }

  const faqCount = (db.prepare('SELECT COUNT(*) as count FROM faqs').get() as { count: number }).count;
  if (faqCount === 0) {
    const insertFaq = db.prepare(`
      INSERT INTO faqs (product_id, question, answer, sort_order)
      VALUES (@product_id, @question, @answer, @sort_order)
    `);

    const globalFaqs = [
      {
        product_id: null,
        question: 'Are prize competitions or ticket purchases currently active on RENORA?',
        answer:
          'No. Ticket sales, paid entries, random winner selection, and live competitions are intentionally disabled in this version. RENORA is currently focused on product presentation, customer account readiness, and legal/regulatory preparation across Ghana and international markets.',
        sort_order: 1,
      },
      {
        product_id: null,
        question: 'Are the products shown on RENORA actual active prizes right now?',
        answer:
          'No. Every item currently listed in the catalog is clearly marked as a Sample Catalog Item to demonstrate how RENORA presents specifications, valuations, delivery policies, and rules.',
        sort_order: 2,
      },
      {
        product_id: null,
        question: 'Which countries will RENORA support?',
        answer:
          'RENORA’s initial launch market is Ghana, with platform architecture designed to expand responsibly into the United States, the United Kingdom, Canada, and other international territories. Availability of any future campaign will depend on local legal approvals in each jurisdiction.',
        sort_order: 3,
      },
      {
        product_id: null,
        question: 'How does RENORA protect my personal account information?',
        answer:
          'Customer passwords are never stored in plain text—they are protected with cryptographic scrypt hashing and per-user random salts. Sessions are verified server-side, sensitive endpoints are rate-limited, and privacy policies are drafted with Ghana Data Protection Act (Act 843) and international standards in mind.',
        sort_order: 4,
      },
      {
        product_id: null,
        question: 'Can I create a customer account today?',
        answer:
          'Yes. You can create a verified RENORA customer account, manage your profile and currency preferences, receive official announcements, and explore the catalog ahead of any future approved launch.',
        sort_order: 5,
      },
    ];

    const seedFaqsTx = db.transaction(() => {
      for (const faq of globalFaqs) {
        insertFaq.run(faq);
      }
    });
    seedFaqsTx();
  }

  const announcementCount = (
    db.prepare('SELECT COUNT(*) as count FROM announcements').get() as { count: number }
  ).count;
  if (announcementCount === 0) {
    db.prepare(`
      INSERT INTO announcements (title, summary, body, market_scope, is_published)
      VALUES (?, ?, ?, ?, 1)
    `).run(
      'Platform Showcase & Regulatory Readiness Update',
      'RENORA launches its digital product showcase and customer account portal while completing legal and licensing reviews.',
      'Welcome to the RENORA platform preview. Our team is establishing product sourcing standards, delivery logistics starting in Ghana, and international compliance frameworks. Paid entries, ticket sales, and draws remain disabled until all required legal approvals are obtained in each relevant market.',
      'Ghana & International'
    );

    db.prepare(`
      INSERT INTO announcements (title, summary, body, market_scope, is_published)
      VALUES (?, ?, ?, ?, 1)
    `).run(
      'Multi-Currency & International Catalog Preview Enabled',
      'Visitors can now view estimated product values across GHS, USD, GBP, and CAD.',
      'To support our Ghanaian foundation alongside diaspora and international expansion into the United Kingdom, United States, and Canada, RENORA now renders illustrative currency conversions across all product pages and search filters.',
      'Global'
    );
  }

  const defaultSettings: [string, string][] = [
    ['bank_name', 'Ghana & International Settlement Bank (Configure in Admin)'],
    ['bank_account_name', 'RENORA Ticket Settlement Account'],
    ['bank_account_number', 'Configure in Admin -> Payment Settings'],
    ['bank_swift_code', 'Configure SWIFT / Branch Code in Admin'],
    ['momo_merchant_name', 'RENORA Ghana Mobile Money'],
    ['momo_mtn_number', 'Configure MTN MoMo Merchant Number in Admin'],
    ['momo_vodafone_number', 'Configure Vodafone Cash Number in Admin'],
    ['momo_tigo_number', 'Configure AirtelTigo Money Number in Admin'],
  ];

  const insertSetting = db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)');
  for (const [k, v] of defaultSettings) {
    insertSetting.run(k, v);
  }

  // Assign tiered illustrative ticket prices on seeded items
  const ticketTierMap: [string, number][] = [
    ['sapphire-executive-suv-sample', 10],
    ['cantonments-architectural-residence-sample', 20],
    ['titanium-pro-smartphone-512gb-sample', 3],
    ['studio-pro-ultrabook-16-sample', 5],
    ['reference-65-oled-smart-tv-sample', 5],
    ['chronometer-steel-gold-watch-sample', 8],
    ['culinary-smart-refrigeration-suite-sample', 5],
    ['sculptural-walnut-boucle-living-set-sample', 4],
    ['executive-hybrid-sedan-sample', 12],
  ];
  const updateTier = db.prepare('UPDATE products SET ticket_price_usd = ? WHERE slug = ? AND ticket_price_usd = 5');
  for (const [slug, price] of ticketTierMap) {
    updateTier.run(price, slug);
  }
}

export function logActivity(params: {
  actorUserId?: number | null;
  actorEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
}): void {
  db.prepare(`
    INSERT INTO activity_logs (actor_user_id, actor_email, action, target_type, target_id, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    params.actorUserId ?? null,
    params.actorEmail,
    params.action,
    params.targetType ?? '',
    params.targetId ?? '',
    params.details ?? ''
  );
}
