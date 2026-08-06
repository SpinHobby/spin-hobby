import React, { useState, useEffect, CSSProperties } from "react";
import classNames from "classnames";

const delay = 2000;

interface ISetSpanStyles {
  [key: string]: CSSProperties;
}

interface Props {
  children: JSX.Element;
  classes?: string;
  onClick?: () => void;
}

export function Ripple({ children, classes, onClick }: Props) {
  const [count, setCount] = useState<number>(0);
  const [spanStyles, setSpanStyles] = useState<ISetSpanStyles>({});
  const rippleClasses = classNames("ripple", classes);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (count) {
      timer = setTimeout(() => {
        cleanUp();
      }, delay);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [count]);

  function showRipple(e: React.MouseEvent<HTMLDivElement>) {
    const rippleContainer = e.currentTarget;
    const size = rippleContainer.offsetWidth;
    const pos = rippleContainer.getBoundingClientRect();
    const x = e.pageX - (pos.x + window.pageXOffset) - size / 2;
    const y = e.pageY - (pos.y + window.pageYOffset) - size / 2;
    const spanStyle = {
      top: y + "px",
      left: x + "px",
      height: size + "px",
      width: size + "px",
    };
    const count_ = count + 1;
    setSpanStyles({ ...spanStyles, [count_]: spanStyle });
    setCount(count_);
  }

  function renderRippleSpan() {
    const spanArray = Object.keys(spanStyles);
    if (!spanArray.length) return null;
    return spanArray.map((key, index) => (
      <span key={index} className="" style={spanStyles[key]} />
    ));
  }

  function cleanUp() {
    setCount(0);
    setSpanStyles({});
  }

  return (
    <div className={rippleClasses} onClick={onClick} onMouseDown={showRipple}>
      {children}
      <div className="ripple-container">{renderRippleSpan()}</div>
    </div>
  );
}
