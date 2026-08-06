import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import classNames from "classnames";

const AUTOCHANGE_TIME = 8000;

export interface ISlide {
  headline: string;
  subheading?: string;
  img: string;
}

interface Props {
  slides: ISlide[];
}

export default function Header({ slides }: Props) {
  if (!slides || slides.length === 0) return null;

  return (
    <>
      <HeroSection slides={slides} />
      <MobileHero slides={slides} />
    </>
  );
}

function MobileHero({ slides }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, AUTOCHANGE_TIME);

    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="hero-mobile">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={classNames("hero-mobile-slide", {
            active: index === currentSlide,
          })}
        >
          <div className="hero-mobile-image">
            <img src={slide.img} alt={slide.headline} />
            <div className="hero-mobile-overlay" />
          </div>
          <div className="hero-mobile-content">
            <h2>{slide.headline}</h2>
            {slide.subheading && <p>{slide.subheading}</p>}
          </div>
        </div>
      ))}

      {slides.length > 1 && (
        <div className="hero-mobile-indicators">
          {slides.map((_, index) => (
            <button
              key={index}
              className={classNames("indicator", {
                active: index === currentSlide,
              })}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HeroSection({ slides }: Props) {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, AUTOCHANGE_TIME);

    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="hero-section">
      <div className="hero-container">
        <div className="hero-content">
          <div className="hero-text fade-in">
            <h1 className="hero-welcome">Welcome to Spin Hobby!</h1>
            <h2 className="hero-headline">{slides[currentSlide].headline}</h2>
            {slides[currentSlide].subheading && (
              <p className="hero-subheading">
                {slides[currentSlide].subheading}
              </p>
            )}
            <div className="hero-actions">
              <button
                className="hero-btn-primary"
                onClick={() => navigate("/product")}
              >
                Shop Now
              </button>
              <button className="hero-btn-secondary">Learn More</button>
            </div>
          </div>
        </div>

        <div className="hero-image">
          <img
            src={slides[currentSlide].img}
            alt={slides[currentSlide].headline}
            className="fade-in"
          />
          <div className="hero-image-overlay" />

          {slides.length > 1 && (
            <>
              <button
                className="hero-nav-btn hero-nav-prev"
                onClick={prevSlide}
                aria-label="Previous slide"
              >
                ‹
              </button>
              <button
                className="hero-nav-btn hero-nav-next"
                onClick={nextSlide}
                aria-label="Next slide"
              >
                ›
              </button>
            </>
          )}
        </div>

        {slides.length > 1 && (
          <div className="hero-indicators">
            {slides.map((_, index) => (
              <button
                key={index}
                className={classNames("hero-indicator", {
                  active: index === currentSlide,
                })}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
