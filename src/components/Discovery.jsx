import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Zap,
  Truck,
  ShoppingBag,
  Ticket,
  TrendingUp,
  Sparkles,
  CalendarDays,
  Grid2X2,
  Shirt,
  Smartphone,
  House,
  Headphones,
  Briefcase,
  Footprints,
  Watch,
  Dumbbell,
  Heart,
  Blocks,
  Apple,
  BookOpen,
  Cat,
  Car,
  Gem,
  Plane,
  Gamepad2,
  Ellipsis,
  Flower2,
  Laptop,
  Camera,
  Baby,
  Tv,
} from "lucide-react";
import { banners, image } from "../data/catalog";
import { useCatalog } from "./catalog/CatalogProvider";
import s from "./Discovery.module.css";
const quickItems = [
  ["Flash Deals", Zap, "/collection/flash-deals"],
  ["Free Shipping", Truck, "/collection/free-shipping"],
  ["Shopiz Mall", ShoppingBag, "/collection/mall"],
  ["Vouchers", Ticket, "/vouchers"],
  ["Top Products", TrendingUp, "/collection/top-products"],
  ["New Arrivals", Sparkles, "/collection/new-arrivals"],
  ["Daily Deals", CalendarDays, "/collection/daily-deals"],
  ["Categories", Grid2X2, "/#categories"],
];
const icons = [
  Shirt,
  Shirt,
  Flower2,
  Smartphone,
  House,
  Headphones,
  Briefcase,
  Footprints,
  Watch,
  Dumbbell,
  Heart,
  Blocks,
  Apple,
  BookOpen,
  Cat,
  Car,
  Gem,
  Plane,
  Gamepad2,
  Ellipsis,
];
export function BannerCarousel({ headingLevel = "h1" }) {
  const HeroHeading = headingLevel;
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setActive((x) => (x + 1) % banners.length),
      6500,
    );
    return () => clearInterval(id);
  }, []);
  const banner = banners[active];
  return (
    <div className={s.banners}>
      <div
        className={s.hero}
        aria-roledescription="carousel"
        aria-label="Featured promotions"
      >
        <div className={s.heroCopy}>
          <span className={s.eyebrow}>{banner.eyebrow}</span>
          <HeroHeading className={s.heroTitle}>{banner.title}</HeroHeading>
          <p>{banner.description}</p>
          <Link className={s.cta} to={banner.to}>
            {banner.cta}
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className={s.art}>
          <div className={s.circle} />
          <img
            key={banner.photo}
            src={image(banner.photo, 700)}
            alt="Featured everyday essentials"
          />
          <span className={s.dealTag}>{banner.tag}</span>
        </div>
        <button
          className={`${s.arrow} ${s.prev}`}
          aria-label="Previous promotion"
          onClick={() =>
            setActive((active + banners.length - 1) % banners.length)
          }
        >
          <ChevronLeft size={18} />
        </button>
        <button
          className={`${s.arrow} ${s.next}`}
          aria-label="Next promotion"
          onClick={() => setActive((active + 1) % banners.length)}
        >
          <ChevronRight size={18} />
        </button>
        <div className={s.dots}>
          {banners.map((b, i) => (
            <button
              key={b.title}
              aria-label={`Show promotion ${i + 1}`}
              aria-pressed={i === active}
              className={i === active ? s.activeDot : ""}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
        <span className={s.slideCount}>
          0{active + 1} / 0{banners.length}
        </span>
      </div>
      <div className={s.sideBanners}>
        <Link to="/collection/free-shipping" className={s.shipping}>
          <div>
            <span className={s.eyebrow}>A LITTLE EXTRA, ON US</span>
            <h2>
              Great finds.
              <br />
              Free delivery.
            </h2>
            <span className={s.smallCta}>
              Claim your vouchers <ArrowRight size={13} />
            </span>
          </div>
          <div className={s.truckArt}>
            <Truck size={73} strokeWidth={1} />
            <span>
              FREE
              <br />
              SHIPPING
            </span>
          </div>
        </Link>
        <Link className={s.mall} to="/collection/mall">
          <div>
            <span className={s.eyebrow}>SHOPIZ MALL</span>
            <h2>
              Brands you love.
              <br />
              Prices you’ll love more.
            </h2>
            <span className={s.smallCta}>
              Shop authentic <ArrowRight size={13} />
            </span>
          </div>
          <ShoppingBag size={76} strokeWidth={1} />
        </Link>
      </div>
    </div>
  );
}
export function QuickAccess() {
  return (
    <nav aria-label="Shopping shortcuts" className={s.quick}>
      {quickItems.map(([label, Icon, to]) =>
        to.startsWith("/#") ? (
          <a key={label} href={to}>
            <span>
              <Icon size={23} strokeWidth={1.5} />
            </span>
            {label}
          </a>
        ) : (
          <Link key={label} to={to}>
            <span>
              <Icon size={23} strokeWidth={1.5} />
            </span>
            {label}
          </Link>
        ),
      )}
    </nav>
  );
}
export function getCategoryIcon(name, index) {
  const n = (name || "").toLowerCase();
  if (n.includes("nam") && n.includes("thời trang")) return Shirt;
  if (n.includes("nữ") && n.includes("thời trang")) return Sparkles;
  if (n.includes("trẻ em") || n.includes("mẹ & bé") || n.includes("sơ sinh")) return Baby;
  if (n.includes("điện thoại")) return Smartphone;
  if (n.includes("laptop") || n.includes("máy tính")) return Laptop;
  if (n.includes("âm thanh") || n.includes("tai nghe")) return Headphones;
  if (n.includes("gia dụng") || n.includes("nhà cửa")) return House;
  if (n.includes("điện tử")) return Tv;
  if (n.includes("sức khỏe")) return Heart;
  if (n.includes("sắc đẹp")) return Flower2;
  if (n.includes("giày")) return Footprints;
  if (n.includes("túi") || n.includes("ví")) return Briefcase;
  if (n.includes("phụ kiện") || n.includes("trang sức")) return Gem;
  if (n.includes("đồng hồ")) return Watch;
  if (n.includes("thực phẩm") || n.includes("bách hóa")) return Apple;
  if (n.includes("thể thao") || n.includes("dã ngoại")) return Dumbbell;
  if (n.includes("du lịch") || n.includes("hành lý")) return Plane;
  if (n.includes("thú cưng")) return Cat;
  if (n.includes("máy ảnh") || n.includes("flycam")) return Camera;
  if (n.includes("gaming") || n.includes("console")) return Gamepad2;
  if (n.includes("ô tô") || n.includes("xe máy") || n.includes("mô tô")) return Car;
  if (n.includes("sách") || n.includes("văn phòng phẩm")) return BookOpen;
  if (n.includes("sở thích")) return Blocks;
  return icons[index % icons.length] || Grid2X2;
}

export function CategoryItem({ name, index }) {
  const Icon = getCategoryIcon(name, index);
  return (
    <Link className={s.category} to={`/category/${encodeURIComponent(name)}`}>
      <span>
        <Icon size={28} strokeWidth={1.2} />
      </span>
      <p>{name}</p>
    </Link>
  );
}

export function CategoryGrid() {
  const { categories: liveCategories } = useCatalog();
  const displayCategories =
    liveCategories && liveCategories.length ? liveCategories : [];

  const [page, setPage] = useState(0);
  const [cols, setCols] = useState(10);

  useEffect(() => {
    function handleResize() {
      if (typeof window !== "undefined") {
        setCols(window.innerWidth <= 768 ? 5 : 10);
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Strict maximum 2 rows per panel
  const pageSize = cols * 2;
  const totalPages = Math.max(1, Math.ceil(displayCategories.length / pageSize));
  const activePage = Math.min(page, totalPages - 1);

  return (
    <section className={s.categorySection} id="categories">
      <div className={s.sectionTitle}>
        <h2>DANH MỤC</h2>
        <span>Khám phá tất cả ngành hàng</span>
      </div>

      <div className={s.carouselWrapper}>
        {activePage > 0 && (
          <button
            type="button"
            className={`${s.navBtn} ${s.prevBtn}`}
            onClick={() => setPage(activePage - 1)}
            aria-label="Trang ngành hàng trước"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        <div
          className={s.sliderTrack}
          style={{ transform: `translateX(-${activePage * 100}%)` }}
        >
          {Array.from({ length: totalPages }).map((_, pIdx) => {
            const pageItems = displayCategories.slice(
              pIdx * pageSize,
              (pIdx + 1) * pageSize,
            );
            return (
              <div
                key={pIdx}
                className={s.panel}
                style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
              >
                {pageItems.map((name, itemIdx) => (
                  <CategoryItem
                    key={name}
                    name={name}
                    index={pIdx * pageSize + itemIdx}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {activePage < totalPages - 1 && (
          <button
            type="button"
            className={`${s.navBtn} ${s.nextBtn}`}
            onClick={() => setPage(activePage + 1)}
            aria-label="Trang ngành hàng kế tiếp"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </section>
  );
}
