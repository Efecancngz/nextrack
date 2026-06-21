"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ITEM_CATEGORY_LABELS, type ItemCard, type ItemCategory } from "@/types/item";

interface HeroSliderProps {
  byCategory: Record<ItemCategory, ItemCard[]>;
}

const CATEGORY_ORDER: ItemCategory[] = ["TYPE_A", "TYPE_B", "TYPE_C"];
const CATEGORY_SLUG: Record<ItemCategory, string> = {
  TYPE_A: "type-a",
  TYPE_B: "type-b",
  TYPE_C: "type-c",
};

export default function HeroSlider({ byCategory }: HeroSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slides = CATEGORY_ORDER.map((category) => ({
    id: CATEGORY_SLUG[category],
    title: ITEM_CATEGORY_LABELS[category],
    tagline: `Trending ${ITEM_CATEGORY_LABELS[category]}`,
    items: (byCategory[category] ?? []).slice(0, 3),
  })).filter((s) => s.items.length >= 3);

  // Auto-play effect
  useEffect(() => {
    if (isPaused || slides.length <= 1) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      return;
    }

    autoPlayRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 4500);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isPaused, slides.length]);

  if (slides.length === 0) return null;

  return (
    <div
      className="hero-slider"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Elegant tab controls */}
      <div className="hero-slider-tabs" role="tablist">
        {slides.map((slide, idx) => (
          <button
            key={slide.id}
            role="tab"
            aria-selected={activeIndex === idx}
            className={`hero-slider-tab ${activeIndex === idx ? "active" : ""}`}
            onClick={() => setActiveIndex(idx)}
          >
            <span className={`hero-slider-dot ${slide.id}`} />
            {slide.title}
          </button>
        ))}
      </div>

      {/* Slide Content Stack */}
      <div className="hero-slider-content">
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`hero-slider-slide ${activeIndex === idx ? "active" : ""}`}
            aria-hidden={activeIndex !== idx}
          >
            <div className="hero-poster-grid">
              {slide.items.map((item, i) => (
                <Link
                  key={item.id}
                  href={`/items/${item.id}`}
                  className={`hero-poster-item hero-poster-${i}`}
                >
                  {item.coverImage ? (
                    <>
                      <Image
                        src={item.coverImage}
                        alt={item.title}
                        fill
                        sizes="(max-width: 900px) 100vw, 320px"
                        className="hero-poster-img"
                        priority={idx === 0}
                      />
                      {/* Premium overlay with details */}
                      <div className="hero-poster-info">
                        <span className="hero-poster-number">#{i + 1}</span>
                        <div className="hero-poster-meta">
                          <h3 className="hero-poster-title">{item.title}</h3>
                          {item.ratingExternal && (
                            <div className="hero-poster-row">
                              <span className="hero-poster-rating">
                                ★ {item.ratingExternal.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="poster-card-placeholder">
                      <span>{item.title}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
